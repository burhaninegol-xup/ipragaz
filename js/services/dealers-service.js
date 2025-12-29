/**
 * Dealers Service
 * Bayi CRUD işlemleri
 */

/**
 * Türkçe karakterleri ASCII'ye normalize et
 * Kadıköy -> kadikoy, İstanbul -> istanbul
 */
function normalizeTurkish(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/ç/g, 'c')
        .replace(/ğ/g, 'g')
        .replace(/ı/g, 'i')
        .replace(/i̇/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ş/g, 's')
        .replace(/ü/g, 'u');
}

const DealersService = {
    /**
     * Tüm aktif bayileri getir
     */
    async getAll() {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.getAll');
        }
    },

    /**
     * ID ile bayi getir
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.getById');
        }
    },

    /**
     * Kod ile bayi getir
     */
    async getByCode(code) {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('*')
                .eq('code', code)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.getByCode');
        }
    },

    /**
     * Şehre göre bayileri getir (Türkçe karakter normalize edilmiş)
     */
    async getByCity(city) {
        try {
            // Türkçe karakterleri normalize et
            const normalizedCity = normalizeTurkish(city);

            // Tüm aktif bayileri çek
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;

            // Client-side filtreleme ile normalize karşılaştırma
            const filtered = data.filter(dealer =>
                normalizeTurkish(dealer.city) === normalizedCity
            );

            // İlçeye göre sırala
            filtered.sort((a, b) => (a.district || '').localeCompare(b.district || '', 'tr'));

            return { data: filtered, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.getByCity');
        }
    },

    /**
     * İlçeye göre bayileri getir (Türkçe karakter normalize edilmiş)
     */
    async getByDistrict(city, district) {
        try {
            // Türkçe karakterleri normalize et
            const normalizedCity = normalizeTurkish(city);
            const normalizedDistrict = normalizeTurkish(district);

            // Tüm aktif bayileri çek
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;

            // Client-side filtreleme ile normalize karşılaştırma
            const filtered = data.filter(dealer =>
                normalizeTurkish(dealer.city) === normalizedCity &&
                normalizeTurkish(dealer.district) === normalizedDistrict
            );

            return { data: filtered, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.getByDistrict');
        }
    },

    /**
     * Lokasyona göre en yakın bayileri getir
     */
    async getNearby(lat, lng, limit = 5) {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('*')
                .eq('is_active', true)
                .not('latitude', 'is', null)
                .not('longitude', 'is', null);

            if (error) throw error;

            // Mesafeye göre sırala (Haversine formülü)
            const dealersWithDistance = data.map(dealer => ({
                ...dealer,
                distance: calculateDistance(lat, lng, dealer.latitude, dealer.longitude)
            })).sort((a, b) => a.distance - b.distance);

            return { data: dealersWithDistance.slice(0, limit), error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.getNearby');
        }
    },

    /**
     * Bayi oluştur
     */
    async create(dealerData) {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .insert([dealerData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.create');
        }
    },

    /**
     * Bayi güncelle
     */
    async update(id, dealerData) {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .update(dealerData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.update');
        }
    },

    /**
     * Bayi sil (soft delete)
     */
    async deactivate(id) {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .update({ is_active: false })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.deactivate');
        }
    },

    /**
     * Tüm şehirleri getir (dropdown için)
     */
    async getCities() {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('city')
                .eq('is_active', true);

            if (error) throw error;

            // Benzersiz şehirler
            const cities = [...new Set(data.map(d => d.city))].sort();
            return { data: cities, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.getCities');
        }
    },

    /**
     * Şehirdeki ilçeleri getir (dropdown için)
     */
    async getDistricts(city) {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('district')
                .eq('city', city)
                .eq('is_active', true);

            if (error) throw error;

            // Benzersiz ilçeler
            const districts = [...new Set(data.map(d => d.district))].sort();
            return { data: districts, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.getDistricts');
        }
    },

    /**
     * Bayi girişi (username + password_hash ile)
     */
    async login(username, passwordHash) {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('id, code, name, city, district, phone')
                .eq('username', username)
                .eq('password_hash', passwordHash)
                .eq('is_active', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // Kayıt bulunamadı
                    return { data: null, error: 'Kullanıcı adı veya şifre hatalı' };
                }
                throw error;
            }

            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealersService.login');
        }
    }
};

/**
 * Mesafe hesaplama fonksiyonu (Haversine formülü)
 * @param {number} lat1 - Başlangıç enlemi
 * @param {number} lon1 - Başlangıç boylamı
 * @param {number} lat2 - Bitiş enlemi
 * @param {number} lon2 - Bitiş boylamı
 * @returns {number} Mesafe (km)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Global erişim
window.DealersService = DealersService;
window.calculateDistance = calculateDistance;
