/**
 * Retail Prices By City Service
 * Il bazinda perakende fiyat CRUD islemleri
 */

const RetailPricesByCityService = {
    /**
     * Sehir bazli fiyatlari getir
     */
    async getByCityId(cityId) {
        try {
            const { data, error } = await supabaseClient
                .from('retail_prices_by_city')
                .select(`
                    *,
                    products:product_id (id, code, name, base_price, weight_kg, category),
                    cities:city_id (id, code, name)
                `)
                .eq('city_id', cityId)
                .eq('is_active', true)
                .order('products(name)');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.getByCityId');
        }
    },

    /**
     * Urun bazli fiyatlari getir (tum sehirler)
     */
    async getByProductId(productId) {
        try {
            const { data, error } = await supabaseClient
                .from('retail_prices_by_city')
                .select(`
                    *,
                    products:product_id (id, code, name, base_price, weight_kg, category),
                    cities:city_id (id, code, name)
                `)
                .eq('product_id', productId)
                .eq('is_active', true)
                .order('cities(name)');

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.getByProductId');
        }
    },

    /**
     * Tek fiyat getir (urun + sehir)
     */
    async getPrice(productId, cityId) {
        try {
            const { data, error } = await supabaseClient
                .from('retail_prices_by_city')
                .select('*')
                .eq('product_id', productId)
                .eq('city_id', cityId)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.getPrice');
        }
    },

    /**
     * Fiyat ekle veya guncelle (upsert)
     */
    async upsert(productId, cityId, retailPrice) {
        try {
            const { data, error } = await supabaseClient
                .from('retail_prices_by_city')
                .upsert({
                    product_id: productId,
                    city_id: cityId,
                    retail_price: retailPrice,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'product_id,city_id'
                })
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.upsert');
        }
    },

    /**
     * Toplu fiyat ekle/guncelle
     * @param {Array} prices - [{product_id, city_id, retail_price}, ...]
     */
    async bulkUpsert(prices) {
        try {
            const records = prices.map(p => ({
                product_id: p.product_id,
                city_id: p.city_id,
                retail_price: p.retail_price,
                is_active: true,
                updated_at: new Date().toISOString()
            }));

            const { data, error } = await supabaseClient
                .from('retail_prices_by_city')
                .upsert(records, {
                    onConflict: 'product_id,city_id'
                })
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.bulkUpsert');
        }
    },

    /**
     * Sehirler arasi fiyat kopyala
     */
    async copyPricesFromCity(sourceCityId, targetCityId) {
        try {
            // Kaynak sehrin fiyatlarini al
            const { data: sourcePrices, error: sourceError } = await supabaseClient
                .from('retail_prices_by_city')
                .select('product_id, retail_price')
                .eq('city_id', sourceCityId)
                .eq('is_active', true);

            if (sourceError) throw sourceError;

            if (!sourcePrices || sourcePrices.length === 0) {
                return { data: [], error: null, message: 'Kaynak sehirde fiyat bulunamadi' };
            }

            // Hedef sehre kopyala
            const records = sourcePrices.map(p => ({
                product_id: p.product_id,
                city_id: targetCityId,
                retail_price: p.retail_price,
                is_active: true,
                updated_at: new Date().toISOString()
            }));

            const { data, error } = await supabaseClient
                .from('retail_prices_by_city')
                .upsert(records, {
                    onConflict: 'product_id,city_id'
                })
                .select();

            if (error) throw error;
            return { data, error: null, count: records.length };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.copyPricesFromCity');
        }
    },

    /**
     * Sehirdeki tum fiyatlara yuzde uygula
     * @param {string} cityId - Sehir ID
     * @param {number} percentage - Yuzde (ornegin: 10 = %10 artis, -5 = %5 azalis)
     */
    async applyPercentageChange(cityId, percentage) {
        try {
            // Mevcut fiyatlari al
            const { data: currentPrices, error: fetchError } = await supabaseClient
                .from('retail_prices_by_city')
                .select('id, product_id, retail_price')
                .eq('city_id', cityId)
                .eq('is_active', true);

            if (fetchError) throw fetchError;

            if (!currentPrices || currentPrices.length === 0) {
                return { data: [], error: null, message: 'Bu sehirde fiyat bulunamadi' };
            }

            // Yeni fiyatlari hesapla
            const multiplier = 1 + (percentage / 100);
            const updates = currentPrices.map(p => ({
                id: p.id,
                product_id: p.product_id,
                city_id: cityId,
                retail_price: Math.round(p.retail_price * multiplier * 100) / 100,
                updated_at: new Date().toISOString()
            }));

            // Toplu guncelle
            const { data, error } = await supabaseClient
                .from('retail_prices_by_city')
                .upsert(updates)
                .select();

            if (error) throw error;
            return { data, error: null, count: updates.length };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.applyPercentageChange');
        }
    },

    /**
     * Fiyat sil (soft delete)
     */
    async deactivate(id) {
        try {
            const { data, error } = await supabaseClient
                .from('retail_prices_by_city')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.deactivate');
        }
    },

    /**
     * Istatistikleri getir
     */
    async getStats() {
        try {
            // Tum aktif fiyatlari say
            const { count: totalPrices, error: countError } = await supabaseClient
                .from('retail_prices_by_city')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true);

            if (countError) throw countError;

            // Fiyat tanimli sehir sayisi
            const { data: citiesWithPrices, error: citiesError } = await supabaseClient
                .from('retail_prices_by_city')
                .select('city_id')
                .eq('is_active', true);

            if (citiesError) throw citiesError;

            const uniqueCities = new Set(citiesWithPrices.map(p => p.city_id));

            return {
                data: {
                    totalPrices: totalPrices || 0,
                    citiesWithPrices: uniqueCities.size
                },
                error: null
            };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.getStats');
        }
    },

    /**
     * Sehir ve urunlere gore fiyat matrisi getir
     */
    async getPriceMatrix(cityId) {
        try {
            // Tum urunleri al
            const { data: products, error: productsError } = await supabaseClient
                .from('products')
                .select('id, code, name, base_price, weight_kg, category')
                .eq('is_active', true)
                .order('name');

            if (productsError) throw productsError;

            // Sehrin mevcut fiyatlarini al
            const { data: prices, error: pricesError } = await supabaseClient
                .from('retail_prices_by_city')
                .select('product_id, retail_price')
                .eq('city_id', cityId)
                .eq('is_active', true);

            if (pricesError) throw pricesError;

            // Fiyat haritasi olustur
            const priceMap = {};
            if (prices) {
                prices.forEach(p => {
                    priceMap[p.product_id] = p.retail_price;
                });
            }

            // Matrisi olustur
            const matrix = products.map(product => ({
                product_id: product.id,
                product_code: product.code,
                product_name: product.name,
                base_price: product.base_price,
                weight_kg: product.weight_kg,
                category: product.category,
                retail_price: priceMap[product.id] || null,
                has_price: priceMap[product.id] !== undefined
            }));

            return { data: matrix, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.getPriceMatrix');
        }
    },

    /**
     * Urun bazli tum sehirlerin fiyatlarini getir
     */
    async getCityPriceMatrix(productId) {
        try {
            // Tum sehirleri al
            const { data: cities, error: citiesError } = await supabaseClient
                .from('cities')
                .select('id, code, name')
                .eq('is_active', true)
                .order('name');

            if (citiesError) throw citiesError;

            // Urunun mevcut fiyatlarini al
            const { data: prices, error: pricesError } = await supabaseClient
                .from('retail_prices_by_city')
                .select('city_id, retail_price')
                .eq('product_id', productId)
                .eq('is_active', true);

            if (pricesError) throw pricesError;

            // Fiyat haritasi olustur
            const priceMap = {};
            if (prices) {
                prices.forEach(p => {
                    priceMap[p.city_id] = p.retail_price;
                });
            }

            // Matrisi olustur
            const matrix = cities.map(city => ({
                city_id: city.id,
                city_code: city.code,
                city_name: city.name,
                retail_price: priceMap[city.id] || null,
                has_price: priceMap[city.id] !== undefined
            }));

            return { data: matrix, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'RetailPricesByCityService.getCityPriceMatrix');
        }
    }
};

// Global erisim
window.RetailPricesByCityService = RetailPricesByCityService;
