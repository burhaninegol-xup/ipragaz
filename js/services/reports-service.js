/**
 * Reports Service
 * Backoffice satis raporlari icin veri servisi
 */

const ReportsService = {
    /**
     * Satis tonaji hesapla (belirli ay icin)
     * @param {Object} filters - {dealerIds: [], startDate, endDate}
     * @returns {Promise<{data: {totalTonnage: number}, error: Object|null}>}
     */
    async getSalesTonnage(filters) {
        try {
            let query = supabaseClient
                .from('orders')
                .select(`
                    id,
                    dealer_id,
                    status,
                    created_at,
                    order_items(
                        quantity,
                        product:products(weight_kg)
                    )
                `)
                .eq('status', 'completed');

            // Tarih filtresi
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            // Bayi filtresi
            if (filters.dealerIds && filters.dealerIds.length > 0) {
                query = query.in('dealer_id', filters.dealerIds);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Tonaj hesapla
            let totalKg = 0;
            if (data) {
                data.forEach(order => {
                    if (order.order_items) {
                        order.order_items.forEach(item => {
                            const weight = item.product?.weight_kg || 0;
                            totalKg += item.quantity * weight;
                        });
                    }
                });
            }

            return {
                data: {
                    totalTonnage: totalKg / 1000, // kg to ton
                    totalKg: totalKg
                },
                error: null
            };
        } catch (error) {
            console.error('getSalesTonnage error:', error);
            return { data: null, error };
        }
    },

    /**
     * Urun bazli satis adetleri
     * @param {Object} filters - {dealerIds: [], startDate, endDate}
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getProductSales(filters) {
        try {
            let query = supabaseClient
                .from('orders')
                .select(`
                    id,
                    dealer_id,
                    status,
                    created_at,
                    order_items(
                        quantity,
                        product_id,
                        product:products(id, name, code, category, weight_kg)
                    )
                `)
                .eq('status', 'completed');

            // Tarih filtresi
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            // Bayi filtresi
            if (filters.dealerIds && filters.dealerIds.length > 0) {
                query = query.in('dealer_id', filters.dealerIds);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Urun bazli toplam
            const productSales = {};
            if (data) {
                data.forEach(order => {
                    if (order.order_items) {
                        order.order_items.forEach(item => {
                            if (item.product) {
                                const productId = item.product.id;
                                if (!productSales[productId]) {
                                    productSales[productId] = {
                                        id: productId,
                                        name: item.product.name,
                                        code: item.product.code,
                                        category: item.product.category,
                                        weight_kg: item.product.weight_kg,
                                        quantity: 0,
                                        totalWeight: 0
                                    };
                                }
                                productSales[productId].quantity += item.quantity;
                                productSales[productId].totalWeight += item.quantity * (item.product.weight_kg || 0);
                            }
                        });
                    }
                });
            }

            // Array'e cevir ve sirala
            const result = Object.values(productSales).sort((a, b) => b.quantity - a.quantity);

            return { data: result, error: null };
        } catch (error) {
            console.error('getProductSales error:', error);
            return { data: [], error };
        }
    },

    /**
     * Siparis adetleri
     * @param {Object} filters - {dealerIds: [], startDate, endDate, status}
     * @returns {Promise<{data: {total, completed, pending, cancelled}, error: Object|null}>}
     */
    async getOrderCounts(filters) {
        try {
            let query = supabaseClient
                .from('orders')
                .select('id, status, created_at', { count: 'exact' });

            // Tarih filtresi
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            // Bayi filtresi
            if (filters.dealerIds && filters.dealerIds.length > 0) {
                query = query.in('dealer_id', filters.dealerIds);
            }

            const { data, error, count } = await query;

            if (error) throw error;

            // Durum bazli sayim
            const counts = {
                total: count || 0,
                completed: 0,
                pending: 0,
                cancelled: 0,
                on_the_way: 0
            };

            if (data) {
                data.forEach(order => {
                    if (order.status === 'completed') counts.completed++;
                    else if (order.status === 'pending' || order.status === 'waiting_for_assignment') counts.pending++;
                    else if (order.status === 'cancelled') counts.cancelled++;
                    else if (order.status === 'on_the_way') counts.on_the_way++;
                });
            }

            return { data: counts, error: null };
        } catch (error) {
            console.error('getOrderCounts error:', error);
            return { data: null, error };
        }
    },

    /**
     * Rutin siparis sayilari
     * @param {Object} filters - {dealerIds: []}
     * @returns {Promise<{data: {active, paused, total}, error: Object|null}>}
     */
    async getRecurringOrderCounts(filters) {
        try {
            let query = supabaseClient
                .from('recurring_orders')
                .select('id, status');

            // Bayi filtresi
            if (filters.dealerIds && filters.dealerIds.length > 0) {
                query = query.in('dealer_id', filters.dealerIds);
            }

            const { data, error } = await query;

            if (error) throw error;

            const counts = {
                total: data ? data.length : 0,
                active: 0,
                paused: 0,
                cancelled: 0
            };

            if (data) {
                data.forEach(order => {
                    if (order.status === 'active') counts.active++;
                    else if (order.status === 'paused') counts.paused++;
                    else if (order.status === 'cancelled') counts.cancelled++;
                });
            }

            return { data: counts, error: null };
        } catch (error) {
            console.error('getRecurringOrderCounts error:', error);
            return { data: { total: 0, active: 0, paused: 0, cancelled: 0 }, error };
        }
    },

    /**
     * Secilen il/ilceye gore yetkili bayileri getir
     * @param {string} city - Il adi
     * @param {string} district - Ilce adi (opsiyonel)
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getDealersByLocation(city, district) {
        try {
            if (!city) {
                // Tum aktif bayileri getir
                const { data, error } = await supabaseClient
                    .from('dealers')
                    .select('id, name, code, city, district')
                    .eq('is_active', true)
                    .order('name');
                return { data, error };
            }

            // Mikro pazar kontrolu - hem ana ilce hem de dealer_districts
            let query = supabaseClient
                .from('dealers')
                .select(`
                    id, name, code, city, district,
                    dealer_districts(
                        district:districts(id, name, city:cities(name))
                    )
                `)
                .eq('is_active', true);

            const { data, error } = await query;

            if (error) throw error;

            // Filtreleme
            const filteredDealers = [];
            const addedIds = new Set();

            if (data) {
                data.forEach(dealer => {
                    // Ana ilce eslesmesi
                    const matchesMainLocation =
                        dealer.city === city &&
                        (!district || dealer.district === district);

                    // Mikro pazar eslesmesi
                    let matchesMicroMarket = false;
                    if (dealer.dealer_districts) {
                        dealer.dealer_districts.forEach(dd => {
                            if (dd.district && dd.district.city) {
                                const distCity = dd.district.city.name;
                                const distName = dd.district.name;
                                if (distCity === city && (!district || distName === district)) {
                                    matchesMicroMarket = true;
                                }
                            }
                        });
                    }

                    if ((matchesMainLocation || matchesMicroMarket) && !addedIds.has(dealer.id)) {
                        addedIds.add(dealer.id);
                        filteredDealers.push({
                            id: dealer.id,
                            name: dealer.name,
                            code: dealer.code,
                            city: dealer.city,
                            district: dealer.district
                        });
                    }
                });
            }

            return { data: filteredDealers, error: null };
        } catch (error) {
            console.error('getDealersByLocation error:', error);
            return { data: [], error };
        }
    },

    /**
     * Tum illeri getir
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getCities() {
        try {
            const { data, error } = await supabaseClient
                .from('cities')
                .select('id, name, code')
                .order('name');

            return { data, error };
        } catch (error) {
            console.error('getCities error:', error);
            return { data: [], error };
        }
    },

    /**
     * Ile gore ilceleri getir
     * @param {string} cityId - Il ID
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getDistrictsByCity(cityId) {
        try {
            const { data, error } = await supabaseClient
                .from('districts')
                .select('id, name')
                .eq('city_id', cityId)
                .order('name');

            return { data, error };
        } catch (error) {
            console.error('getDistrictsByCity error:', error);
            return { data: [], error };
        }
    },

    /**
     * Tarih yardimci fonksiyonlari
     */
    getMonthDateRange(monthOffset = 0) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + monthOffset;

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59);

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };
    },

    getCurrentMonthRange() {
        return this.getMonthDateRange(0);
    },

    getPreviousMonthRange() {
        return this.getMonthDateRange(-1);
    },

    /**
     * Il bazli satis verileri (grafik icin)
     * @param {Object} filters - {startDate, endDate}
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getCitySalesData(filters) {
        try {
            let query = supabaseClient
                .from('orders')
                .select(`
                    id,
                    dealer_id,
                    dealer:dealers(id, name, city),
                    status,
                    created_at,
                    order_items(
                        quantity,
                        product:products(weight_kg)
                    )
                `)
                .eq('status', 'completed');

            // Tarih filtresi
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Il bazli toplam hesapla
            const citySales = {};
            if (data) {
                data.forEach(order => {
                    const cityName = order.dealer?.city || 'Bilinmeyen';

                    if (!citySales[cityName]) {
                        citySales[cityName] = {
                            name: cityName,
                            tonnage: 0,
                            quantity: 0
                        };
                    }

                    if (order.order_items) {
                        order.order_items.forEach(item => {
                            const weight = item.product?.weight_kg || 0;
                            citySales[cityName].tonnage += (item.quantity * weight) / 1000;
                            citySales[cityName].quantity += item.quantity;
                        });
                    }
                });
            }

            // Array'e cevir ve tonaja gore sirala
            const result = Object.values(citySales)
                .filter(c => c.name !== 'Bilinmeyen')
                .sort((a, b) => b.tonnage - a.tonnage);

            return { data: result, error: null };
        } catch (error) {
            console.error('getCitySalesData error:', error);
            return { data: [], error };
        }
    },

    /**
     * Ilce bazli satis verileri (grafik icin)
     * @param {Object} filters - {cityName, startDate, endDate}
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getDistrictSalesData(filters) {
        try {
            let query = supabaseClient
                .from('orders')
                .select(`
                    id,
                    dealer_id,
                    dealer:dealers(id, name, city, district),
                    status,
                    created_at,
                    order_items(
                        quantity,
                        product:products(weight_kg)
                    )
                `)
                .eq('status', 'completed');

            // Tarih filtresi
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Ilce bazli toplam hesapla (sadece secilen il icin)
            const districtSales = {};
            if (data) {
                data.forEach(order => {
                    // Il filtresi
                    if (filters.cityName && order.dealer?.city !== filters.cityName) {
                        return;
                    }

                    const districtName = order.dealer?.district || 'Bilinmeyen';

                    if (!districtSales[districtName]) {
                        districtSales[districtName] = {
                            name: districtName,
                            tonnage: 0,
                            quantity: 0
                        };
                    }

                    if (order.order_items) {
                        order.order_items.forEach(item => {
                            const weight = item.product?.weight_kg || 0;
                            districtSales[districtName].tonnage += (item.quantity * weight) / 1000;
                            districtSales[districtName].quantity += item.quantity;
                        });
                    }
                });
            }

            // Array'e cevir ve tonaja gore sirala
            const result = Object.values(districtSales)
                .filter(d => d.name !== 'Bilinmeyen')
                .sort((a, b) => b.tonnage - a.tonnage);

            return { data: result, error: null };
        } catch (error) {
            console.error('getDistrictSalesData error:', error);
            return { data: [], error };
        }
    },

    /**
     * Bayi bazli satis verileri (grafik icin)
     * @param {Object} filters - {dealerIds: [], startDate, endDate}
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getDealerSalesData(filters) {
        try {
            let query = supabaseClient
                .from('orders')
                .select(`
                    id,
                    dealer_id,
                    dealer:dealers(id, name),
                    status,
                    created_at,
                    order_items(
                        quantity,
                        product:products(weight_kg)
                    )
                `)
                .eq('status', 'completed');

            // Tarih filtresi
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }

            // Bayi filtresi
            if (filters.dealerIds && filters.dealerIds.length > 0) {
                query = query.in('dealer_id', filters.dealerIds);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Bayi bazli toplam hesapla
            const dealerSales = {};
            if (data) {
                data.forEach(order => {
                    const dealerId = order.dealer_id;
                    const dealerName = order.dealer ? order.dealer.name : 'Bilinmeyen Bayi';

                    if (!dealerSales[dealerId]) {
                        dealerSales[dealerId] = {
                            dealerId: dealerId,
                            dealerName: dealerName,
                            tonnage: 0,
                            quantity: 0
                        };
                    }

                    if (order.order_items) {
                        order.order_items.forEach(item => {
                            const weight = item.product?.weight_kg || 0;
                            dealerSales[dealerId].tonnage += (item.quantity * weight) / 1000; // kg to ton
                            dealerSales[dealerId].quantity += item.quantity;
                        });
                    }
                });
            }

            // Array'e cevir ve tonaja gore sirala
            const result = Object.values(dealerSales)
                .sort((a, b) => b.tonnage - a.tonnage);

            return { data: result, error: null };
        } catch (error) {
            console.error('getDealerSalesData error:', error);
            return { data: [], error };
        }
    }
};

// Global erisim
window.ReportsService = ReportsService;
