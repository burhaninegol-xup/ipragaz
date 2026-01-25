/**
 * Product Categories Service
 * Urun kategorileri CRUD islemleri
 */

const ProductCategoriesService = {
    /**
     * Tum kategorileri getir (aktif ve pasif)
     */
    async getAll() {
        try {
            const { data, error } = await supabaseClient
                .from('product_categories')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.getAll');
        }
    },

    /**
     * Sadece aktif kategorileri getir
     */
    async getAllActive() {
        try {
            const { data, error } = await supabaseClient
                .from('product_categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.getAllActive');
        }
    },

    /**
     * ID ile kategori getir
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('product_categories')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.getById');
        }
    },

    /**
     * Slug ile kategori getir
     */
    async getBySlug(slug) {
        try {
            const { data, error } = await supabaseClient
                .from('product_categories')
                .select('*')
                .eq('slug', slug)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.getBySlug');
        }
    },

    /**
     * Yeni kategori olustur
     */
    async create(categoryData) {
        try {
            // Slug olustur (yoksa)
            if (!categoryData.slug && categoryData.name) {
                categoryData.slug = this.generateSlug(categoryData.name);
            }

            const { data, error } = await supabaseClient
                .from('product_categories')
                .insert([categoryData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.create');
        }
    },

    /**
     * Kategori guncelle
     */
    async update(id, categoryData) {
        try {
            // Slug guncelle (ad degistiyse ve slug verilmediyse)
            if (categoryData.name && !categoryData.slug) {
                categoryData.slug = this.generateSlug(categoryData.name);
            }

            categoryData.updated_at = new Date().toISOString();

            const { data, error } = await supabaseClient
                .from('product_categories')
                .update(categoryData)
                .eq('id', id)
                .select();

            if (error) throw error;

            // RLS UPDATE'i engellerse data bos doner
            if (!data || data.length === 0) {
                return { data: null, error: 'Kategori guncellenemedi. Yetki veya kayit bulunamadi.' };
            }

            return { data: data[0], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.update');
        }
    },

    /**
     * Kategoriyi pasife al (soft delete)
     */
    async deactivate(id) {
        try {
            const { data, error } = await supabaseClient
                .from('product_categories')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                return { data: null, error: 'Kategori pasife alinamadi. Yetki veya kayit bulunamadi.' };
            }

            return { data: data[0], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.deactivate');
        }
    },

    /**
     * Kategoriyi aktif yap
     */
    async activate(id) {
        try {
            const { data, error } = await supabaseClient
                .from('product_categories')
                .update({ is_active: true, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                return { data: null, error: 'Kategori aktif yapilamadi. Yetki veya kayit bulunamadi.' };
            }

            return { data: data[0], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.activate');
        }
    },

    /**
     * Siralama guncelle
     */
    async updateSortOrder(id, sortOrder) {
        try {
            const { data, error } = await supabaseClient
                .from('product_categories')
                .update({ sort_order: sortOrder, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                return { data: null, error: 'Siralama guncellenemedi. Yetki veya kayit bulunamadi.' };
            }

            return { data: data[0], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.updateSortOrder');
        }
    },

    /**
     * Kategorideki urun sayisini getir
     */
    async getProductCount(categoryId) {
        try {
            const { count, error } = await supabaseClient
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('category', categoryId);

            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.getProductCount');
        }
    },

    /**
     * Tum kategoriler icin urun sayilarini getir
     */
    async getAllWithProductCounts() {
        try {
            // Kategorileri getir
            const { data: categories, error: catError } = await supabaseClient
                .from('product_categories')
                .select('*')
                .order('sort_order', { ascending: true });

            if (catError) throw catError;

            // Her kategori icin urun sayisini hesapla
            const categoriesWithCounts = await Promise.all(
                categories.map(async (category) => {
                    const { count } = await supabaseClient
                        .from('products')
                        .select('*', { count: 'exact', head: true })
                        .eq('category', category.id);

                    return {
                        ...category,
                        product_count: count || 0
                    };
                })
            );

            return { data: categoriesWithCounts, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProductCategoriesService.getAllWithProductCounts');
        }
    },

    /**
     * Slug olustur (URL-friendly)
     */
    generateSlug(name) {
        const turkishMap = {
            'ş': 's', 'Ş': 's',
            'ı': 'i', 'İ': 'i',
            'ğ': 'g', 'Ğ': 'g',
            'ü': 'u', 'Ü': 'u',
            'ö': 'o', 'Ö': 'o',
            'ç': 'c', 'Ç': 'c'
        };

        return name
            .toLowerCase()
            .replace(/[şŞıİğĞüÜöÖçÇ]/g, char => turkishMap[char] || char)
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
};

// Global erisim
window.ProductCategoriesService = ProductCategoriesService;
