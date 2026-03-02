/**
 * Dealer Products Service
 * Bayilerin sattigi urunleri yonetir
 */

const DealerProductsService = {
    /**
     * Bayinin urun kayitlarini getir
     * @param {string} dealerId - Bayi UUID
     * @returns {Promise<{data: Array, error: Object}>}
     */
    async getByDealerId(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('dealer_products')
                .select('id, dealer_id, product_id, is_active, created_at')
                .eq('dealer_id', dealerId);

            if (error) {
                return handleSupabaseError(error, 'DealerProductsService.getByDealerId');
            }

            return { data: data || [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerProductsService.getByDealerId');
        }
    },

    /**
     * Urun durumunu degistir (upsert)
     * @param {string} dealerId - Bayi UUID
     * @param {string} productId - Urun UUID
     * @param {boolean} isActive - Aktif mi
     * @returns {Promise<{data: Object, error: Object}>}
     */
    async toggleProduct(dealerId, productId, isActive) {
        try {
            const { data, error } = await supabaseClient
                .from('dealer_products')
                .upsert({
                    dealer_id: dealerId,
                    product_id: productId,
                    is_active: isActive,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'dealer_id,product_id'
                })
                .select()
                .single();

            if (error) {
                return handleSupabaseError(error, 'DealerProductsService.toggleProduct');
            }

            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerProductsService.toggleProduct');
        }
    },

    /**
     * Bayinin pasif yaptigi urun ID'lerini getir
     * @param {string} dealerId - Bayi UUID
     * @returns {Promise<{data: Array<string>, error: Object}>}
     */
    async getInactiveProductIds(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('dealer_products')
                .select('product_id')
                .eq('dealer_id', dealerId)
                .eq('is_active', false);

            if (error) {
                return handleSupabaseError(error, 'DealerProductsService.getInactiveProductIds');
            }

            var ids = (data || []).map(function(item) {
                return item.product_id;
            });

            return { data: ids, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerProductsService.getInactiveProductIds');
        }
    }
};

window.DealerProductsService = DealerProductsService;
