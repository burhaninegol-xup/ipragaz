/**
 * Rutin (Tekrarlayan) Siparişler Service
 * Haftalık tekrarlayan siparişlerin yönetimi
 */
const RecurringOrdersService = {
    /**
     * Yeni rutin sipariş oluştur
     * @param {Object} data - Rutin sipariş bilgileri
     * @param {Array} items - Sipariş kalemleri [{product_id, quantity}]
     * @returns {Promise<{data: Object, error: Object}>}
     */
    async create(data, items) {
        try {
            // Rutin siparişi oluştur
            const { data: recurring, error: recurringError } = await supabaseClient
                .from('recurring_orders')
                .insert([{
                    customer_id: data.customer_id,
                    dealer_id: data.dealer_id,
                    customer_branch_id: data.customer_branch_id,
                    day_of_week: data.day_of_week,
                    delivery_time: data.delivery_time,
                    payment_method: data.payment_method || 'cash',
                    notes: data.notes || null,
                    status: 'active',
                    next_order_date: data.next_order_date
                }])
                .select()
                .single();

            if (recurringError) {
                console.error('Rutin sipariş oluşturma hatası:', recurringError);
                return { data: null, error: recurringError };
            }

            // Sipariş kalemlerini ekle
            if (items && items.length > 0) {
                const itemsWithId = items.map(item => ({
                    recurring_order_id: recurring.id,
                    product_id: item.product_id,
                    quantity: item.quantity
                }));

                const { error: itemsError } = await supabaseClient
                    .from('recurring_order_items')
                    .insert(itemsWithId);

                if (itemsError) {
                    console.error('Rutin sipariş kalemleri ekleme hatası:', itemsError);
                    // Sipariş oluşturuldu ama kalemler eklenemedi, siparişi sil
                    await supabaseClient.from('recurring_orders').delete().eq('id', recurring.id);
                    return { data: null, error: itemsError };
                }
            }

            return { data: recurring, error: null };
        } catch (err) {
            console.error('RecurringOrdersService.create hatası:', err);
            return { data: null, error: err };
        }
    },

    /**
     * Müşterinin tüm rutin siparişlerini getir
     * @param {string} customerId - Müşteri ID
     * @returns {Promise<{data: Array, error: Object}>}
     */
    async getByCustomerId(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('recurring_orders')
                .select(`
                    *,
                    dealer:dealers(id, name),
                    customer_branch:customer_branches(id, branch_name, full_address),
                    items:recurring_order_items(
                        id,
                        quantity,
                        product:products(id, name, code)
                    )
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Rutin siparişleri getirme hatası:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (err) {
            console.error('RecurringOrdersService.getByCustomerId hatası:', err);
            return { data: null, error: err };
        }
    },

    /**
     * Bayinin tüm rutin siparişlerini getir
     * @param {string} dealerId - Bayi ID
     * @returns {Promise<{data: Array, error: Object}>}
     */
    async getByDealerId(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('recurring_orders')
                .select(`
                    *,
                    customer:customers(id, name, phone),
                    customer_branch:customer_branches(id, branch_name, full_address),
                    items:recurring_order_items(
                        id,
                        quantity,
                        product:products(id, name, code)
                    )
                `)
                .eq('dealer_id', dealerId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Bayi rutin siparişleri getirme hatası:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (err) {
            console.error('RecurringOrdersService.getByDealerId hatası:', err);
            return { data: null, error: err };
        }
    },

    /**
     * Tek bir rutin siparişi getir
     * @param {string} id - Rutin sipariş ID
     * @returns {Promise<{data: Object, error: Object}>}
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('recurring_orders')
                .select(`
                    *,
                    dealer:dealers(id, name),
                    customer_branch:customer_branches(id, branch_name, full_address),
                    items:recurring_order_items(
                        id,
                        quantity,
                        product:products(id, name, code)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) {
                console.error('Rutin sipariş getirme hatası:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (err) {
            console.error('RecurringOrdersService.getById hatası:', err);
            return { data: null, error: err };
        }
    },

    /**
     * Rutin sipariş durumunu güncelle
     * @param {string} id - Rutin sipariş ID
     * @param {string} status - Yeni durum: 'active', 'paused', 'cancelled'
     * @returns {Promise<{data: Object, error: Object}>}
     */
    async updateStatus(id, status) {
        try {
            const { data, error } = await supabaseClient
                .from('recurring_orders')
                .update({
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Rutin sipariş durum güncelleme hatası:', error);
                return { data: null, error };
            }

            return { data, error: null };
        } catch (err) {
            console.error('RecurringOrdersService.updateStatus hatası:', err);
            return { data: null, error: err };
        }
    },

    /**
     * Rutin siparişi güncelle
     * @param {string} id - Rutin sipariş ID
     * @param {Object} data - Güncellenecek alanlar
     * @returns {Promise<{data: Object, error: Object}>}
     */
    async update(id, data) {
        try {
            const { data: updated, error } = await supabaseClient
                .from('recurring_orders')
                .update({
                    ...data,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Rutin sipariş güncelleme hatası:', error);
                return { data: null, error };
            }

            return { data: updated, error: null };
        } catch (err) {
            console.error('RecurringOrdersService.update hatası:', err);
            return { data: null, error: err };
        }
    },

    /**
     * Rutin siparişi sil
     * @param {string} id - Rutin sipariş ID
     * @returns {Promise<{error: Object}>}
     */
    async delete(id) {
        try {
            const { error } = await supabaseClient
                .from('recurring_orders')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Rutin sipariş silme hatası:', error);
                return { error };
            }

            return { error: null };
        } catch (err) {
            console.error('RecurringOrdersService.delete hatası:', err);
            return { error: err };
        }
    },

    /**
     * Rutin sipariş kalemlerini güncelle
     * @param {string} recurringOrderId - Rutin sipariş ID
     * @param {Array} items - Yeni kalemler [{product_id, quantity}]
     * @returns {Promise<{error: Object}>}
     */
    async updateItems(recurringOrderId, items) {
        try {
            // Mevcut kalemleri sil
            const { error: deleteError } = await supabaseClient
                .from('recurring_order_items')
                .delete()
                .eq('recurring_order_id', recurringOrderId);

            if (deleteError) {
                console.error('Rutin sipariş kalemleri silme hatası:', deleteError);
                return { error: deleteError };
            }

            // Yeni kalemleri ekle
            if (items && items.length > 0) {
                const itemsWithId = items.map(item => ({
                    recurring_order_id: recurringOrderId,
                    product_id: item.product_id,
                    quantity: item.quantity
                }));

                const { error: insertError } = await supabaseClient
                    .from('recurring_order_items')
                    .insert(itemsWithId);

                if (insertError) {
                    console.error('Rutin sipariş kalemleri ekleme hatası:', insertError);
                    return { error: insertError };
                }
            }

            return { error: null };
        } catch (err) {
            console.error('RecurringOrdersService.updateItems hatası:', err);
            return { error: err };
        }
    },

    /**
     * Gün numarasından gün adını döndür
     * @param {number} dayOfWeek - 0=Pazar, 1=Pazartesi, ...
     * @returns {string}
     */
    getDayName(dayOfWeek) {
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return days[dayOfWeek] || '';
    },

    /**
     * Bir sonraki sipariş tarihini hesapla
     * @param {number} dayOfWeek - Hedef gün (0=Pazar, 1=Pazartesi, ...)
     * @param {Date} fromDate - Başlangıç tarihi (opsiyonel)
     * @returns {string} - YYYY-MM-DD formatında tarih
     */
    calculateNextOrderDate(dayOfWeek, fromDate = null) {
        const today = fromDate ? new Date(fromDate) : new Date();
        const currentDay = today.getDay();

        let daysUntilNext = dayOfWeek - currentDay;

        // Eğer hedef gün bugün veya geçmişse, bir sonraki haftaya al
        if (daysUntilNext <= 0) {
            daysUntilNext += 7;
        }

        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + daysUntilNext);

        return nextDate.toISOString().split('T')[0];
    },

    /**
     * Durum badge'i için bilgi döndür
     * @param {string} status - Durum
     * @returns {Object} - {text, class}
     */
    getStatusInfo(status) {
        const statusMap = {
            'active': { text: 'Aktif', class: 'status-active' },
            'paused': { text: 'Duraklatıldı', class: 'status-paused' },
            'cancelled': { text: 'İptal Edildi', class: 'status-cancelled' }
        };
        return statusMap[status] || { text: status, class: '' };
    }
};
