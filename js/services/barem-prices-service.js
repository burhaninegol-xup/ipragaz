/**
 * Barem Prices Service
 * Bayi bazinda urun baremli fiyat islemleri
 */

const BaremPricesService = {
    /**
     * Bayi ve urune gore baremleri getir
     */
    async getByDealerAndProduct(dealerId, productId) {
        try {
            const { data, error } = await supabaseClient
                .from('dealer_barem_prices')
                .select('*')
                .eq('dealer_id', dealerId)
                .eq('product_id', productId)
                .order('min_quantity', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BaremPricesService.getByDealerAndProduct');
        }
    },

    /**
     * Bayinin tum urunlerinin baremlerini getir
     */
    async getByDealer(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('dealer_barem_prices')
                .select(`
                    *,
                    product:products(id, code, name)
                `)
                .eq('dealer_id', dealerId)
                .order('product_id')
                .order('min_quantity', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BaremPricesService.getByDealer');
        }
    },

    /**
     * Barem kaydet/guncelle
     * Oncelikle mevcut baremleri siler, sonra yenilerini ekler
     */
    async save(dealerId, productId, barems) {
        try {
            // Oncelikle bu urun icin mevcut baremleri sil
            const { error: deleteError } = await supabaseClient
                .from('dealer_barem_prices')
                .delete()
                .eq('dealer_id', dealerId)
                .eq('product_id', productId);

            if (deleteError) throw deleteError;

            // Yeni baremleri ekle
            if (barems && barems.length > 0) {
                const baremRecords = barems.map(barem => ({
                    dealer_id: dealerId,
                    product_id: productId,
                    min_quantity: barem.min,
                    max_quantity: barem.max,
                    unit_price: barem.price
                }));

                const { data, error: insertError } = await supabaseClient
                    .from('dealer_barem_prices')
                    .insert(baremRecords)
                    .select();

                if (insertError) throw insertError;
                return { data, error: null };
            }

            return { data: [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BaremPricesService.save');
        }
    },

    /**
     * Bayi ve urun icin tum baremleri sil
     */
    async delete(dealerId, productId) {
        try {
            const { error } = await supabaseClient
                .from('dealer_barem_prices')
                .delete()
                .eq('dealer_id', dealerId)
                .eq('product_id', productId);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BaremPricesService.delete');
        }
    },

    /**
     * Tek bir barem kaydini sil
     */
    async deleteById(id) {
        try {
            const { error } = await supabaseClient
                .from('dealer_barem_prices')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BaremPricesService.deleteById');
        }
    }
};

// Global erisim
window.BaremPricesService = BaremPricesService;
