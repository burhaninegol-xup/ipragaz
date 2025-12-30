/**
 * Dealer Districts Service (Mikro Pazar)
 * Bayilerin hizmet bölgelerini (ilçelerini) yönetir
 */

const DealerDistrictsService = {
    /**
     * Bayinin seçili ilçelerini getir
     * @param {string} dealerId - Bayi UUID
     * @returns {Promise<{data: Array, error: Object}>}
     */
    async getByDealerId(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('dealer_districts')
                .select(`
                    id,
                    dealer_id,
                    district_id,
                    created_at,
                    districts (
                        id,
                        name,
                        name_ascii,
                        city_id
                    )
                `)
                .eq('dealer_id', dealerId);

            if (error) {
                return handleSupabaseError(error, 'DealerDistrictsService.getByDealerId');
            }

            return { data: data || [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerDistrictsService.getByDealerId');
        }
    },

    /**
     * Bayinin ilçelerini senkronize et (eski kayıtları sil, yenilerini ekle)
     * @param {string} dealerId - Bayi UUID
     * @param {Array<string>} districtIds - Seçili ilçe UUID'leri
     * @returns {Promise<{data: Object, error: Object}>}
     */
    async syncDealerDistricts(dealerId, districtIds) {
        try {
            // 1. Önce mevcut kayıtları sil
            const { error: deleteError } = await supabaseClient
                .from('dealer_districts')
                .delete()
                .eq('dealer_id', dealerId);

            if (deleteError) {
                return handleSupabaseError(deleteError, 'DealerDistrictsService.syncDealerDistricts (delete)');
            }

            // 2. Yeni ilçeler boşsa sadece silme yeterli
            if (!districtIds || districtIds.length === 0) {
                return { data: { deleted: true, inserted: 0 }, error: null };
            }

            // 3. Yeni kayıtları ekle
            const newRecords = districtIds.map(function(districtId) {
                return {
                    dealer_id: dealerId,
                    district_id: districtId
                };
            });

            const { data, error: insertError } = await supabaseClient
                .from('dealer_districts')
                .insert(newRecords)
                .select();

            if (insertError) {
                return handleSupabaseError(insertError, 'DealerDistrictsService.syncDealerDistricts (insert)');
            }

            return { data: { deleted: true, inserted: data.length }, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerDistrictsService.syncDealerDistricts');
        }
    },

    /**
     * Tek bir ilçe ekle
     * @param {string} dealerId - Bayi UUID
     * @param {string} districtId - İlçe UUID
     * @returns {Promise<{data: Object, error: Object}>}
     */
    async addDistrict(dealerId, districtId) {
        try {
            const { data, error } = await supabaseClient
                .from('dealer_districts')
                .insert({
                    dealer_id: dealerId,
                    district_id: districtId
                })
                .select()
                .single();

            if (error) {
                // Duplicate key hatası
                if (error.code === '23505') {
                    return { data: null, error: { message: 'Bu ilçe zaten ekli' } };
                }
                return handleSupabaseError(error, 'DealerDistrictsService.addDistrict');
            }

            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerDistrictsService.addDistrict');
        }
    },

    /**
     * Tek bir ilçe kaldır
     * @param {string} dealerId - Bayi UUID
     * @param {string} districtId - İlçe UUID
     * @returns {Promise<{data: Object, error: Object}>}
     */
    async removeDistrict(dealerId, districtId) {
        try {
            const { error } = await supabaseClient
                .from('dealer_districts')
                .delete()
                .eq('dealer_id', dealerId)
                .eq('district_id', districtId);

            if (error) {
                return handleSupabaseError(error, 'DealerDistrictsService.removeDistrict');
            }

            return { data: { removed: true }, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerDistrictsService.removeDistrict');
        }
    },

    /**
     * Bir ilçedeki tüm bayileri getir (müşteri tarafı için)
     * @param {string} districtId - İlçe UUID
     * @returns {Promise<{data: Array, error: Object}>}
     */
    async getDealersByDistrictId(districtId) {
        try {
            const { data, error } = await supabaseClient
                .from('dealer_districts')
                .select(`
                    id,
                    dealer_id,
                    district_id,
                    dealers (
                        id,
                        name,
                        code,
                        phone,
                        city,
                        district,
                        is_active
                    )
                `)
                .eq('district_id', districtId);

            if (error) {
                return handleSupabaseError(error, 'DealerDistrictsService.getDealersByDistrictId');
            }

            // Sadece aktif bayileri filtrele
            var activeDealers = (data || []).filter(function(item) {
                return item.dealers && item.dealers.is_active !== false;
            }).map(function(item) {
                return item.dealers;
            });

            return { data: activeDealers, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerDistrictsService.getDealersByDistrictId');
        }
    },

    /**
     * Bir şehirdeki ilçelere hizmet veren bayileri getir
     * @param {string} cityId - Şehir UUID
     * @returns {Promise<{data: Array, error: Object}>}
     */
    async getDealersByCityId(cityId) {
        try {
            // Önce şehirdeki ilçeleri bul
            const { data: districts, error: districtError } = await supabaseClient
                .from('districts')
                .select('id')
                .eq('city_id', cityId);

            if (districtError) {
                return handleSupabaseError(districtError, 'DealerDistrictsService.getDealersByCityId (districts)');
            }

            if (!districts || districts.length === 0) {
                return { data: [], error: null };
            }

            var districtIds = districts.map(function(d) { return d.id; });

            // Bu ilçelere hizmet veren bayileri bul
            const { data, error } = await supabaseClient
                .from('dealer_districts')
                .select(`
                    dealer_id,
                    district_id,
                    dealers (
                        id,
                        name,
                        code,
                        phone,
                        city,
                        district,
                        is_active
                    ),
                    districts (
                        id,
                        name
                    )
                `)
                .in('district_id', districtIds);

            if (error) {
                return handleSupabaseError(error, 'DealerDistrictsService.getDealersByCityId');
            }

            return { data: data || [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerDistrictsService.getDealersByCityId');
        }
    },

    /**
     * Bayinin seçili ilçe ID'lerini array olarak getir
     * @param {string} dealerId - Bayi UUID
     * @returns {Promise<{data: Array<string>, error: Object}>}
     */
    async getDistrictIds(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('dealer_districts')
                .select('district_id')
                .eq('dealer_id', dealerId);

            if (error) {
                return handleSupabaseError(error, 'DealerDistrictsService.getDistrictIds');
            }

            var ids = (data || []).map(function(item) {
                return item.district_id;
            });

            return { data: ids, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'DealerDistrictsService.getDistrictIds');
        }
    }
};

// Global erişim için
window.DealerDistrictsService = DealerDistrictsService;
