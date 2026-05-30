/**
 * Atıl (Boş) Tüp İade Bildirimi Service
 * İPApp kullanıcılarının doldurduğu boş tüp iade formu kayıtları.
 */

const AtilTupService = {
    /**
     * Yeni boş tüp iade bildirimi oluştur
     * @param {Object} payload
     *   { ipapp_user_id, phone, contact_name, city, district, dealer_id,
     *     dealer_name, return_address_1, return_address_2, tubes, description }
     */
    async create(payload) {
        try {
            const record = {
                ipapp_user_id: payload.ipapp_user_id || null,
                phone: payload.phone || null,
                contact_name: payload.contact_name,
                city: payload.city || null,
                district: payload.district || null,
                dealer_id: payload.dealer_id || null,
                dealer_name: payload.dealer_name || null,
                return_address_1: payload.return_address_1,
                return_address_2: payload.return_address_2 || null,
                tubes: payload.tubes || [],
                description: payload.description || null,
                // Yeni gelen atıl tüp talebinin ilk durumu "Atama Bekliyor"
                status: payload.status || 'waiting_for_assignment'
            };

            const { data, error } = await supabaseClient
                .from('atil_tup_bildirimleri')
                .insert(record)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AtilTupService.create');
        }
    },

    /**
     * Tüm bildirimleri (opsiyonel tarih aralığı) getir
     * @param {string} startISO  başlangıç (ISO, dahil)
     * @param {string} endISO    bitiş (ISO, dahil)
     */
    async getAll(startISO, endISO) {
        try {
            let query = supabaseClient
                .from('atil_tup_bildirimleri')
                .select('*')
                .order('created_at', { ascending: false });
            if (startISO) query = query.gte('created_at', startISO);
            if (endISO) query = query.lte('created_at', endISO);

            const { data, error } = await query;
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AtilTupService.getAll');
        }
    },

    /**
     * Bir bayiye ait atıl tüp bildirimlerini getir (sipariş listesine harmanlamak için)
     * @param {string} dealerId  bayi (dealers.id)
     * @param {Object} filters   { dateFrom, dateTo, status }  (ISO tarih, opsiyonel)
     */
    async getByDealerId(dealerId, filters = {}) {
        try {
            let query = supabaseClient
                .from('atil_tup_bildirimleri')
                .select('*')
                .eq('dealer_id', dealerId)
                .order('created_at', { ascending: false });

            if (filters.status) query = query.eq('status', filters.status);
            if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
            if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

            const { data, error } = await query;
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AtilTupService.getByDealerId');
        }
    },

    /**
     * Bir kullanıcının bildirimlerini getir
     */
    async getByUser(ipappUserId) {
        try {
            const { data, error } = await supabaseClient
                .from('atil_tup_bildirimleri')
                .select('*')
                .eq('ipapp_user_id', ipappUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AtilTupService.getByUser');
        }
    }
};
