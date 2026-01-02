/**
 * Cart Service
 * Sepet yönetimi (Hybrid: sessionStorage cache + Supabase persistence)
 * SessionStorage anlık UI için, Supabase kalıcı depolama için
 */

const CartService = {
    CART_KEY: 'isyerim_cart',

    /**
     * Fiyattan puan hesapla (1 TL = 1 Puan)
     */
    calculatePointsFromPrice(price) {
        return Math.floor(parseFloat(price) || 0);
    },

    /**
     * Sepeti sessionStorage'dan getir
     */
    getCart() {
        try {
            const cartData = sessionStorage.getItem(this.CART_KEY);
            return cartData ? JSON.parse(cartData) : { items: [] };
        } catch (e) {
            console.error('Sepet okuma hatası:', e);
            return { items: [] };
        }
    },

    /**
     * Sepeti sessionStorage'a kaydet
     */
    saveCart(cart) {
        try {
            sessionStorage.setItem(this.CART_KEY, JSON.stringify(cart));
            window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
        } catch (e) {
            console.error('Sepet kaydetme hatası:', e);
        }
    },

    /**
     * Sepeti veritabanından yükle (login sonrası çağrılır)
     */
    async loadFromDatabase(customerId) {
        if (!customerId) {
            console.warn('Customer ID bulunamadı, sepet yüklenemedi');
            return this.getCart();
        }

        try {
            const { data, error } = await supabaseClient
                .from('cart_items')
                .select(`
                    *,
                    product:products(id, code, name, base_price, points_per_unit, image_url)
                `)
                .eq('customer_id', customerId);

            if (error) {
                console.error('Sepet yükleme hatası:', error);
                return this.getCart();
            }

            if (data && data.length > 0) {
                const cart = {
                    items: data.map(item => ({
                        id: item.product.id,
                        code: item.product.code,
                        name: item.product.name,
                        price: item.unit_price,
                        points: this.calculatePointsFromPrice(item.unit_price || item.product.base_price),
                        image_url: item.product.image_url || '',
                        quantity: item.quantity
                    }))
                };
                this.saveCart(cart);
                console.log('Sepet veritabanından yüklendi:', cart.items.length, 'ürün');
            } else {
                // Veritabanında sepet yok, boş sepet
                this.saveCart({ items: [] });
            }

            return this.getCart();
        } catch (e) {
            console.error('Sepet yükleme hatası:', e);
            return this.getCart();
        }
    },

    /**
     * Veritabanına kaydet (background)
     */
    async syncToDatabase(productId, quantity, unitPrice) {
        const customerId = sessionStorage.getItem('isyerim_customer_id');

        if (!customerId) {
            return;
        }

        try {
            if (quantity <= 0) {
                // Sil
                const { error } = await supabaseClient
                    .from('cart_items')
                    .delete()
                    .eq('customer_id', customerId)
                    .eq('product_id', productId);

                if (error) {
                    console.error('Sepet silme hatası:', error);
                }
            } else {
                // Ekle veya güncelle
                const { data, error } = await supabaseClient
                    .from('cart_items')
                    .upsert({
                        customer_id: customerId,
                        product_id: productId,
                        quantity: quantity,
                        unit_price: unitPrice
                    }, { onConflict: 'customer_id,product_id' })
                    .select();

                if (error) {
                    console.error('Sepet kaydetme hatası:', error);
                }
            }
        } catch (e) {
            console.error('Sepet senkronizasyon hatası:', e);
        }
    },

    /**
     * Ürünü sepete ekle
     */
    async addItem(product, quantity = 1) {
        const cart = this.getCart();
        const existingItem = cart.items.find(item => item.id === product.id);
        const price = product.price || product.base_price;

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({
                id: product.id,
                code: product.code,
                name: product.name,
                price: price,
                points: this.calculatePointsFromPrice(price),
                image_url: product.image_url || '',
                quantity: quantity
            });
        }

        this.saveCart(cart);

        // Veritabanına kaydet
        const newQuantity = existingItem ? existingItem.quantity : quantity;
        await this.syncToDatabase(product.id, newQuantity, price);

        return cart;
    },

    /**
     * Ürün miktarını güncelle
     */
    async updateQuantity(productId, quantity) {
        const cart = this.getCart();
        const item = cart.items.find(item => item.id === productId);

        if (item) {
            if (quantity <= 0) {
                cart.items = cart.items.filter(i => i.id !== productId);
                this.syncToDatabase(productId, 0, 0);
            } else {
                item.quantity = quantity;
                this.syncToDatabase(productId, quantity, item.price);
            }
            this.saveCart(cart);
        }

        return cart;
    },

    /**
     * Ürün miktarını artır
     */
    async incrementQuantity(productId) {
        const cart = this.getCart();
        const item = cart.items.find(item => item.id === productId);
        if (item) {
            item.quantity += 1;
            this.saveCart(cart);
            await this.syncToDatabase(productId, item.quantity, item.price);
        }
        return cart;
    },

    /**
     * Ürün miktarını azalt
     */
    async decrementQuantity(productId) {
        const cart = this.getCart();
        const item = cart.items.find(item => item.id === productId);
        if (item) {
            if (item.quantity > 1) {
                item.quantity -= 1;
                await this.syncToDatabase(productId, item.quantity, item.price);
            } else {
                cart.items = cart.items.filter(i => i.id !== productId);
                await this.syncToDatabase(productId, 0, 0);
            }
            this.saveCart(cart);
        }
        return cart;
    },

    /**
     * Ürünü sepetten kaldır
     */
    async removeItem(productId) {
        const cart = this.getCart();
        cart.items = cart.items.filter(item => item.id !== productId);
        this.saveCart(cart);
        await this.syncToDatabase(productId, 0, 0);
        return cart;
    },

    /**
     * Sepeti temizle
     */
    async clearCart() {
        const customerId = sessionStorage.getItem('isyerim_customer_id');

        sessionStorage.removeItem(this.CART_KEY);
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: [] } }));

        // Veritabanından da temizle
        if (customerId) {
            try {
                await supabaseClient
                    .from('cart_items')
                    .delete()
                    .eq('customer_id', customerId);
            } catch (e) {
                console.error('Sepet temizleme hatası:', e);
            }
        }

        return { items: [] };
    },

    /**
     * Toplam tutarı hesapla
     */
    getTotal() {
        const cart = this.getCart();
        return cart.items.reduce((total, item) => {
            return total + (parseFloat(item.price) * item.quantity);
        }, 0);
    },

    /**
     * Toplam puan hesapla
     */
    getTotalPoints() {
        const cart = this.getCart();
        return cart.items.reduce((total, item) => {
            return total + (item.points * item.quantity);
        }, 0);
    },

    /**
     * Toplam ürün sayısı (tüm miktarlar dahil)
     */
    getItemCount() {
        const cart = this.getCart();
        return cart.items.reduce((count, item) => count + item.quantity, 0);
    },

    /**
     * Benzersiz ürün sayısı
     */
    getUniqueItemCount() {
        const cart = this.getCart();
        return cart.items.length;
    },

    /**
     * Sepet boş mu?
     */
    isEmpty() {
        const cart = this.getCart();
        return cart.items.length === 0;
    },

    /**
     * Ürün sepette mi?
     */
    hasItem(productId) {
        const cart = this.getCart();
        return cart.items.some(item => item.id === productId);
    },

    /**
     * Sepetteki ürün miktarını getir
     */
    getItemQuantity(productId) {
        const cart = this.getCart();
        const item = cart.items.find(item => item.id === productId);
        return item ? item.quantity : 0;
    },

    /**
     * Sepeti siparişe dönüştür (checkout)
     */
    async checkout(customerId, dealerId, deliveryInfo) {
        const cart = this.getCart();

        if (cart.items.length === 0) {
            return { data: null, error: 'Sepet boş' };
        }

        const orderData = {
            customer_id: customerId,
            dealer_id: dealerId,
            total_amount: this.getTotal(),
            total_points: this.getTotalPoints(),
            delivery_address: deliveryInfo.address || null,
            delivery_date: deliveryInfo.date || null,
            delivery_time: deliveryInfo.time || null,
            payment_method: deliveryInfo.paymentMethod || 'cash',
            notes: deliveryInfo.notes || null,
            status: 'waiting_for_assignment'
        };

        const orderItems = cart.items.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: parseFloat(item.price),
            total_price: parseFloat(item.price) * item.quantity,
            points: this.calculatePointsFromPrice(parseFloat(item.price)) * item.quantity
        }));

        const result = await OrdersService.create(orderData, orderItems);

        if (!result.error && result.data) {
            // Timeline'a ilk kaydı ekle
            await OrdersService.logOrderCreated(result.data.id, customerId);
            await this.clearCart();
        }

        return result;
    },

    /**
     * Sepet özetini getir
     */
    getSummary() {
        return {
            items: this.getCart().items,
            itemCount: this.getItemCount(),
            uniqueItemCount: this.getUniqueItemCount(),
            total: this.getTotal(),
            totalPoints: this.getTotalPoints(),
            isEmpty: this.isEmpty()
        };
    }
};

// Global erişim
window.CartService = CartService;

// Global erişim için event listener (debug için kapalı)
// window.addEventListener('cartUpdated', (e) => { console.log('Sepet güncellendi:', e.detail); });
