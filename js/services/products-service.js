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
                .eq('category_id', category)
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
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.deactivate');
        }
    },

    /**
     * Urunu aktif yap
     */
    async activate(id) {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .update({ is_active: true, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.activate');
        }
    },

    /**
     * Tum urunleri getir (aktif ve pasif dahil)
     */
    async getAllWithInactive() {
        try {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*, product_categories(id, name, slug)')
                .order('name');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.getAllWithInactive');
        }
    },

    /**
     * Filtrelenmis urunleri getir
     */
    async getFiltered(filters = {}) {
        try {
            let query = supabaseClient
                .from('products')
                .select('*, product_categories(id, name, slug)');

            // Arama filtresi (kod veya isim)
            if (filters.search) {
                query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%`);
            }

            // Aktif/Pasif filtresi
            if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== 'all') {
                query = query.eq('is_active', filters.isActive === true || filters.isActive === 'true');
            }

            // Kategori filtresi
            if (filters.categoryId) {
                query = query.eq('category_id', filters.categoryId);
            }

            query = query.order('name');

            const { data, error } = await query;

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.getFiltered');
        }
    },

    /**
     * Sayfalanmis urunleri getir
     */
    async getPaginated(options = {}) {
        try {
            const page = options.page || 0;
            const pageSize = options.pageSize || 20;
            const from = page * pageSize;
            const to = from + pageSize - 1;

            let query = supabaseClient
                .from('products')
                .select('*, product_categories(id, name, slug)', { count: 'exact' });

            // Arama filtresi
            if (options.search) {
                query = query.or(`code.ilike.%${options.search}%,name.ilike.%${options.search}%`);
            }

            // Aktif/Pasif filtresi
            if (options.isActive !== undefined && options.isActive !== null && options.isActive !== 'all') {
                query = query.eq('is_active', options.isActive === true || options.isActive === 'true');
            }

            // Kategori filtresi
            if (options.categoryId) {
                query = query.eq('category_id', options.categoryId);
            }

            query = query
                .order('name')
                .range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;
            return {
                data,
                count,
                page,
                pageSize,
                totalPages: Math.ceil(count / pageSize),
                error: null
            };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.getPaginated');
        }
    },

    /**
     * Durum bazli urun sayilarini getir
     */
    async getProductCountsByStatus() {
        try {
            // Toplam
            const { count: total } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true });

            // Aktif
            const { count: active } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            // Pasif
            const { count: inactive } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', false);

            return {
                data: { total, active, inactive },
                error: null
            };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.getProductCountsByStatus');
        }
    },

    /**
     * Kategori bazli urun sayisini getir
     */
    async getProductCountByCategory(categoryId) {
        try {
            const { count, error } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', categoryId);

            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductsService.getProductCountByCategory');
        }
    }
};

// Global erişim
window.ProductsService = ProductsService;
