/**
 * Points Service
 * Musteri puan yonetimi servisi
 */

const PointsService = {
    /**
     * Siparis tamamlandiginda puan hesapla ve kaydet
     * @param {string} orderId - Siparis ID
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async awardPointsForOrder(orderId) {
        try {
            // Siparis bilgilerini al - sube dahil
            const { data: order, error: orderError } = await supabaseClient
                .from('orders')
                .select(`
                    id,
                    customer_id,
                    customer_branch_id,
                    dealer_id,
                    total_points,
                    order_items(
                        id,
                        quantity,
                        points,
                        product:products(id, name, points_per_unit)
                    )
                `)
                .eq('id', orderId)
                .single();

            if (orderError) {
                console.error('Order fetch error:', orderError);
                return { data: null, error: orderError };
            }

            if (!order || !order.customer_id) {
                return { data: null, error: { message: 'Siparis bulunamadi' } };
            }

            // Bu siparis icin zaten puan verilmis mi kontrol et
            const { data: existingPoints } = await supabaseClient
                .from('customer_points')
                .select('id')
                .eq('order_id', orderId)
                .single();

            if (existingPoints) {
                // Zaten puan verilmis, hata donme
                return { data: existingPoints, error: null };
            }

            // Toplam puani hesapla
            let totalPoints = 0;
            if (order.order_items && order.order_items.length > 0) {
                order.order_items.forEach(function(item) {
                    // Eger item.points zaten hesaplanmissa onu kullan
                    if (item.points && item.points > 0) {
                        totalPoints += item.points;
                    } else if (item.product && item.product.points_per_unit) {
                        // Yoksa urun bazli hesapla
                        totalPoints += item.quantity * item.product.points_per_unit;
                    }
                });
            } else if (order.total_points && order.total_points > 0) {
                // order_items yoksa total_points kullan
                totalPoints = order.total_points;
            }

            // Puan 0 ise kayit olusturma
            if (totalPoints <= 0) {
                return { data: null, error: null };
            }

            // Sube tercihini kontrol et
            var targetBranchId = null; // Varsayilan: ana musteri hesabi

            if (order.customer_branch_id) {
                // Subenin puan toplama tercihini sorgula
                const { data: branch } = await supabaseClient
                    .from('customer_branches')
                    .select('id, points_collection_mode')
                    .eq('id', order.customer_branch_id)
                    .single();

                if (branch && branch.points_collection_mode === 'branch') {
                    // Puanlar bu subede toplanacak
                    targetBranchId = branch.id;
                }
                // else: 'customer' veya null ise ana hesapta toplanir
            }

            // Puan kaydini olustur
            const { data: pointRecord, error: pointError } = await supabaseClient
                .from('customer_points')
                .insert([{
                    customer_id: order.customer_id,
                    customer_branch_id: targetBranchId,
                    order_id: orderId,
                    dealer_id: order.dealer_id,
                    points: totalPoints,
                    description: 'Siparis teslimi'
                }])
                .select()
                .single();

            if (pointError) {
                console.error('Point insert error:', pointError);
                return { data: null, error: pointError };
            }

            return { data: pointRecord, error: null };
        } catch (error) {
            console.error('Award points error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Musterinin toplam puanini getir
     * @param {string} customerId - Musteri ID
     * @returns {Promise<{totalPoints: number, error: Object|null}>}
     */
    async getCustomerTotalPoints(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_points')
                .select('points')
                .eq('customer_id', customerId);

            if (error) {
                console.error('Get total points error:', error);
                return { totalPoints: 0, error };
            }

            var totalPoints = 0;
            if (data && data.length > 0) {
                data.forEach(function(record) {
                    totalPoints += record.points || 0;
                });
            }

            return { totalPoints, error: null };
        } catch (error) {
            console.error('Get total points error:', error);
            return { totalPoints: 0, error: { message: error.message } };
        }
    },

    /**
     * Musterinin puan gecmisini getir (sayfalamali)
     * @param {string} customerId - Musteri ID
     * @param {number} page - Sayfa numarasi (1'den baslar)
     * @param {number} limit - Sayfa basi kayit sayisi
     * @returns {Promise<{data: Array, total: number, error: Object|null}>}
     */
    async getCustomerPointsHistory(customerId, page, limit) {
        page = page || 1;
        limit = limit || 20;

        try {
            // Toplam kayit sayisini al
            const { count, error: countError } = await supabaseClient
                .from('customer_points')
                .select('id', { count: 'exact', head: true })
                .eq('customer_id', customerId);

            if (countError) {
                return { data: [], total: 0, error: countError };
            }

            // Sayfalanmis verileri al
            var from = (page - 1) * limit;
            var to = from + limit - 1;

            const { data, error } = await supabaseClient
                .from('customer_points')
                .select(`
                    id,
                    points,
                    description,
                    created_at,
                    order:orders(id, order_number, total_amount),
                    dealer:dealers(id, name)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) {
                return { data: [], total: 0, error };
            }

            return { data: data || [], total: count || 0, error: null };
        } catch (error) {
            console.error('Get points history error:', error);
            return { data: [], total: 0, error: { message: error.message } };
        }
    },

    /**
     * Siparisin puan detayini getir
     * @param {string} orderId - Siparis ID
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async getOrderPointsDetail(orderId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_points')
                .select(`
                    id,
                    points,
                    description,
                    created_at,
                    customer:customers(id, name),
                    order:orders(id, order_number, total_amount),
                    dealer:dealers(id, name)
                `)
                .eq('order_id', orderId)
                .single();

            return { data, error };
        } catch (error) {
            console.error('Get order points detail error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Musterinin son puan kazanimini getir
     * @param {string} customerId - Musteri ID
     * @returns {Promise<{data: Object|null, error: Object|null}>}
     */
    async getLastPointEarning(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_points')
                .select(`
                    id,
                    points,
                    created_at,
                    dealer:dealers(id, name)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return { data, error };
        } catch (error) {
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Musterinin puan ozeti (toplam, siparis sayisi, ortalama)
     * @param {string} customerId - Musteri ID
     * @returns {Promise<{data: Object, error: Object|null}>}
     */
    async getCustomerPointsSummary(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_points')
                .select('points')
                .eq('customer_id', customerId);

            if (error) {
                return { data: { totalPoints: 0, orderCount: 0, avgPoints: 0 }, error };
            }

            var totalPoints = 0;
            var orderCount = data ? data.length : 0;

            if (data && data.length > 0) {
                data.forEach(function(record) {
                    totalPoints += record.points || 0;
                });
            }

            var avgPoints = orderCount > 0 ? Math.round(totalPoints / orderCount) : 0;

            return {
                data: {
                    totalPoints: totalPoints,
                    orderCount: orderCount,
                    avgPoints: avgPoints
                },
                error: null
            };
        } catch (error) {
            console.error('Get points summary error:', error);
            return {
                data: { totalPoints: 0, orderCount: 0, avgPoints: 0 },
                error: { message: error.message }
            };
        }
    },

    /**
     * Backoffice: Tum musterilerin puan listesi
     * @param {Object} filters - Filtreler (dealerId, search, limit, offset)
     * @returns {Promise<{data: Array, error: Object|null}>}
     */
    async getCustomersWithPoints(filters) {
        filters = filters || {};

        try {
            // customers tablosundan customer_points ile join yaparak getir
            var query = supabaseClient
                .from('customers')
                .select(`
                    id,
                    name,
                    company_name,
                    phone,
                    customer_points(points)
                `)
                .eq('is_active', true);

            if (filters.dealerId) {
                query = query.eq('dealer_id', filters.dealerId);
            }

            if (filters.search) {
                query = query.or('name.ilike.%' + filters.search + '%,company_name.ilike.%' + filters.search + '%');
            }

            query = query.order('name', { ascending: true });

            if (filters.limit) {
                query = query.limit(filters.limit);
            }

            if (filters.offset) {
                query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
            }

            const { data, error } = await query;

            if (error) {
                return { data: [], error };
            }

            // Toplam puanlari hesapla
            var result = (data || []).map(function(customer) {
                var totalPoints = 0;
                if (customer.customer_points && customer.customer_points.length > 0) {
                    customer.customer_points.forEach(function(p) {
                        totalPoints += p.points || 0;
                    });
                }
                return {
                    id: customer.id,
                    name: customer.name,
                    company_name: customer.company_name,
                    phone: customer.phone,
                    totalPoints: totalPoints
                };
            });

            // Puani olan musterileri one al
            result.sort(function(a, b) {
                return b.totalPoints - a.totalPoints;
            });

            return { data: result, error: null };
        } catch (error) {
            console.error('Get customers with points error:', error);
            return { data: [], error: { message: error.message } };
        }
    },

    /**
     * Subenin toplam puanini getir
     * @param {string} branchId - Sube ID
     * @returns {Promise<{totalPoints: number, error: Object|null}>}
     */
    async getBranchTotalPoints(branchId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_points')
                .select('points')
                .eq('customer_branch_id', branchId);

            if (error) {
                return { totalPoints: 0, error };
            }

            var totalPoints = 0;
            if (data && data.length > 0) {
                data.forEach(function(record) {
                    totalPoints += record.points || 0;
                });
            }

            return { totalPoints, error: null };
        } catch (error) {
            return { totalPoints: 0, error: { message: error.message } };
        }
    },

    /**
     * Musterinin ana hesabindaki puanlarini getir (sube bazli olmayanlar)
     * @param {string} customerId - Musteri ID
     * @returns {Promise<{totalPoints: number, error: Object|null}>}
     */
    async getCustomerMainAccountPoints(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_points')
                .select('points')
                .eq('customer_id', customerId)
                .is('customer_branch_id', null);

            if (error) {
                return { totalPoints: 0, error };
            }

            var totalPoints = 0;
            if (data && data.length > 0) {
                data.forEach(function(record) {
                    totalPoints += record.points || 0;
                });
            }

            return { totalPoints, error: null };
        } catch (error) {
            return { totalPoints: 0, error: { message: error.message } };
        }
    },

    /**
     * Musterinin tum puanlarini sube bazli ozet olarak getir
     * @param {string} customerId - Musteri ID
     * @returns {Promise<{data: Object, error: Object|null}>}
     */
    async getCustomerPointsBreakdown(customerId) {
        try {
            const { data: points, error } = await supabaseClient
                .from('customer_points')
                .select(`
                    points,
                    customer_branch_id,
                    branch:customer_branches(id, branch_name)
                `)
                .eq('customer_id', customerId);

            if (error) {
                return { data: null, error };
            }

            // Grupla: ana hesap ve subeler
            var breakdown = {
                mainAccount: 0,
                branches: {}
            };

            (points || []).forEach(function(p) {
                if (p.customer_branch_id === null) {
                    breakdown.mainAccount += p.points || 0;
                } else {
                    var branchId = p.customer_branch_id;
                    if (!breakdown.branches[branchId]) {
                        breakdown.branches[branchId] = {
                            branchName: p.branch ? p.branch.branch_name : 'Bilinmeyen Sube',
                            totalPoints: 0
                        };
                    }
                    breakdown.branches[branchId].totalPoints += p.points || 0;
                }
            });

            return { data: breakdown, error: null };
        } catch (error) {
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Aya gore puan gecmisi (gruplu)
     * @param {string} customerId - Musteri ID
     * @returns {Promise<{data: Object, error: Object|null}>}
     */
    async getPointsHistoryGroupedByMonth(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_points')
                .select(`
                    id,
                    points,
                    description,
                    created_at,
                    order:orders(id, order_number),
                    dealer:dealers(id, name)
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) {
                return { data: {}, error };
            }

            // Aya gore grupla
            var grouped = {};
            (data || []).forEach(function(record) {
                var date = new Date(record.created_at);
                var monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
                var monthName = date.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

                if (!grouped[monthKey]) {
                    grouped[monthKey] = {
                        monthName: monthName,
                        records: []
                    };
                }
                grouped[monthKey].records.push(record);
            });

            return { data: grouped, error: null };
        } catch (error) {
            console.error('Get grouped history error:', error);
            return { data: {}, error: { message: error.message } };
        }
    }
};

// Global erisim
window.PointsService = PointsService;
