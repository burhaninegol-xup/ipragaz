/**
 * Offer Logs Service
 * Teklif degisiklik gecmisi islemleri
 */

const OfferLogsService = {
    /**
     * Yeni log kaydi olustur
     * @param {string} offerId - Teklif ID
     * @param {string} action - Islem turu (created, price_updated, accepted, rejected, cancelled, passived, activated, requested)
     * @param {string} actorType - Kim yapti (dealer veya customer)
     * @param {string|null} actorId - Yapan kisinin ID'si
     * @param {string} actorName - Yapan kisinin adi
     * @param {object|null} details - Ek bilgiler (eski/yeni degerler vs)
     */
    async log(offerId, action, actorType, actorId, actorName, details = null) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_logs')
                .insert([{
                    offer_id: offerId,
                    action: action,
                    actor_type: actorType,
                    actor_id: actorId,
                    actor_name: actorName,
                    details: details
                }])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OfferLogsService.log');
        }
    },

    /**
     * Teklif ID'sine gore loglari getir (en yeniden eskiye)
     */
    async getByOfferId(offerId) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_logs')
                .select('*')
                .eq('offer_id', offerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OfferLogsService.getByOfferId');
        }
    },

    /**
     * Belirli bir aksiyonun loglarini getir
     */
    async getByAction(offerId, action) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_logs')
                .select('*')
                .eq('offer_id', offerId)
                .eq('action', action)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OfferLogsService.getByAction');
        }
    },

    /**
     * En son log kaydini getir
     */
    async getLatest(offerId) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_logs')
                .select('*')
                .eq('offer_id', offerId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OfferLogsService.getLatest');
        }
    }
};

// Global erisim
window.OfferLogsService = OfferLogsService;
