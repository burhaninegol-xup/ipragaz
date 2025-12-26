/**
 * Cart Service
 * Sepet yönetimi (Hybrid: sessionStorage + Supabase checkout)
 * Sepet sessionStorage'da tutulur, sipariş tamamlanınca Supabase'e yazılır
 */

const CartService = {
    CART_KEY: 'isyerim_cart',

    /**
     * Sepeti getir
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
     * Sepeti kaydet
     */
    saveCart(cart) {
        try {
            sessionStorage.setItem(this.CART_KEY, JSON.stringify(cart));
            // Sepet değişikliği event'i
            window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
        } catch (e) {
            console.error('Sepet kaydetme hatası:', e);
        }
    },

    /**
     * Ürünü sepete ekle
     */
    addItem(product, quantity = 1) {
        const cart = this.getCart();
        const existingItem = cart.items.find(item => item.id === product.id);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({
                id: product.id,
                code: product.code,
                name: product.name,
                price: product.price || product.base_price,
                points: product.points_per_unit || product.points || 0,
                image_url: product.image_url || '',
                quantity: quantity
            });
        }

        this.saveCart(cart);
        return cart;
    },

    /**
     * Ürün miktarını güncelle
     */
    updateQuantity(productId, quantity) {
        const cart = this.getCart();
        const item = cart.items.find(item => item.id === productId);

        if (item) {
            if (quantity <= 0) {
                // Miktar 0 veya negatifse ürünü kaldır
                cart.items = cart.items.filter(i => i.id !== productId);
            } else {
                item.quantity = quantity;
            }
            this.saveCart(cart);
        }

        return cart;
    },

    /**
     * Ürün miktarını artır
     */
    incrementQuantity(productId) {
        const cart = this.getCart();
        const item = cart.items.find(item => item.id === productId);
        if (item) {
            item.quantity += 1;
            this.saveCart(cart);
        }
        return cart;
    },

    /**
     * Ürün miktarını azalt
     */
    decrementQuantity(productId) {
        const cart = this.getCart();
        const item = cart.items.find(item => item.id === productId);
        if (item) {
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                cart.items = cart.items.filter(i => i.id !== productId);
            }
            this.saveCart(cart);
        }
        return cart;
    },

    /**
     * Ürünü sepetten kaldır
     */
    removeItem(productId) {
        const cart = this.getCart();
        cart.items = cart.items.filter(item => item.id !== productId);
        this.saveCart(cart);
        return cart;
    },

    /**
     * Sepeti temizle
     */
    clearCart() {
        sessionStorage.removeItem(this.CART_KEY);
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: [] } }));
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
     * @param {string} customerId - Müşteri ID
     * @param {string} dealerId - Bayi ID
     * @param {object} deliveryInfo - Teslimat bilgileri
     */
    async checkout(customerId, dealerId, deliveryInfo) {
        const cart = this.getCart();

        if (cart.items.length === 0) {
            return { data: null, error: 'Sepet boş' };
        }

        // Sipariş verisi
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
            status: 'pending'
        };

        // Sipariş kalemleri
        const orderItems = cart.items.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: parseFloat(item.price),
            total_price: parseFloat(item.price) * item.quantity,
            points: item.points * item.quantity
        }));

        // Siparişi oluştur
        const result = await OrdersService.create(orderData, orderItems);

        if (!result.error) {
            // Başarılıysa sepeti temizle
            this.clearCart();
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

// Sepet değişikliklerini dinle (opsiyonel)
window.addEventListener('cartUpdated', (e) => {
    // Badge güncelleme vb. için kullanılabilir
    console.log('Sepet güncellendi:', e.detail);
});
