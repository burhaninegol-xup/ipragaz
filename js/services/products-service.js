/**
 * Products Service
 * Ürün CRUD işlemleri
 */

const ProductsService = {
    /**
     * Tüm aktif ürünleri getir
     */
    async getAll() {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.getAll');
        }
    },

    /**
     * ID ile ürün getir
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.getById');
        }
    },

    /**
     * Kod ile ürün getir
     */
    async getByCode(code) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('code', code)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.getByCode');
        }
    },

    /**
     * Kategoriye göre ürünleri getir
     */
    async getByCategory(category) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .eq('category', category)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.getByCategory');
        }
    },

    /**
     * Ürün oluştur
     */
    async create(productData) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .insert([productData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.create');
        }
    },

    /**
     * Ürün güncelle
     */
    async update(id, productData) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .update(productData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.update');
        }
    },

    /**
     * Ürün sil (soft delete)
     */
    async deactivate(id) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .update({ is_active: false })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.deactivate');
        }
    }
};

// Global erişim
window.ProductsService = ProductsService;
