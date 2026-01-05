/**
 * Reports Service
 * Dashboard ve raporlama işlemleri
 */

const ReportsService = {
    /**
     * Dashboard özet istatistiklerini getir
     * @param {string} startDate - Başlangıç tarihi (YYYY-MM-DD)
     * @param {string} endDate - Bitiş tarihi (YYYY-MM-DD)
     */
    async getDashboardStats(startDate, endDate) {
        try {
            // Tarih filtresi ile siparişleri çek
            let query = supabaseClient
                .from('orders')
                .select('id, status, total_amount, created_at, dealer_id');

            if (startDate) query = query.gte('created_at', startDate);
            if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');

            const { data: orders, error: ordersError } = await query;
            if (ordersError) throw ordersError;

            // Aktif bayi sayısını çek
            const { data: dealers, error: dealersError } = await supabaseClient
                .from('dealers')
                .select('id')
                .eq('is_active', true);
            if (dealersError) throw dealersError;

            const completedOrders = orders?.filter(o => o.status === 'completed') || [];
            const totalRevenue = completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

            return {
                data: {
                    total_orders: orders?.length || 0,
                    completed_orders: completedOrders.length,
                    total_revenue: totalRevenue,
                    active_dealers: dealers?.length || 0
                },
                error: null
            };
        } catch (error) {
            console.error('getDashboardStats error:', error);
            return { data: null, error: error.message };
        }
    },

    /**
     * Sipariş istatistiklerini getir (son 30 gün)
     */
    async getOrderStats() {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabaseClient
                .from('orders')
                .select('id, status, total_amount, created_at')
                .gte('created_at', thirtyDaysAgo);

            if (error) throw error;

            return {
                data: {
                    total: data?.length || 0,
                    pending: data?.filter(o => o.status === 'pending').length || 0,
                    completed: data?.filter(o => o.status === 'completed').length || 0,
                    cancelled: data?.filter(o => o.status === 'cancelled').length || 0,
                    revenue: data?.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0
                },
                error: null
            };
        } catch (error) {
            console.error('getOrderStats error:', error);
            return { data: null, error: error.message };
        }
    },

    /**
     * Müşteri istatistiklerini getir
     */
    async getCustomerStats() {
        try {
            const { data, error } = await supabaseClient
                .from('customers')
                .select('id, created_at, is_active');

            if (error) throw error;

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            return {
                data: {
                    total: data?.length || 0,
                    active: data?.filter(c => c.is_active).length || 0,
                    inactive: data?.filter(c => !c.is_active).length || 0,
                    newThisMonth: data?.filter(c => new Date(c.created_at) > thirtyDaysAgo).length || 0
                },
                error: null
            };
        } catch (error) {
            console.error('getCustomerStats error:', error);
            return { data: null, error: error.message };
        }
    },

    /**
     * Bayi istatistiklerini getir
     */
    async getDealerStats() {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('id, is_active');

            if (error) throw error;

            return {
                data: {
                    total: data?.length || 0,
                    active: data?.filter(d => d.is_active).length || 0,
                    inactive: data?.filter(d => !d.is_active).length || 0
                },
                error: null
            };
        } catch (error) {
            console.error('getDealerStats error:', error);
            return { data: null, error: error.message };
        }
    },

    /**
     * Teklif istatistiklerini getir (son 30 gün)
     */
    async getOfferStats() {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabaseClient
                .from('offers')
                .select('id, status, created_at')
                .gte('created_at', thirtyDaysAgo);

            if (error) throw error;

            return {
                data: {
                    total: data?.length || 0,
                    pending: data?.filter(o => o.status === 'pending').length || 0,
                    approved: data?.filter(o => o.status === 'approved').length || 0,
                    rejected: data?.filter(o => o.status === 'rejected').length || 0
                },
                error: null
            };
        } catch (error) {
            console.error('getOfferStats error:', error);
            return { data: null, error: error.message };
        }
    },

    /**
     * Belirli tarih aralığında sipariş raporu
     */
    async getOrdersReport(startDate, endDate) {
        try {
            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    id,
                    status,
                    total_amount,
                    created_at,
                    customer:customers(id, company_name),
                    dealer:dealers(id, name)
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('getOrdersReport error:', error);
            return { data: null, error: error.message };
        }
    },

    /**
     * Bayi performans raporu
     */
    async getDealerPerformance(dealerId, startDate, endDate) {
        try {
            let query = supabaseClient
                .from('orders')
                .select('id, status, total_amount, created_at')
                .eq('dealer_id', dealerId);

            if (startDate) query = query.gte('created_at', startDate);
            if (endDate) query = query.lte('created_at', endDate);

            const { data, error } = await query;

            if (error) throw error;

            return {
                data: {
                    totalOrders: data?.length || 0,
                    completedOrders: data?.filter(o => o.status === 'completed').length || 0,
                    totalRevenue: data?.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) || 0,
                    averageOrderValue: data?.length > 0
                        ? data.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0) / data.length
                        : 0
                },
                error: null
            };
        } catch (error) {
            console.error('getDealerPerformance error:', error);
            return { data: null, error: error.message };
        }
    },

    /**
     * Satış raporu (siparişler)
     * @param {string} startDate - Başlangıç tarihi
     * @param {string} endDate - Bitiş tarihi
     * @param {string} dealerId - Bayi ID (opsiyonel)
     */
    async getSalesReport(startDate, endDate, dealerId) {
        try {
            let query = supabaseClient
                .from('orders')
                .select(`
                    id,
                    created_at,
                    status,
                    total_amount,
                    dealers(id, name)
                `)
                .order('created_at', { ascending: false });

            if (startDate) query = query.gte('created_at', startDate);
            if (endDate) query = query.lte('created_at', endDate);
            if (dealerId) query = query.eq('dealer_id', dealerId);

            const { data, error } = await query;
            if (error) throw error;

            return { data: data || [], error: null };
        } catch (error) {
            console.error('getSalesReport error:', error);
            return { data: [], error: error.message };
        }
    },

    /**
     * Tüm bayilerin performans raporu
     * @param {string} startDate - Başlangıç tarihi
     * @param {string} endDate - Bitiş tarihi
     */
    async getDealerPerformanceReport(startDate, endDate) {
        try {
            // Tüm bayileri al
            const { data: dealers, error: dealersError } = await supabaseClient
                .from('dealers')
                .select('id, name')
                .eq('is_active', true);

            if (dealersError) throw dealersError;

            // Siparişleri al
            let ordersQuery = supabaseClient
                .from('orders')
                .select('id, dealer_id, total_amount, status');

            if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
            if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate);

            const { data: orders, error: ordersError } = await ordersQuery;
            if (ordersError) throw ordersError;

            // Bayilere göre grupla
            const dealerStats = dealers?.map(dealer => {
                const dealerOrders = orders?.filter(o => o.dealer_id === dealer.id) || [];
                const completedOrders = dealerOrders.filter(o => o.status === 'completed');

                return {
                    id: dealer.id,
                    name: dealer.name,
                    total_orders: dealerOrders.length,
                    completed_orders: completedOrders.length,
                    total_amount: completedOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0)
                };
            }) || [];

            // Tutara göre sırala (en yüksek önce)
            dealerStats.sort((a, b) => b.total_amount - a.total_amount);

            return { data: dealerStats, error: null };
        } catch (error) {
            console.error('getDealerPerformanceReport error:', error);
            return { data: [], error: error.message };
        }
    },

    /**
     * Ürün satış raporu
     * @param {string} startDate - Başlangıç tarihi
     * @param {string} endDate - Bitiş tarihi
     * @param {string} dealerId - Bayi ID (opsiyonel)
     */
    async getProductSalesReport(startDate, endDate, dealerId) {
        try {
            // Önce siparişleri filtrele
            let ordersQuery = supabaseClient
                .from('orders')
                .select('id')
                .eq('status', 'completed');

            if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
            if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate);
            if (dealerId) ordersQuery = ordersQuery.eq('dealer_id', dealerId);

            const { data: orders, error: ordersError } = await ordersQuery;
            if (ordersError) throw ordersError;

            if (!orders || orders.length === 0) {
                return { data: [], error: null };
            }

            const orderIds = orders.map(o => o.id);

            // Sipariş kalemlerini çek
            const { data: items, error: itemsError } = await supabaseClient
                .from('order_items')
                .select(`
                    quantity,
                    total_price,
                    product:products(id, name, code)
                `)
                .in('order_id', orderIds);

            if (itemsError) throw itemsError;

            // Ürünlere göre grupla
            const productSales = {};
            items?.forEach(item => {
                const productId = item.product?.id;
                if (!productId) return;

                if (!productSales[productId]) {
                    productSales[productId] = {
                        product_id: productId,
                        product_name: item.product.name,
                        product_code: item.product.code,
                        total_quantity: 0,
                        total_amount: 0
                    };
                }
                productSales[productId].total_quantity += item.quantity || 0;
                productSales[productId].total_amount += parseFloat(item.total_price) || 0;
            });

            // Tutara göre sırala
            const result = Object.values(productSales).sort((a, b) => b.total_amount - a.total_amount);

            return { data: result, error: null };
        } catch (error) {
            console.error('getProductSalesReport error:', error);
            return { data: [], error: error.message };
        }
    },

    /**
     * İl listesini getir (dealers tablosundan benzersiz şehirler)
     */
    async getCities() {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('city')
                .eq('is_active', true);

            if (error) throw error;

            // Benzersiz şehirleri çıkar
            const uniqueCities = [...new Set(data?.map(d => d.city).filter(c => c))];
            const cities = uniqueCities.sort().map((name, index) => ({
                id: name,
                name: name
            }));

            return { data: cities, error: null };
        } catch (error) {
            console.error('getCities error:', error);
            return { data: [], error: error.message };
        }
    },

    /**
     * İl'e göre ilçe listesini getir
     * @param {string} cityId - İl adı (ID olarak kullanılıyor)
     */
    async getDistrictsByCity(cityId) {
        try {
            const { data, error } = await supabaseClient
                .from('dealers')
                .select('district')
                .eq('city', cityId)
                .eq('is_active', true);

            if (error) throw error;

            // Benzersiz ilçeleri çıkar
            const uniqueDistricts = [...new Set(data?.map(d => d.district).filter(d => d))];
            const districts = uniqueDistricts.sort().map((name, index) => ({
                id: name,
                name: name
            }));

            return { data: districts, error: null };
        } catch (error) {
            console.error('getDistrictsByCity error:', error);
            return { data: [], error: error.message };
        }
    },

    /**
     * Lokasyona göre bayi listesini getir
     * @param {string} cityName - İl adı
     * @param {string} districtName - İlçe adı (opsiyonel)
     */
    async getDealersByLocation(cityName, districtName) {
        try {
            let query = supabaseClient
                .from('dealers')
                .select('id, name')
                .eq('is_active', true);

            if (cityName) query = query.eq('city', cityName);
            if (districtName) query = query.eq('district', districtName);

            const { data, error } = await query.order('name');

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('getDealersByLocation error:', error);
            return { data: [], error: error.message };
        }
    },

    /**
     * Bu ayın tarih aralığını döndür (sync)
     */
    getCurrentMonthRange() {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    },

    /**
     * Geçen ayın tarih aralığını döndür (sync)
     */
    getPreviousMonthRange() {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0);

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    },

    /**
     * Toplam satış tonajını hesapla
     * @param {Object} filters - { dealerIds, startDate, endDate }
     */
    async getSalesTonnage(filters = {}) {
        try {
            const { dealerIds, startDate, endDate } = filters;

            // Önce siparişleri filtrele
            let ordersQuery = supabaseClient
                .from('orders')
                .select('id')
                .eq('status', 'completed');

            if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
            if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate + 'T23:59:59');
            if (dealerIds && dealerIds.length > 0) {
                ordersQuery = ordersQuery.in('dealer_id', dealerIds);
            }

            const { data: orders, error: ordersError } = await ordersQuery;
            if (ordersError) throw ordersError;

            if (!orders || orders.length === 0) {
                return { data: { totalTonnage: 0 }, error: null };
            }

            const orderIds = orders.map(o => o.id);

            // Sipariş kalemlerini çek
            const { data: items, error: itemsError } = await supabaseClient
                .from('order_items')
                .select('quantity, product:products(weight_kg)')
                .in('order_id', orderIds);

            if (itemsError) throw itemsError;

            // Toplam tonajı hesapla (kg to ton)
            let totalTonnage = 0;
            items?.forEach(item => {
                const weight = parseFloat(item.product?.weight_kg) || 0;
                const quantity = item.quantity || 0;
                totalTonnage += (weight * quantity) / 1000; // kg to ton
            });

            return { data: { totalTonnage }, error: null };
        } catch (error) {
            console.error('getSalesTonnage error:', error);
            return { data: { totalTonnage: 0 }, error: error.message };
        }
    },

    /**
     * Ürün bazlı satış adetlerini getir
     * @param {Object} filters - { dealerIds, startDate, endDate }
     */
    async getProductSales(filters = {}) {
        try {
            const { dealerIds, startDate, endDate } = filters;

            // Önce siparişleri filtrele
            let ordersQuery = supabaseClient
                .from('orders')
                .select('id')
                .eq('status', 'completed');

            if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
            if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate + 'T23:59:59');
            if (dealerIds && dealerIds.length > 0) {
                ordersQuery = ordersQuery.in('dealer_id', dealerIds);
            }

            const { data: orders, error: ordersError } = await ordersQuery;
            if (ordersError) throw ordersError;

            if (!orders || orders.length === 0) {
                return { data: [], error: null };
            }

            const orderIds = orders.map(o => o.id);

            // Sipariş kalemlerini çek
            const { data: items, error: itemsError } = await supabaseClient
                .from('order_items')
                .select('quantity, product:products(id, name, code, category)')
                .in('order_id', orderIds);

            if (itemsError) throw itemsError;

            // Ürünlere göre grupla
            const productMap = {};
            items?.forEach(item => {
                const product = item.product;
                if (!product?.id) return;

                if (!productMap[product.id]) {
                    productMap[product.id] = {
                        id: product.id,
                        name: product.name,
                        code: product.code,
                        category: product.category,
                        quantity: 0
                    };
                }
                productMap[product.id].quantity += item.quantity || 0;
            });

            const result = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
            return { data: result, error: null };
        } catch (error) {
            console.error('getProductSales error:', error);
            return { data: [], error: error.message };
        }
    },

    /**
     * Sipariş adetlerini hesapla
     * @param {Object} filters - { dealerIds, startDate, endDate }
     */
    async getOrderCounts(filters = {}) {
        try {
            const { dealerIds, startDate, endDate } = filters;

            let query = supabaseClient
                .from('orders')
                .select('id, status');

            if (startDate) query = query.gte('created_at', startDate);
            if (endDate) query = query.lte('created_at', endDate + 'T23:59:59');
            if (dealerIds && dealerIds.length > 0) {
                query = query.in('dealer_id', dealerIds);
            }

            const { data, error } = await query;
            if (error) throw error;

            return {
                data: {
                    total: data?.length || 0,
                    completed: data?.filter(o => o.status === 'completed').length || 0,
                    pending: data?.filter(o => o.status === 'pending').length || 0
                },
                error: null
            };
        } catch (error) {
            console.error('getOrderCounts error:', error);
            return { data: { total: 0, completed: 0, pending: 0 }, error: error.message };
        }
    },

    /**
     * Aktif rutin sipariş sayısını getir
     * @param {Object} filters - { dealerIds }
     */
    async getRecurringOrderCounts(filters = {}) {
        try {
            const { dealerIds } = filters;

            // recurring_orders tablosu yoksa veya farklı yapıdaysa hata vermemesi için
            let query = supabaseClient
                .from('recurring_orders')
                .select('id')
                .eq('status', 'active');

            if (dealerIds && dealerIds.length > 0) {
                query = query.in('dealer_id', dealerIds);
            }

            const { data, error } = await query;

            // Tablo yoksa veya kolon yoksa 0 döndür
            if (error) {
                console.warn('recurring_orders query failed, returning 0:', error.message);
                return { data: { active: 0 }, error: null };
            }

            return {
                data: { active: data?.length || 0 },
                error: null
            };
        } catch (error) {
            console.error('getRecurringOrderCounts error:', error);
            return { data: { active: 0 }, error: null };
        }
    },

    /**
     * Bayi bazlı satış verileri (grafik için)
     * @param {Object} filters - { dealerIds, startDate, endDate }
     */
    async getDealerSalesData(filters = {}) {
        try {
            const { dealerIds, startDate, endDate } = filters;

            // Bayileri çek
            let dealersQuery = supabaseClient
                .from('dealers')
                .select('id, name')
                .eq('is_active', true);

            if (dealerIds && dealerIds.length > 0) {
                dealersQuery = dealersQuery.in('id', dealerIds);
            }

            const { data: dealers, error: dealersError } = await dealersQuery;
            if (dealersError) throw dealersError;

            if (!dealers || dealers.length === 0) {
                return { data: [], error: null };
            }

            // Siparişleri çek
            let ordersQuery = supabaseClient
                .from('orders')
                .select('id, dealer_id')
                .eq('status', 'completed');

            if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
            if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate + 'T23:59:59');
            if (dealerIds && dealerIds.length > 0) {
                ordersQuery = ordersQuery.in('dealer_id', dealerIds);
            }

            const { data: orders, error: ordersError } = await ordersQuery;
            if (ordersError) throw ordersError;

            if (!orders || orders.length === 0) {
                return { data: [], error: null };
            }

            const orderIds = orders.map(o => o.id);

            // Sipariş kalemlerini çek
            const { data: items, error: itemsError } = await supabaseClient
                .from('order_items')
                .select('order_id, quantity, product:products(weight_kg)')
                .in('order_id', orderIds);

            if (itemsError) throw itemsError;

            // Sipariş -> Bayi mapping
            const orderDealerMap = {};
            orders.forEach(o => { orderDealerMap[o.id] = o.dealer_id; });

            // Bayi bazlı gruplama
            const dealerStats = {};
            dealers.forEach(d => {
                dealerStats[d.id] = { dealerName: d.name, tonnage: 0, quantity: 0 };
            });

            items?.forEach(item => {
                const dealerId = orderDealerMap[item.order_id];
                if (!dealerId || !dealerStats[dealerId]) return;

                const weight = parseFloat(item.product?.weight_kg) || 0;
                const qty = item.quantity || 0;
                dealerStats[dealerId].tonnage += (weight * qty) / 1000;
                dealerStats[dealerId].quantity += qty;
            });

            const result = Object.values(dealerStats)
                .filter(d => d.tonnage > 0 || d.quantity > 0)
                .sort((a, b) => b.tonnage - a.tonnage);

            return { data: result, error: null };
        } catch (error) {
            console.error('getDealerSalesData error:', error);
            return { data: [], error: error.message };
        }
    },

    /**
     * İl bazlı satış verileri (grafik için)
     * @param {Object} filters - { startDate, endDate }
     */
    async getCitySalesData(filters = {}) {
        try {
            const { startDate, endDate } = filters;

            // Bayileri şehirleriyle birlikte çek
            const { data: dealers, error: dealersError } = await supabaseClient
                .from('dealers')
                .select('id, city')
                .eq('is_active', true);

            if (dealersError) throw dealersError;

            if (!dealers || dealers.length === 0) {
                return { data: [], error: null };
            }

            const dealerCityMap = {};
            dealers.forEach(d => { dealerCityMap[d.id] = d.city; });

            // Siparişleri çek
            let ordersQuery = supabaseClient
                .from('orders')
                .select('id, dealer_id')
                .eq('status', 'completed');

            if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
            if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate + 'T23:59:59');

            const { data: orders, error: ordersError } = await ordersQuery;
            if (ordersError) throw ordersError;

            if (!orders || orders.length === 0) {
                return { data: [], error: null };
            }

            const orderIds = orders.map(o => o.id);

            // Sipariş kalemlerini çek
            const { data: items, error: itemsError } = await supabaseClient
                .from('order_items')
                .select('order_id, quantity, product:products(weight_kg)')
                .in('order_id', orderIds);

            if (itemsError) throw itemsError;

            // Sipariş -> Bayi mapping
            const orderDealerMap = {};
            orders.forEach(o => { orderDealerMap[o.id] = o.dealer_id; });

            // Şehir bazlı gruplama
            const cityStats = {};
            items?.forEach(item => {
                const dealerId = orderDealerMap[item.order_id];
                const city = dealerCityMap[dealerId];
                if (!city) return;

                if (!cityStats[city]) {
                    cityStats[city] = { name: city, tonnage: 0, quantity: 0 };
                }

                const weight = parseFloat(item.product?.weight_kg) || 0;
                const qty = item.quantity || 0;
                cityStats[city].tonnage += (weight * qty) / 1000;
                cityStats[city].quantity += qty;
            });

            const result = Object.values(cityStats).sort((a, b) => b.tonnage - a.tonnage);
            return { data: result, error: null };
        } catch (error) {
            console.error('getCitySalesData error:', error);
            return { data: [], error: error.message };
        }
    },

    /**
     * İlçe bazlı satış verileri (grafik için)
     * @param {Object} filters - { cityName, startDate, endDate }
     */
    async getDistrictSalesData(filters = {}) {
        try {
            const { cityName, startDate, endDate } = filters;

            if (!cityName) {
                return { data: [], error: 'cityName is required' };
            }

            // Belirli şehirdeki bayileri çek
            const { data: dealers, error: dealersError } = await supabaseClient
                .from('dealers')
                .select('id, district')
                .eq('city', cityName)
                .eq('is_active', true);

            if (dealersError) throw dealersError;

            if (!dealers || dealers.length === 0) {
                return { data: [], error: null };
            }

            const dealerDistrictMap = {};
            const dealerIds = [];
            dealers.forEach(d => {
                dealerDistrictMap[d.id] = d.district;
                dealerIds.push(d.id);
            });

            // Siparişleri çek
            let ordersQuery = supabaseClient
                .from('orders')
                .select('id, dealer_id')
                .eq('status', 'completed')
                .in('dealer_id', dealerIds);

            if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
            if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate + 'T23:59:59');

            const { data: orders, error: ordersError } = await ordersQuery;
            if (ordersError) throw ordersError;

            if (!orders || orders.length === 0) {
                return { data: [], error: null };
            }

            const orderIds = orders.map(o => o.id);

            // Sipariş kalemlerini çek
            const { data: items, error: itemsError } = await supabaseClient
                .from('order_items')
                .select('order_id, quantity, product:products(weight_kg)')
                .in('order_id', orderIds);

            if (itemsError) throw itemsError;

            // Sipariş -> Bayi mapping
            const orderDealerMap = {};
            orders.forEach(o => { orderDealerMap[o.id] = o.dealer_id; });

            // İlçe bazlı gruplama
            const districtStats = {};
            items?.forEach(item => {
                const dealerId = orderDealerMap[item.order_id];
                const district = dealerDistrictMap[dealerId];
                if (!district) return;

                if (!districtStats[district]) {
                    districtStats[district] = { name: district, tonnage: 0, quantity: 0 };
                }

                const weight = parseFloat(item.product?.weight_kg) || 0;
                const qty = item.quantity || 0;
                districtStats[district].tonnage += (weight * qty) / 1000;
                districtStats[district].quantity += qty;
            });

            const result = Object.values(districtStats).sort((a, b) => b.tonnage - a.tonnage);
            return { data: result, error: null };
        } catch (error) {
            console.error('getDistrictSalesData error:', error);
            return { data: [], error: error.message };
        }
    }
};

// Global erişim için
window.ReportsService = ReportsService;
