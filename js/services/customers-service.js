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
                .maybeSingle();

            if (error) throw error;
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
                .maybeSingle();

            if (error) throw error;
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
    },

    /**
     * Sayfalı müşteri listesi (şube ve teklif bilgileriyle birlikte)
     */
    async getPaginatedByDealerId(dealerId, options = {}) {
        try {
            const page = options.page || 0;
            const pageSize = options.pageSize || 20;
            const from = page * pageSize;
            const to = from + pageSize - 1;

            let query = supabaseClient
                .from('customers')
                .select(`
                    *,
                    customer_branches(id, branch_name, city, district, is_default),
                    offers(id, status)
                `, { count: 'exact' })
                .eq('dealer_id', dealerId);

            // Aktif/Pasif filtresi
            if (options.isActive === true) {
                query = query.eq('is_active', true);
            } else if (options.isActive === false) {
                query = query.eq('is_active', false);
            }

            query = query.order('name').range(from, to);

            const { data, error, count } = await query;
            if (error) throw error;

            return {
                data,
                totalCount: count,
                totalPages: Math.ceil(count / pageSize),
                error: null
            };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.getPaginatedByDealerId');
        }
    },

    /**
     * Bayi müşteri sayılarını duruma göre getir
     */
    async getCustomerCountsByStatus(dealerId) {
        try {
            // Tüm müşterileri say
            const { count: allCount, error: allError } = await supabaseClient
                .from('customers')
                .select('id', { count: 'exact', head: true })
                .eq('dealer_id', dealerId);
            if (allError) throw allError;

            // Aktif müşterileri say
            const { count: activeCount, error: activeError } = await supabaseClient
                .from('customers')
                .select('id', { count: 'exact', head: true })
                .eq('dealer_id', dealerId)
                .eq('is_active', true);
            if (activeError) throw activeError;

            // Pasif müşterileri say
            const { count: passiveCount, error: passiveError } = await supabaseClient
                .from('customers')
                .select('id', { count: 'exact', head: true })
                .eq('dealer_id', dealerId)
                .eq('is_active', false);
            if (passiveError) throw passiveError;

            return {
                data: {
                    all: allCount || 0,
                    active: activeCount || 0,
                    passive: passiveCount || 0
                },
                error: null
            };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.getCustomerCountsByStatus');
        }
    },

    /**
     * Güvenlik sorularının cevaplarını kaydet
     */
    async updateSecurityAnswers(customerId, answers) {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .update({
                    security_q1: answers.q1,
                    security_q2: answers.q2,
                    security_q3: answers.q3,
                    security_q4: answers.q4,
                    security_accepted_at: new Date().toISOString()
                })
                .eq('id', customerId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'CustomersService.updateSecurityAnswers');
        }
    }
};

// Global erişim
window.CustomersService = CustomersService;
