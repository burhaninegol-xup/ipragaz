/**
 * Customers Service
 * Müşteri CRUD işlemleri
 */

const CustomersService = {
    /**
     * Tüm müşterileri getir (opsiyonel bayi filtresi)
     */
    async getAll(dealerId = null) {
        try {
            let query = supabaseClient
                .from('customers')
                .select(`
                    *,
                    dealer:dealers(id, name, code)
                `)
                .order('name');

            if (dealerId) {
                query = query.eq('dealer_id', dealerId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.getAll');
        }
    },

    /**
     * ID ile müşteri getir
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .select(`
                    *,
                    dealer:dealers(id, name, code)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.getById');
        }
    },

    /**
     * VKN ile müşteri getir
     */
    async getByVkn(vkn) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .select(`
                    *,
                    dealer:dealers(id, name, code)
                `)
                .eq('vkn', vkn)
                .single();

            // PGRST116 = kayıt bulunamadı, bu hata değil
            if (error && error.code !== 'PGRST116') throw error;
            return { data: data || null, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.getByVkn');
        }
    },

    /**
     * Telefon numarası ile müşteri getir
     */
    async getByPhone(phone) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .select(`
                    *,
                    dealer:dealers(id, name, code)
                `)
                .eq('phone', phone)
                .single();

            // PGRST116 = kayıt bulunamadı, bu hata değil
            if (error && error.code !== 'PGRST116') throw error;
            return { data: data || null, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.getByPhone');
        }
    },

    /**
     * Yeni müşteri oluştur
     */
    async create(customerData) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .insert([customerData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.create');
        }
    },

    /**
     * Müşteri güncelle
     */
    async update(id, customerData) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .update(customerData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.update');
        }
    },

    /**
     * Müşteri sil (soft delete - pasife al)
     */
    async deactivate(id) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .update({ is_active: false })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.deactivate');
        }
    },

    /**
     * Müşteriyi aktif et
     */
    async activate(id) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .update({ is_active: true })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.activate');
        }
    },

    /**
     * Filtreli müşteri listesi
     */
    async getFiltered(filters) {
        try {
            let query = supabaseClient
                .from('customers')
                .select(`
                    *,
                    dealer:dealers(id, name)
                `);

            // Bayi filtresi
            if (filters.dealerId) {
                query = query.eq('dealer_id', filters.dealerId);
            }

            // Aktif/Pasif filtresi
            if (filters.isActive !== undefined && filters.isActive !== null) {
                query = query.eq('is_active', filters.isActive);
            }

            // Arama filtresi (isim veya VKN)
            if (filters.search) {
                query = query.or(`name.ilike.%${filters.search}%,vkn.ilike.%${filters.search}%`);
            }

            const { data, error } = await query.order('name');
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.getFiltered');
        }
    },

    /**
     * Müşteri sayısını getir (istatistik için)
     */
    async getCount(dealerId = null) {
        try {
            let query = supabaseClient
                .from('customers')
                .select('id', { count: 'exact' });

            if (dealerId) {
                query = query.eq('dealer_id', dealerId);
            }

            const { count, error } = await query;
            if (error) throw error;
            return { data: count, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.getCount');
        }
    }
};

// Global erişim
window.CustomersService = CustomersService;
