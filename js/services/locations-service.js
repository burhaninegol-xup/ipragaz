/**
 * Locations Service
 * Turkiye il/ilce/mahalle/sokak CRUD islemleri
 */

const LocationsService = {
    /**
     * Tum aktif illeri getir
     */
    async getCities() {
        try {
            const { data, error } = await supabaseClient
                .from('cities')
                .select('id, code, name, name_ascii')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getCities');
        }
    },

    /**
     * Il ID ile il bilgisi getir
     */
    async getCityById(cityId) {
        try {
            const { data, error } = await supabaseClient
                .from('cities')
                .select('id, code, name, name_ascii')
                .eq('id', cityId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getCityById');
        }
    },

    /**
     * Il koduna gore il getir (plaka kodu)
     */
    async getCityByCode(code) {
        try {
            const { data, error } = await supabaseClient
                .from('cities')
                .select('id, code, name, name_ascii')
                .eq('code', code)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getCityByCode');
        }
    },

    /**
     * Isme gore il ara (Turkce karakter destekli)
     */
    async searchCities(query) {
        try {
            const normalizedQuery = this.normalizeTurkish(query);
            const { data, error } = await supabaseClient
                .from('cities')
                .select('id, code, name, name_ascii')
                .eq('is_active', true)
                .ilike('name_ascii', '%' + normalizedQuery + '%')
                .order('name')
                .limit(20);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.searchCities');
        }
    },

    /**
     * Il ID'sine gore ilceleri getir (alias: getDistricts)
     */
    async getDistricts(cityId) {
        return this.getDistrictsByCityId(cityId);
    },

    /**
     * Il ID'sine gore ilceleri getir
     */
    async getDistrictsByCityId(cityId) {
        try {
            const { data, error } = await supabaseClient
                .from('districts')
                .select('id, name, name_ascii')
                .eq('city_id', cityId)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getDistrictsByCityId');
        }
    },

    /**
     * Ilce ID ile ilce bilgisi getir
     */
    async getDistrictById(districtId) {
        try {
            const { data, error } = await supabaseClient
                .from('districts')
                .select('id, city_id, name, name_ascii')
                .eq('id', districtId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getDistrictById');
        }
    },

    /**
     * Isme gore ilce ara (belirli bir il icinde)
     */
    async searchDistricts(cityId, query) {
        try {
            const normalizedQuery = this.normalizeTurkish(query);
            const { data, error } = await supabaseClient
                .from('districts')
                .select('id, name, name_ascii')
                .eq('city_id', cityId)
                .eq('is_active', true)
                .ilike('name_ascii', '%' + normalizedQuery + '%')
                .order('name')
                .limit(20);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.searchDistricts');
        }
    },

    /**
     * Ilce ID'sine gore mahalleleri getir
     */
    async getNeighborhoodsByDistrictId(districtId) {
        try {
            const { data, error } = await supabaseClient
                .from('neighborhoods')
                .select('id, name, name_ascii, postal_code')
                .eq('district_id', districtId)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getNeighborhoodsByDistrictId');
        }
    },

    /**
     * Mahalle ID ile mahalle bilgisi getir
     */
    async getNeighborhoodById(neighborhoodId) {
        try {
            const { data, error } = await supabaseClient
                .from('neighborhoods')
                .select('id, district_id, name, name_ascii, postal_code')
                .eq('id', neighborhoodId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getNeighborhoodById');
        }
    },

    /**
     * Isme gore mahalle ara (belirli bir ilce icinde)
     */
    async searchNeighborhoods(districtId, query) {
        try {
            const normalizedQuery = this.normalizeTurkish(query);
            const { data, error } = await supabaseClient
                .from('neighborhoods')
                .select('id, name, name_ascii, postal_code')
                .eq('district_id', districtId)
                .eq('is_active', true)
                .ilike('name_ascii', '%' + normalizedQuery + '%')
                .order('name')
                .limit(30);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.searchNeighborhoods');
        }
    },

    /**
     * Mahalle ID'sine gore sokaklari getir
     */
    async getStreetsByNeighborhoodId(neighborhoodId) {
        try {
            const { data, error } = await supabaseClient
                .from('streets')
                .select('id, name, name_ascii, street_type')
                .eq('neighborhood_id', neighborhoodId)
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getStreetsByNeighborhoodId');
        }
    },

    /**
     * Sokak ID ile sokak bilgisi getir
     */
    async getStreetById(streetId) {
        try {
            const { data, error } = await supabaseClient
                .from('streets')
                .select('id, neighborhood_id, name, name_ascii, street_type')
                .eq('id', streetId)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getStreetById');
        }
    },

    /**
     * Isme gore sokak ara (belirli bir mahalle icinde)
     */
    async searchStreets(neighborhoodId, query) {
        try {
            const normalizedQuery = this.normalizeTurkish(query);
            const { data, error } = await supabaseClient
                .from('streets')
                .select('id, name, name_ascii, street_type')
                .eq('neighborhood_id', neighborhoodId)
                .eq('is_active', true)
                .ilike('name_ascii', '%' + normalizedQuery + '%')
                .order('name')
                .limit(30);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.searchStreets');
        }
    },

    /**
     * Lokasyon detaylarini ID'lerden getir (toplu)
     * Address gosterimi icin kullanilir
     */
    async getLocationDetails(cityId, districtId, neighborhoodId, streetId) {
        try {
            var results = {
                city: null,
                district: null,
                neighborhood: null,
                street: null
            };

            // Paralel sorgular
            var promises = [];

            if (cityId) {
                promises.push(
                    supabaseClient
                        .from('cities')
                        .select('id, name')
                        .eq('id', cityId)
                        .single()
                        .then(function(r) { results.city = r.data; })
                );
            }

            if (districtId) {
                promises.push(
                    supabaseClient
                        .from('districts')
                        .select('id, name')
                        .eq('id', districtId)
                        .single()
                        .then(function(r) { results.district = r.data; })
                );
            }

            if (neighborhoodId) {
                promises.push(
                    supabaseClient
                        .from('neighborhoods')
                        .select('id, name')
                        .eq('id', neighborhoodId)
                        .single()
                        .then(function(r) { results.neighborhood = r.data; })
                );
            }

            if (streetId) {
                promises.push(
                    supabaseClient
                        .from('streets')
                        .select('id, name')
                        .eq('id', streetId)
                        .single()
                        .then(function(r) { results.street = r.data; })
                );
            }

            await Promise.all(promises);

            return { data: results, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.getLocationDetails');
        }
    },

    /**
     * Il ve ilce isimlerinden ID'leri bul
     * Mevcut VARCHAR verileri migrate etmek icin
     */
    async findLocationIds(cityName, districtName, neighborhoodName, streetName) {
        try {
            var results = {
                city_id: null,
                district_id: null,
                neighborhood_id: null,
                street_id: null
            };

            // Il bul
            if (cityName) {
                var normalizedCity = this.normalizeTurkish(cityName);
                var { data: city } = await supabaseClient
                    .from('cities')
                    .select('id')
                    .eq('name_ascii', normalizedCity)
                    .single();
                if (city) results.city_id = city.id;
            }

            // Ilce bul
            if (results.city_id && districtName) {
                var normalizedDistrict = this.normalizeTurkish(districtName);
                var { data: district } = await supabaseClient
                    .from('districts')
                    .select('id')
                    .eq('city_id', results.city_id)
                    .eq('name_ascii', normalizedDistrict)
                    .single();
                if (district) results.district_id = district.id;
            }

            // Mahalle bul
            if (results.district_id && neighborhoodName) {
                var normalizedNeighborhood = this.normalizeTurkish(neighborhoodName);
                var { data: neighborhood } = await supabaseClient
                    .from('neighborhoods')
                    .select('id')
                    .eq('district_id', results.district_id)
                    .eq('name_ascii', normalizedNeighborhood)
                    .single();
                if (neighborhood) results.neighborhood_id = neighborhood.id;
            }

            // Sokak bul
            if (results.neighborhood_id && streetName) {
                var normalizedStreet = this.normalizeTurkish(streetName);
                var { data: street } = await supabaseClient
                    .from('streets')
                    .select('id')
                    .eq('neighborhood_id', results.neighborhood_id)
                    .eq('name_ascii', normalizedStreet)
                    .single();
                if (street) results.street_id = street.id;
            }

            return { data: results, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'LocationsService.findLocationIds');
        }
    },

    /**
     * Turkce karakterleri ASCII'ye cevir
     * Arama ve karsilastirma icin kullanilir
     */
    normalizeTurkish: function(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .replace(/ç/g, 'c')
            .replace(/Ç/g, 'c')
            .replace(/ğ/g, 'g')
            .replace(/Ğ/g, 'g')
            .replace(/ı/g, 'i')
            .replace(/I/g, 'i')
            .replace(/İ/g, 'i')
            .replace(/i̇/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/Ö/g, 'o')
            .replace(/ş/g, 's')
            .replace(/Ş/g, 's')
            .replace(/ü/g, 'u')
            .replace(/Ü/g, 'u');
    },

    /**
     * Tam adres metni olustur (ID'lerden)
     */
    async buildFullAddressFromIds(cityId, districtId, neighborhoodId, streetId, buildingNo, floor, apartment) {
        var parts = [];

        var { data: locationDetails } = await this.getLocationDetails(cityId, districtId, neighborhoodId, streetId);

        if (locationDetails.neighborhood) parts.push(locationDetails.neighborhood.name);
        if (locationDetails.street) parts.push(locationDetails.street.name);
        if (buildingNo) parts.push('Bina No: ' + buildingNo);
        if (floor) parts.push('Kat: ' + floor);
        if (apartment) parts.push('Daire: ' + apartment);
        if (locationDetails.district) parts.push(locationDetails.district.name);
        if (locationDetails.city) parts.push(locationDetails.city.name);

        return parts.join(', ');
    }
};

// Global erisim
window.LocationsService = LocationsService;
