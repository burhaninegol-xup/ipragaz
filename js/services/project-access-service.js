/**
 * Project Access Service
 * Proje erişim kontrolü için kullanıcı doğrulama işlemleri
 */

const ProjectAccessService = {
    /**
     * Kullanıcı girişi
     * @param {string} username - Kullanıcı adı
     * @param {string} passwordHash - SHA-256 ile hash'lenmiş şifre
     * @returns {Promise<{data: Object|null, error: string|null}>}
     */
    async login(username, passwordHash) {
        try {
            const { data, error } = await supabaseClient
                .from('project_access')
                .select('id, username')
                .eq('username', username)
                .eq('password_hash', passwordHash)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return { data: null, error: 'Geçersiz kullanıcı adı veya şifre' };
                }
                throw error;
            }

            // Son giriş zamanını güncelle
            await supabaseClient
                .from('project_access')
                .update({ last_login: new Date().toISOString() })
                .eq('id', data.id);

            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'ProjectAccessService.login');
        }
    }
};

// Global erişim
window.ProjectAccessService = ProjectAccessService;
