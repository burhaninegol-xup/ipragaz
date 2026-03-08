/**
 * Settings Service
 * system_settings tablosu CRUD islemleri
 */

const SettingsService = {
    /**
     * Key ile ayar degerini getir
     */
    async getByKey(key) {
        try {
            const { data, error } = await supabaseClient
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', key)
                .single();

            if (error) throw error;
            return { data: data ? data.setting_value : null, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'SettingsService.getByKey');
        }
    },

    /**
     * Key ile ayar degerini guncelle
     */
    async updateByKey(key, value) {
        try {
            const { data, error } = await supabaseClient
                .from('system_settings')
                .update({
                    setting_value: value,
                    updated_at: new Date().toISOString()
                })
                .eq('setting_key', key)
                .select()
                .single();

            if (error) throw error;
            return { data: data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'SettingsService.updateByKey');
        }
    }
};
