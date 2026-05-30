/**
 * İPApp Users Service
 * "İPApp" uygulamasının kullanıcıları (İşyerim müşterileri/bayilerden AYRI).
 * Telefon + OTP ile giriş yapan kullanıcılar ipapp_users tablosunda tutulur.
 */

const IpappUsersService = {
    /**
     * Telefon numarasına göre kullanıcı getir
     */
    async getByPhone(phone) {
        try {
            const { data, error } = await supabaseClient
                .from('ipapp_users')
                .select('*')
                .eq('phone', phone)
                .eq('is_active', true)
                .maybeSingle();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'IpappUsersService.getByPhone');
        }
    },

    /**
     * Telefon ile kullanıcı bul; yoksa oluştur (OTP doğrulaması sonrası).
     */
    async findOrCreateByPhone(phone, name) {
        try {
            var existing = await this.getByPhone(phone);
            if (existing.data) {
                return { data: existing.data, error: null };
            }

            const { data, error } = await supabaseClient
                .from('ipapp_users')
                .insert({ phone: phone, name: name || null })
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'IpappUsersService.findOrCreateByPhone');
        }
    },

    /**
     * Kullanıcı adını güncelle (form gönderiminde ad/soyad alınınca).
     */
    async updateName(id, name) {
        try {
            const { data, error } = await supabaseClient
                .from('ipapp_users')
                .update({ name: name, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'IpappUsersService.updateName');
        }
    }
};
