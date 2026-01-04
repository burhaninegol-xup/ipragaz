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
                    dealer:dealers(id, name, phone, city, district),
                    branch:customer_branches(id, branch_name),
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
     * Musteri siparislerini sube bazli getir (staff kullanicilar icin)
     */
    async getByCustomerAndBranches(customerId, branchIds, limit = 50) {
        try {
            if (!branchIds || branchIds.length === 0) {
                return { data: [], error: null };
            }

            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    dealer:dealers(id, name, phone, city, district),
                    branch:customer_branches(id, branch_name),
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
                .in('customer_branch_id', branchIds)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getByCustomerAndBranches');
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
     * Sipariş durumunu güncelle (timeline kaydı ile)
     */
    async updateStatus(orderId, newStatus, changedByType = 'system', changedById = null, notes = null) {
        try {
            // Önce mevcut durumu al
            const { data: currentOrder, error: fetchError } = await supabaseClient
                .from('orders')
                .select('status')
                .eq('id', orderId)
                .single();

            if (fetchError) throw fetchError;

            const oldStatus = currentOrder.status;

            // Durumu güncelle
            const { data, error } = await supabaseClient
                .from('orders')
                .update({ status: newStatus })
                .eq('id', orderId)
                .select()
                .single();

            if (error) throw error;

            // Timeline kaydı oluştur
            await this.logStatusChange(orderId, oldStatus, newStatus, changedByType, changedById, notes);

            // Siparis tamamlandiysa puan ver
            if (newStatus === 'completed' && oldStatus !== 'completed') {
                await this.awardPointsForCompletedOrder(orderId);
            }

            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.updateStatus');
        }
    },

    /**
     * Tamamlanan siparis icin puan ver
     * @param {string} orderId - Siparis ID
     */
    async awardPointsForCompletedOrder(orderId) {
        try {
            // PointsService varsa kullan
            if (typeof PointsService !== 'undefined' && PointsService.awardPointsForOrder) {
                await PointsService.awardPointsForOrder(orderId);
            }
        } catch (error) {
            // Puan hatasi siparis islemini engellemesin
            console.error('Puan verme hatasi:', error);
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
    async cancel(orderId, cancelledByType = 'customer', cancelledById = null) {
        return this.updateStatus(orderId, 'cancelled', cancelledByType, cancelledById, 'Sipariş iptal edildi');
    },

    /**
     * Sipariş dagitima cikar (on_the_way)
     */
    async startDelivery(orderId, dealerId = null) {
        return this.updateStatus(orderId, 'on_the_way', 'dealer', dealerId, 'Dağıtıma çıkarıldı');
    },

    /**
     * Sipariş teslim edildi (completed)
     */
    async markDelivered(orderId, dealerId = null) {
        return this.updateStatus(orderId, 'completed', 'dealer', dealerId, 'Teslim edildi');
    },

    /**
     * Atama bekleyen siparis sayisi (waiting_for_assignment)
     */
    async getWaitingCount(dealerId) {
        try {
            const { count, error } = await supabaseClient
                .from('orders')
                .select('id', { count: 'exact' })
                .eq('dealer_id', dealerId)
                .eq('status', 'waiting_for_assignment');

            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getWaitingCount');
        }
    },

    /**
     * Dagitimdaki siparis sayisi (on_the_way)
     */
    async getOnTheWayCount(dealerId) {
        try {
            const { count, error } = await supabaseClient
                .from('orders')
                .select('id', { count: 'exact' })
                .eq('dealer_id', dealerId)
                .eq('status', 'on_the_way');

            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getOnTheWayCount');
        }
    },

    /**
     * Teslim edilen siparis sayisi (completed)
     */
    async getCompletedCount(dealerId) {
        try {
            const { count, error } = await supabaseClient
                .from('orders')
                .select('id', { count: 'exact' })
                .eq('dealer_id', dealerId)
                .eq('status', 'completed');

            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getCompletedCount');
        }
    },

    /**
     * Iptal edilen siparis sayisi (cancelled)
     */
    async getCancelledCount(dealerId) {
        try {
            const { count, error } = await supabaseClient
                .from('orders')
                .select('id', { count: 'exact' })
                .eq('dealer_id', dealerId)
                .eq('status', 'cancelled');

            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getCancelledCount');
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
    },

    /**
     * Sipariş durum geçmişini getir (timeline)
     */
    async getStatusHistory(orderId) {
        try {
            const { data, error } = await supabaseClient
                .from('order_status_history')
                .select('*')
                .eq('order_id', orderId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OrdersService.getStatusHistory');
        }
    },

    /**
     * Durum değişikliğini kaydet (timeline log)
     */
    async logStatusChange(orderId, oldStatus, newStatus, changedByType = 'system', changedById = null, notes = null) {
        try {
            const { data, error } = await supabaseClient
                .from('order_status_history')
                .insert([{
                    order_id: orderId,
                    old_status: oldStatus,
                    new_status: newStatus,
                    changed_by_type: changedByType,
                    changed_by_id: changedById,
                    notes: notes
                }])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            // Timeline hatası sipariş işlemini engellemesin
            console.error('Timeline kayıt hatası:', error);
            return { data: null, error };
        }
    },

    /**
     * Sipariş oluşturulduğunda ilk timeline kaydını oluştur
     */
    async logOrderCreated(orderId, customerId) {
        return this.logStatusChange(orderId, null, 'waiting_for_assignment', 'customer', customerId, 'Sipariş oluşturuldu');
    }
};

// Global erişim
window.OrdersService = OrdersService;
