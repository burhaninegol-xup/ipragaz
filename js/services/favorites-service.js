/**
 * Favorites Service
 * Favoriler CRUD islemleri
 */

const FavoritesService = {
    /**
     * Musterinin tum favorilerini urun bilgileriyle getir
     */
    async getByCustomerId(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('favorites')
                .select(`
                    id,
                    product_id,
                    created_at,
                    product:products(id, code, name, base_price, image_url, points_per_unit)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'FavoritesService.getByCustomerId');
        }
    },

    /**
     * Musterinin favori urun ID'lerini getir (hizli kontrol icin)
     */
    async getFavoriteIds(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('favorites')
                .select('product_id')
                .eq('customer_id', customerId);

            if (error) throw error;

            // Sadece product_id'leri dizi olarak don
            const ids = data ? data.map(f => f.product_id) : [];
            return { data: ids, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'FavoritesService.getFavoriteIds');
        }
    },

    /**
     * Favoriye ekle
     */
    async addFavorite(customerId, productId) {
        try {
            const { data, error } = await supabaseClient
                .from('favorites')
                .insert([{ customer_id: customerId, product_id: productId }])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'FavoritesService.addFavorite');
        }
    },

    /**
     * Favoriden cikar
     */
    async removeFavorite(customerId, productId) {
        try {
            const { error } = await supabaseClient
                .from('favorites')
                .delete()
                .eq('customer_id', customerId)
                .eq('product_id', productId);

            if (error) throw error;
            return { data: { success: true }, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'FavoritesService.removeFavorite');
        }
    },

    /**
     * Favori toggle (ekle veya cikar)
     */
    async toggleFavorite(customerId, productId) {
        try {
            // Once favori mi kontrol et
            const { data: existing, error: checkError } = await supabaseClient
                .from('favorites')
                .select('id')
                .eq('customer_id', customerId)
                .eq('product_id', productId)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existing) {
                // Favoriden cikar
                const { error: deleteError } = await supabaseClient
                    .from('favorites')
                    .delete()
                    .eq('id', existing.id);

                if (deleteError) throw deleteError;
                return { data: { action: 'removed', isFavorite: false }, error: null };
            } else {
                // Favoriye ekle
                const { data: newFav, error: insertError } = await supabaseClient
                    .from('favorites')
                    .insert([{ customer_id: customerId, product_id: productId }])
                    .select()
                    .single();

                if (insertError) throw insertError;
                return { data: { action: 'added', isFavorite: true, favorite: newFav }, error: null };
            }
        } catch (error) {
            return handleSupabaseError(error, 'FavoritesService.toggleFavorite');
        }
    },

    /**
     * Urun favoride mi kontrol et
     */
    async isFavorite(customerId, productId) {
        try {
            const { data, error } = await supabaseClient
                .from('favorites')
                .select('id')
                .eq('customer_id', customerId)
                .eq('product_id', productId)
                .maybeSingle();

            if (error) throw error;
            return { data: data !== null, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'FavoritesService.isFavorite');
        }
    },

    /**
     * Musterinin favori sayisini getir
     */
    async getCount(customerId) {
        try {
            const { count, error } = await supabaseClient
                .from('favorites')
                .select('id', { count: 'exact', head: true })
                .eq('customer_id', customerId);

            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'FavoritesService.getCount');
        }
    }
};

// Global erisim
window.FavoritesService = FavoritesService;
