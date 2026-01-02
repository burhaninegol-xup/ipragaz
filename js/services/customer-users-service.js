/**
 * Customer Users Service
 * Alt kullanici (sub-user) yonetimi
 */

const CustomerUsersService = {
    /**
     * Telefon numarasi ile kullanici ara (login icin)
     * @param {string} phone - Telefon numarasi
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async getByPhone(phone) {
        const { data, error } = await supabaseClient
            .from('customer_users')
            .select(`
                *,
                customer:customers(id, name, company_name, phone, email, dealer_id, is_active)
            `)
            .eq('phone', phone)
            .eq('is_active', true)
            .single();

        return { data, error };
    },

    /**
     * ID ile kullanici getir
     * @param {string} id - Kullanici ID
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async getById(id) {
        const { data, error } = await supabaseClient
            .from('customer_users')
            .select(`
                *,
                customer:customers(id, name, company_name, phone, email, dealer_id, is_active)
            `)
            .eq('id', id)
            .single();

        return { data, error };
    },

    /**
     * Musterinin tum kullanicilarini getir
     * @param {string} customerId - Musteri ID
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getByCustomerId(customerId) {
        const { data, error } = await supabaseClient
            .from('customer_users')
            .select('*')
            .eq('customer_id', customerId)
            .order('role', { ascending: true }) // owner once
            .order('created_at', { ascending: true });

        // Her kullanici icin yetki sayisini hesapla
        if (data && data.length > 0) {
            for (let user of data) {
                const { count } = await supabaseClient
                    .from('customer_user_branches')
                    .select('*', { count: 'exact', head: true })
                    .eq('customer_user_id', user.id);
                user.branch_count = count || 0;
            }
        }

        return { data, error };
    },

    /**
     * Yeni kullanici olustur
     * @param {Object} userData - Kullanici verileri
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async create(userData) {
        // Telefon numarasinin baska bir kullaniciya ait olup olmadigini kontrol et
        const { data: existing } = await supabaseClient
            .from('customer_users')
            .select('id')
            .eq('phone', userData.phone)
            .single();

        if (existing) {
            return { data: null, error: { message: 'Bu telefon numarasi zaten kullaniliyor' } };
        }

        const { data, error } = await supabaseClient
            .from('customer_users')
            .insert([{
                customer_id: userData.customer_id,
                name: userData.name,
                phone: userData.phone,
                role: userData.role || 'staff',
                is_active: userData.is_active !== false
            }])
            .select()
            .single();

        return { data, error };
    },

    /**
     * Kullanici guncelle
     * @param {string} id - Kullanici ID
     * @param {Object} userData - Guncellenecek veriler
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async update(id, userData) {
        // Telefon degistiriliyorsa, baska kullanicida olup olmadigini kontrol et
        if (userData.phone) {
            const { data: existing } = await supabaseClient
                .from('customer_users')
                .select('id')
                .eq('phone', userData.phone)
                .neq('id', id)
                .single();

            if (existing) {
                return { data: null, error: { message: 'Bu telefon numarasi zaten kullaniliyor' } };
            }
        }

        const updateData = {};
        if (userData.name !== undefined) updateData.name = userData.name;
        if (userData.phone !== undefined) updateData.phone = userData.phone;
        if (userData.is_active !== undefined) updateData.is_active = userData.is_active;
        // role degistirilemez (owner/staff)

        const { data, error } = await supabaseClient
            .from('customer_users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        return { data, error };
    },

    /**
     * Kullanici sil (owner silinemez)
     * @param {string} id - Kullanici ID
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async delete(id) {
        // Once kullanicinin owner olup olmadigini kontrol et
        const { data: user } = await supabaseClient
            .from('customer_users')
            .select('role')
            .eq('id', id)
            .single();

        if (user && user.role === 'owner') {
            return { data: null, error: { message: 'Ana kullanici (owner) silinemez' } };
        }

        // Once sube yetkilerini sil
        await supabaseClient
            .from('customer_user_branches')
            .delete()
            .eq('customer_user_id', id);

        // Sonra kullaniciyi sil
        const { data, error } = await supabaseClient
            .from('customer_users')
            .delete()
            .eq('id', id)
            .select()
            .single();

        return { data, error };
    },

    /**
     * Kullanicinin yetkili subelerini getir (branch bilgileriyle)
     * @param {string} userId - Kullanici ID
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getBranches(userId) {
        const { data, error } = await supabaseClient
            .from('customer_user_branches')
            .select(`
                id,
                branch_id,
                branch:customer_branches(*)
            `)
            .eq('customer_user_id', userId);

        // Branch objelerini duz liste haline getir
        if (data) {
            return {
                data: data.map(item => ({
                    ...item.branch,
                    permission_id: item.id
                })),
                error: null
            };
        }

        return { data: [], error };
    },

    /**
     * Kullanicinin yetkili sube ID'lerini getir
     * @param {string} userId - Kullanici ID
     * @returns {Promise<{data: Array<string>, error: Object|null}>}
     */
    async getBranchIds(userId) {
        const { data, error } = await supabaseClient
            .from('customer_user_branches')
            .select('branch_id')
            .eq('customer_user_id', userId);

        if (data) {
            return { data: data.map(item => item.branch_id), error: null };
        }

        return { data: [], error };
    },

    /**
     * Kullaniciya sube yetkisi ver
     * @param {string} userId - Kullanici ID
     * @param {string} branchId - Sube ID
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async addBranchPermission(userId, branchId) {
        const { data, error } = await supabaseClient
            .from('customer_user_branches')
            .insert([{
                customer_user_id: userId,
                branch_id: branchId
            }])
            .select()
            .single();

        return { data, error };
    },

    /**
     * Kullanicidan sube yetkisi kaldir
     * @param {string} userId - Kullanici ID
     * @param {string} branchId - Sube ID
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async removeBranchPermission(userId, branchId) {
        const { data, error } = await supabaseClient
            .from('customer_user_branches')
            .delete()
            .eq('customer_user_id', userId)
            .eq('branch_id', branchId)
            .select()
            .single();

        return { data, error };
    },

    /**
     * Kullanicinin sube yetkilerini toplu guncelle
     * @param {string} userId - Kullanici ID
     * @param {Array<string>} branchIds - Yetkili sube ID listesi
     * @returns {Promise<{data: boolean, error: Object|null}>}
     */
    async updateBranchPermissions(userId, branchIds) {
        // Once mevcut tum yetkileri sil
        await supabaseClient
            .from('customer_user_branches')
            .delete()
            .eq('customer_user_id', userId);

        // Sonra yeni yetkileri ekle
        if (branchIds && branchIds.length > 0) {
            const inserts = branchIds.map(branchId => ({
                customer_user_id: userId,
                branch_id: branchId
            }));

            const { error } = await supabaseClient
                .from('customer_user_branches')
                .insert(inserts);

            if (error) {
                return { data: false, error };
            }
        }

        return { data: true, error: null };
    },

    /**
     * Kullanicinin belirli bir subeye yetkisi var mi kontrol et
     * @param {string} userId - Kullanici ID
     * @param {string} branchId - Sube ID
     * @returns {Promise<boolean>}
     */
    async hasPermission(userId, branchId) {
        const { data } = await supabaseClient
            .from('customer_user_branches')
            .select('id')
            .eq('customer_user_id', userId)
            .eq('branch_id', branchId)
            .single();

        return !!data;
    },

    /**
     * Musteri icin owner kullanici olustur (kayit sirasinda)
     * @param {string} customerId - Musteri ID
     * @param {string} name - Kullanici adi
     * @param {string} phone - Telefon numarasi
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async createOwner(customerId, name, phone) {
        const { data, error } = await supabaseClient
            .from('customer_users')
            .insert([{
                customer_id: customerId,
                name: name,
                phone: phone,
                role: 'owner',
                is_active: true
            }])
            .select()
            .single();

        return { data, error };
    }
};

// Global erisim
window.CustomerUsersService = CustomerUsersService;
