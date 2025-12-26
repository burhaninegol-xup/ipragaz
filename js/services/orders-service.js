/**
 * Orders Service
 * Sipariş CRUD işlemleri
 */

const OrdersService = {
    /**
     * Sipariş oluştur (order + order_items)
     */
    async create(orderData, orderItems) {
        try {
            // Önce siparişi oluştur
            const { data: order, error: orderError } = await supabaseClient
                .from('orders')
                .insert([orderData])
                .select()
                .single();

            if (orderError) throw orderError;

            // Sipariş kalemlerini ekle
            const itemsWithOrderId = orderItems.map(item => ({
                ...item,
                order_id: order.id
            }));

            const { data: items, error: itemsError } = await supabaseClient
                .from('order_items')
                .insert(itemsWithOrderId)
                .select();

            if (itemsError) throw itemsError;

            return { data: { ...order, items }, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.create');
        }
    },

    /**
     * ID ile sipariş getir
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    customer:customers(id, name, vkn, phone),
                    dealer:dealers(id, name, code),
                    order_items(
                        id,
                        quantity,
                        unit_price,
                        total_price,
                        points,
                        product:products(id, code, name, image_url)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getById');
        }
    },

    /**
     * Sipariş numarası ile getir
     */
    async getByOrderNumber(orderNumber) {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    customer:customers(id, name, vkn, phone),
                    dealer:dealers(id, name, code),
                    order_items(
                        id,
                        quantity,
                        unit_price,
                        total_price,
                        points,
                        product:products(id, code, name, image_url)
                    )
                `)
                .eq('order_number', orderNumber)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getByOrderNumber');
        }
    },

    /**
     * Müşteri siparişlerini getir
     */
    async getByCustomerId(customerId, limit = 50) {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    dealer:dealers(id, name),
                    order_items(
                        id,
                        quantity,
                        unit_price,
                        total_price,
                        points,
                        product:products(id, code, name, image_url)
                    )
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getByCustomerId');
        }
    },

    /**
     * Bayi siparişlerini getir (filtreli)
     */
    async getByDealerId(dealerId, filters = {}) {
        try {
            let query = supabaseClient
                .from('orders')
                .select(`
                    *,
                    customer:customers(id, name, vkn, phone),
                    order_items(
                        id,
                        quantity,
                        unit_price,
                        total_price,
                        product:products(id, code, name)
                    )
                `)
                .eq('dealer_id', dealerId);

            // Durum filtresi
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            // Tarih aralığı
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo);
            }

            // Sıralama
            query = query.order('created_at', { ascending: false });

            // Limit
            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getByDealerId');
        }
    },

    /**
     * Sipariş durumunu güncelle
     */
    async updateStatus(orderId, status) {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .update({ status })
                .eq('id', orderId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.updateStatus');
        }
    },

    /**
     * Sipariş güncelle
     */
    async update(orderId, orderData) {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .update(orderData)
                .eq('id', orderId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.update');
        }
    },

    /**
     * Sipariş iptal et
     */
    async cancel(orderId) {
        return this.updateStatus(orderId, 'cancelled');
    },

    /**
     * Sipariş onayla
     */
    async confirm(orderId) {
        return this.updateStatus(orderId, 'confirmed');
    },

    /**
     * Sipariş teslim edildi
     */
    async markDelivered(orderId) {
        return this.updateStatus(orderId, 'delivered');
    },

    /**
     * Bekleyen sipariş sayısı (bayi dashboard için)
     */
    async getPendingCount(dealerId) {
        try {
            const { count, error } = await supabaseClient
                .from('orders')
                .select('id', { count: 'exact' })
                .eq('dealer_id', dealerId)
                .eq('status', 'pending');

            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getPendingCount');
        }
    },

    /**
     * Dağıtımdaki sipariş sayısı
     */
    async getConfirmedCount(dealerId) {
        try {
            const { count, error } = await supabaseClient
                .from('orders')
                .select('id', { count: 'exact' })
                .eq('dealer_id', dealerId)
                .eq('status', 'confirmed');

            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getConfirmedCount');
        }
    },

    /**
     * Toplam sipariş sayısı
     */
    async getTotalCount(dealerId, dateFrom = null) {
        try {
            let query = supabaseClient
                .from('orders')
                .select('id', { count: 'exact' })
                .eq('dealer_id', dealerId);

            if (dateFrom) {
                query = query.gte('created_at', dateFrom);
            }

            const { count, error } = await query;
            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getTotalCount');
        }
    },

    /**
     * Satış istatistikleri (ürün bazında)
     */
    async getSalesStats(dealerId, dateFrom, dateTo) {
        try {
            const { data, error } = await supabaseClient
                .from('order_items')
                .select(`
                    quantity,
                    total_price,
                    product:products(id, code, name),
                    order:orders!inner(dealer_id, created_at, status)
                `)
                .eq('order.dealer_id', dealerId)
                .gte('order.created_at', dateFrom)
                .lte('order.created_at', dateTo)
                .neq('order.status', 'cancelled');

            if (error) throw error;

            // Ürün bazında gruplama
            const stats = {};
            data.forEach(item => {
                const productCode = item.product.code;
                if (!stats[productCode]) {
                    stats[productCode] = {
                        product: item.product,
                        totalQuantity: 0,
                        totalRevenue: 0
                    };
                }
                stats[productCode].totalQuantity += item.quantity;
                stats[productCode].totalRevenue += parseFloat(item.total_price);
            });

            return { data: stats, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getSalesStats');
        }
    }
};

// Global erişim
window.OrdersService = OrdersService;
