/**
 * Backoffice Admins Service
 * Backoffice yönetici kullanıcı işlemleri
 */

const BackofficeAdminsService = {
    /**
     * Admin girişi
     * @param {string} username - Kullanıcı adı
     * @param {string} password - Şifre
     * @returns {Promise<{data: Object|null, error: string|null}>}
     */
    async login(username, password) {
        try {
            const { data, error } = await supabaseClient
                .from('backoffice_admins')
                .select('*')
                .eq('username', username)
                .eq('password_hash', password)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return { data: null, error: 'Kullanıcı adı veya şifre hatalı' };
                }
                throw error;
            }

            // Son giriş zamanını güncelle
            await supabaseClient
                .from('backoffice_admins')
                .update({ last_login: new Date().toISOString() })
                .eq('id', data.id);

            // Hassas bilgileri kaldır
            delete data.password_hash;

            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BackofficeAdminsService.login');
        }
    },

    /**
     * ID ile admin getir
     * @param {string} id - Admin ID
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('backoffice_admins')
                .select('id, username, name, email, phone, role, is_active, last_login, created_at')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BackofficeAdminsService.getById');
        }
    },

    /**
     * Admin bilgilerini güncelle (şifre hariç)
     * @param {string} id - Admin ID
     * @param {Object} updateData - Güncellenecek veriler (name, email, phone)
     */
    async update(id, updateData) {
        try {
            // Sadece izin verilen alanları güncelle
            const allowedFields = ['name', 'email', 'phone'];
            const filteredData = {};

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });

            filteredData.updated_at = new Date().toISOString();

            const { data, error } = await supabaseClient
                .from('backoffice_admins')
                .update(filteredData)
                .eq('id', id)
                .select('id, username, name, email, phone, role, is_active, last_login, created_at')
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BackofficeAdminsService.update');
        }
    },

    /**
     * Şifre değiştir
     * @param {string} id - Admin ID
     * @param {string} currentPassword - Mevcut şifre
     * @param {string} newPassword - Yeni şifre
     */
    async updatePassword(id, currentPassword, newPassword) {
        try {
            // Önce mevcut şifreyi doğrula
            const { data: admin, error: checkError } = await supabaseClient
                .from('backoffice_admins')
                .select('id')
                .eq('id', id)
                .eq('password_hash', currentPassword)
                .single();

            if (checkError || !admin) {
                return { data: null, error: 'Mevcut şifre hatalı' };
            }

            // Yeni şifreyi kaydet
            const { data, error } = await supabaseClient
                .from('backoffice_admins')
                .update({
                    password_hash: newPassword,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select('id')
                .single();

            if (error) throw error;
            return { data: { success: true }, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BackofficeAdminsService.updatePassword');
        }
    },

    /**
     * Tüm adminleri getir (super_admin için)
     */
    async getAll() {
        try {
            const { data, error } = await supabaseClient
                .from('backoffice_admins')
                .select('id, username, name, email, phone, role, is_active, last_login, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BackofficeAdminsService.getAll');
        }
    }
};

// Global erişim
window.BackofficeAdminsService = BackofficeAdminsService;
