/**
 * VKN Verification Service
 * VKN dogrulama istekleri ve belge yukleme islemleri
 */

const VknVerificationService = {
    /**
     * Yeni dogrulama istegi olustur
     * @param {Object} data - Dogrulama verisi
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async create(data) {
        try {
            const { data: result, error } = await supabaseClient
                .from('vkn_verification_requests')
                .insert([{
                    phone: data.phone,
                    vkn: data.vkn,
                    existing_customer_id: data.existing_customer_id || null,
                    requester_name: data.requester_name || null,
                    tax_certificate_url: data.tax_certificate_url || null,
                    trade_registry_url: data.trade_registry_url || null,
                    status: data.status || 'pending'
                }])
                .select()
                .single();

            if (error) throw error;
            return { data: result, error: null };
        } catch (error) {
            console.error('VknVerificationService.create error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Telefon numarasi ile bekleyen istek getir
     * @param {string} phone - Telefon numarasi
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async getByPhone(phone) {
        try {
            const { data, error } = await supabaseClient
                .from('vkn_verification_requests')
                .select('*')
                .eq('phone', phone)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .maybeSingle();

            if (error) throw error;
            return { data: data || null, error: null };
        } catch (error) {
            console.error('VknVerificationService.getByPhone error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Tum bekleyen istekleri getir (backoffice icin)
     * @returns {Promise<{data: Array|null, error: Object|null}>}
     */
    async getPendingRequests() {
        try {
            const { data, error } = await supabaseClient
                .from('vkn_verification_requests')
                .select(`
                    *,
                    existing_customer:customers(id, name, phone, company_name)
                `)
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('VknVerificationService.getPendingRequests error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Tum istekleri getir (backoffice icin)
     * @param {string} status - Opsiyonel durum filtresi
     * @returns {Promise<{data: Array|null, error: Object|null}>}
     */
    async getAll(status = null) {
        try {
            var query = supabaseClient
                .from('vkn_verification_requests')
                .select(`
                    *,
                    existing_customer:customers(id, name, phone, company_name)
                `)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('VknVerificationService.getAll error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Istek durumunu guncelle
     * @param {string} id - Istek ID
     * @param {string} status - Yeni durum (approved, rejected)
     * @param {string} notes - Admin notlari (opsiyonel)
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async updateStatus(id, status, notes = null) {
        try {
            var updateData = {
                status: status,
                reviewed_at: new Date().toISOString()
            };

            if (notes) {
                updateData.admin_notes = notes;
            }

            const { data, error } = await supabaseClient
                .from('vkn_verification_requests')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('VknVerificationService.updateStatus error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Belge yukle (Supabase Storage)
     * @param {File} file - Yuklenecek dosya
     * @param {string} type - Belge tipi (vergi_levhasi, ticaret_sicil)
     * @param {string} phone - Telefon numarasi (dosya ismi icin)
     * @returns {Promise<string>} - Public URL
     */
    async uploadDocument(file, type, phone) {
        try {
            // Dosya uzantisini al
            var ext = file.name.split('.').pop().toLowerCase();

            // Benzersiz dosya adi olustur
            var timestamp = Date.now();
            var sanitizedPhone = phone.replace(/\D/g, '');
            var fileName = sanitizedPhone + '_' + type + '_' + timestamp + '.' + ext;
            var filePath = 'vkn-documents/' + fileName;

            // Dosyayi yukle
            const { data, error } = await supabaseClient
                .storage
                .from('documents')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Public URL al
            const { data: urlData } = supabaseClient
                .storage
                .from('documents')
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } catch (error) {
            console.error('VknVerificationService.uploadDocument error:', error);
            throw error;
        }
    }
};

// Global erisim
window.VknVerificationService = VknVerificationService;
