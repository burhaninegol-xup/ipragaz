/**
 * Customer Prices Service
 * Müşteri özel fiyat CRUD işlemleri
 */

const CustomerPricesService = {
    /**
     * Müşteri fiyatlarını getir
     */
    async getByCustomerId(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_prices')
                .select(`
                    *,
                    product:products(id, code, name, base_price, image_url, weight_kg)
                `)
                .eq('customer_id', customerId)
                .eq('is_active', true);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.getByCustomerId');
        }
    },

    /**
     * Bayi bazında tüm müşteri fiyatlarını getir
     */
    async getByDealerId(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_prices')
                .select(`
                    *,
                    customer:customers(id, name, vkn),
                    product:products(id, code, name, base_price)
                `)
                .eq('dealer_id', dealerId)
                .eq('is_active', true);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.getByDealerId');
        }
    },

    /**
     * Tek fiyat kaydı oluştur veya güncelle (upsert)
     */
    async upsert(priceData) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_prices')
                .upsert(priceData, {
                    onConflict: 'customer_id,product_id,dealer_id'
                })
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.upsert');
        }
    },

    /**
     * Toplu fiyat kaydı (birden fazla ürün için)
     */
    async bulkUpsert(pricesArray) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_prices')
                .upsert(pricesArray, {
                    onConflict: 'customer_id,product_id,dealer_id'
                })
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.bulkUpsert');
        }
    },

    /**
     * Fiyat güncelle
     */
    async update(id, priceData) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_prices')
                .update(priceData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.update');
        }
    },

    /**
     * Fiyat sil (soft delete)
     */
    async deactivate(id) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_prices')
                .update({ is_active: false })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.deactivate');
        }
    },

    /**
     * Müşterinin tüm fiyatlarını pasife al (tekliften çekilme)
     */
    async deactivateAllForCustomer(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_prices')
                .update({ is_active: false })
                .eq('customer_id', customerId)
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.deactivateAllForCustomer');
        }
    },

    /**
     * Müşterinin tüm fiyatlarını aktif et
     */
    async activateAllForCustomer(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_prices')
                .update({ is_active: true })
                .eq('customer_id', customerId)
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.activateAllForCustomer');
        }
    },

    /**
     * Aylık tüketim miktarını güncelle
     */
    async updateMonthlyQuantity(id, thisMonthQty) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_prices')
                .update({ this_month_quantity: thisMonthQty })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.updateMonthlyQuantity');
        }
    },

    /**
     * Ay sonu: this_month -> last_month aktarımı
     */
    async rolloverMonthlyQuantities(dealerId) {
        try {
            // Önce mevcut verileri al
            const { data: prices, error: fetchError } = await supabaseClient
                .from('customer_prices')
                .select('id, this_month_quantity')
                .eq('dealer_id', dealerId);

            if (fetchError) throw fetchError;

            // Her kayıt için güncelleme yap
            const updates = prices.map(price => ({
                id: price.id,
                last_month_quantity: price.this_month_quantity,
                this_month_quantity: 0
            }));

            const { data, error } = await supabaseClient
                .from('customer_prices')
                .upsert(updates)
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomerPricesService.rolloverMonthlyQuantities');
        }
    }
};

// Global erişim
window.CustomerPricesService = CustomerPricesService;
