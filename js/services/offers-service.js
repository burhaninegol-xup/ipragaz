/**
 * Offers Service
 * Teklif CRUD islemleri
 */

const OffersService = {
    /**
     * Yeni teklif olustur (offer + offer_details)
     */
    async create(offerData, offerDetails) {
        try {
            // Oncelikle teklifi olustur
            const { data: offer, error: offerError } = await supabaseClient
                .from('offers')
                .insert([offerData])
                .select()
                .single();

            if (offerError) throw offerError;

            // Teklif detaylarini ekle
            if (offerDetails && offerDetails.length > 0) {
                const detailsWithOfferId = offerDetails.map(detail => ({
                    ...detail,
                    offer_id: offer.id
                }));

                const { data: details, error: detailsError } = await supabaseClient
                    .from('offer_details')
                    .insert(detailsWithOfferId)
                    .select();

                if (detailsError) throw detailsError;
                return { data: { ...offer, details }, error: null };
            }

            return { data: offer, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.create');
        }
    },

    /**
     * ID ile teklif getir
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('offers')
                .select(`
                    *,
                    customer:customers(id, name, vkn, company_name, phone, email, address, is_active),
                    dealer:dealers(id, name, code),
                    branch:customer_branches(id, branch_name, city, district, full_address),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        this_month_quantity,
                        last_month_quantity,
                        product:products(id, code, name, base_price, image_url, weight_kg)
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getById');
        }
    },

    /**
     * Bayi tekliflerini getir
     */
    async getByDealerId(dealerId, filters = {}) {
        try {
            let query = supabaseClient
                .from('offers')
                .select(`
                    *,
                    customer:customers(id, name, vkn, company_name, phone, is_active),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        this_month_quantity,
                        last_month_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('dealer_id', dealerId);

            // Status filtresi
            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getByDealerId');
        }
    },

    /**
     * Musteri tekliflerini getir
     */
    async getByCustomerId(customerId, filters = {}) {
        try {
            let query = supabaseClient
                .from('offers')
                .select(`
                    *,
                    dealer:dealers(id, name, code, city, district),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('customer_id', customerId);

            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getByCustomerId');
        }
    },

    /**
     * Bayi ve musteri icin kabul edilmis teklifi getir (aktif iliski)
     */
    async getAcceptedOffer(dealerId, customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('offers')
                .select(`
                    *,
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        this_month_quantity,
                        last_month_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('dealer_id', dealerId)
                .eq('customer_id', customerId)
                .eq('status', 'accepted')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return { data: data || null, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getAcceptedOffer');
        }
    },

    /**
     * Teklif durumunu guncelle
     */
    async updateStatus(offerId, status) {
        try {
            const { data, error } = await supabaseClient
                .from('offers')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', offerId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.updateStatus');
        }
    },

    /**
     * Teklifi kabul et
     */
    async accept(offerId) {
        return this.updateStatus(offerId, 'accepted');
    },

    /**
     * Teklifi reddet
     */
    async reject(offerId) {
        return this.updateStatus(offerId, 'rejected');
    },

    /**
     * Teklifi iptal et
     */
    async cancel(offerId) {
        return this.updateStatus(offerId, 'cancelled');
    },

    /**
     * Teklif guncelle (notes vb.)
     */
    async update(offerId, updateData) {
        try {
            const { data, error } = await supabaseClient
                .from('offers')
                .update({ ...updateData, updated_at: new Date().toISOString() })
                .eq('id', offerId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.update');
        }
    },

    /**
     * Teklif detaylarini guncelle
     */
    async updateDetails(offerId, offerDetails) {
        try {
            // Mevcut detaylari sil
            const { error: deleteError } = await supabaseClient
                .from('offer_details')
                .delete()
                .eq('offer_id', offerId);

            if (deleteError) throw deleteError;

            // Yeni detaylari ekle
            if (offerDetails && offerDetails.length > 0) {
                const detailsWithOfferId = offerDetails.map(detail => ({
                    ...detail,
                    offer_id: offerId
                }));

                const { data, error } = await supabaseClient
                    .from('offer_details')
                    .insert(detailsWithOfferId)
                    .select();

                if (error) throw error;
                return { data, error: null };
            }

            return { data: [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.updateDetails');
        }
    },

    /**
     * Bayinin kabul edilmis teklifleri olan musterilerini getir
     */
    async getCustomersWithAcceptedOffers(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('offers')
                .select(`
                    id,
                    status,
                    created_at,
                    customer:customers(
                        id,
                        vkn,
                        name,
                        company_name,
                        phone,
                        email,
                        is_active
                    ),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        this_month_quantity,
                        last_month_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('dealer_id', dealerId)
                .eq('status', 'accepted')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getCustomersWithAcceptedOffers');
        }
    },

    /**
     * Teklif sayilarini getir (istatistik icin)
     */
    async getCounts(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('offers')
                .select('status')
                .eq('dealer_id', dealerId);

            if (error) throw error;

            const counts = {
                total: data.length,
                pending: data.filter(o => o.status === 'pending').length,
                accepted: data.filter(o => o.status === 'accepted').length,
                rejected: data.filter(o => o.status === 'rejected').length,
                cancelled: data.filter(o => o.status === 'cancelled').length
            };

            return { data: counts, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getCounts');
        }
    },

    /**
     * Teklifi sil
     */
    async delete(offerId) {
        try {
            const { error } = await supabaseClient
                .from('offers')
                .delete()
                .eq('id', offerId);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.delete');
        }
    },

    /**
     * VKN ile müşterinin başka bayilerle aktif teklifi var mı kontrol et
     * Aktif teklif = pending veya accepted durumunda olan teklif
     */
    async hasActiveOfferWithOtherDealer(vkn, currentDealerId) {
        try {
            // Önce VKN ile müşteriyi bul
            const { data: customer, error: customerError } = await supabaseClient
                .from('customers')
                .select('id')
                .eq('vkn', vkn)
                .maybeSingle();

            if (customerError) throw customerError;
            if (!customer) return { data: { hasOffer: false }, error: null };

            // Müşterinin başka bayilerle aktif teklifi var mı kontrol et
            const { data: offers, error: offersError } = await supabaseClient
                .from('offers')
                .select(`
                    id,
                    status,
                    dealer:dealers(id, name, code)
                `)
                .eq('customer_id', customer.id)
                .neq('dealer_id', currentDealerId)
                .in('status', ['pending', 'accepted']);

            if (offersError) throw offersError;

            if (offers && offers.length > 0) {
                return {
                    data: {
                        hasOffer: true,
                        dealerName: offers[0].dealer?.name || 'Başka bayi'
                    },
                    error: null
                };
            }

            return { data: { hasOffer: false }, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.hasActiveOfferWithOtherDealer');
        }
    },

    /**
     * Bayinin tum tekliflerini getir (tum statusler dahil)
     */
    async getAllOffersByDealerId(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('offers')
                .select(`
                    id,
                    status,
                    created_at,
                    updated_at,
                    notes,
                    customer:customers(
                        id,
                        vkn,
                        name,
                        company_name,
                        phone,
                        email,
                        is_active
                    ),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        this_month_quantity,
                        last_month_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('dealer_id', dealerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getAllOffersByDealerId');
        }
    },

    /**
     * Musterinin en son teklifini getir (aktif teklifler oncelikli)
     * Oncelik: Aktif teklif (requested, pending, accepted, passive) > cancelled/rejected
     */
    async getLatestOfferByCustomerId(customerId) {
        try {
            // 1. Önce aktif teklif ara (cancelled/rejected dışında)
            const { data: activeOffer, error: activeError } = await supabaseClient
                .from('offers')
                .select(`
                    *,
                    dealer:dealers(id, name, code, city, district, phone),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('customer_id', customerId)
                .not('status', 'in', '("cancelled","rejected")')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (activeError) throw activeError;

            // Aktif teklif varsa döndür
            if (activeOffer) {
                return { data: activeOffer, error: null };
            }

            // 2. Aktif teklif yoksa, en son cancelled/rejected teklifi getir
            const { data: lastOffer, error: lastError } = await supabaseClient
                .from('offers')
                .select(`
                    *,
                    dealer:dealers(id, name, code, city, district, phone),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (lastError) throw lastError;
            return { data: lastOffer || null, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getLatestOfferByCustomerId');
        }
    },

    /**
     * Bayi ve musteri icin en son teklifi getir
     * Oncelik: Aktif teklif (requested, pending, accepted, passive) > cancelled/rejected
     */
    async getLatestOfferForDealerCustomer(dealerId, customerId) {
        try {
            // 1. Önce aktif teklif ara (cancelled/rejected dışında)
            const { data: activeOffer, error: activeError } = await supabaseClient
                .from('offers')
                .select(`
                    *,
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        this_month_quantity,
                        last_month_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('dealer_id', dealerId)
                .eq('customer_id', customerId)
                .not('status', 'in', '("cancelled","rejected")')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (activeError) throw activeError;

            // Aktif teklif varsa döndür
            if (activeOffer) {
                return { data: activeOffer, error: null };
            }

            // 2. Aktif teklif yoksa, en son cancelled/rejected teklifi getir
            // Bu durumda bayi yeni teklif oluşturabilir
            const { data: lastOffer, error: lastError } = await supabaseClient
                .from('offers')
                .select(`
                    *,
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        this_month_quantity,
                        last_month_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('dealer_id', dealerId)
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (lastError) throw lastError;
            return { data: lastOffer || null, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getLatestOfferForDealerCustomer');
        }
    },

    /**
     * Bayinin tekliflerini sayfalı olarak getir
     * @param {string} dealerId - Bayi ID
     * @param {object} options - Sayfalama ve filtreleme seçenekleri
     * @param {number} options.page - Sayfa numarası (0 tabanlı)
     * @param {number} options.pageSize - Sayfa başına kayıt sayısı
     * @param {string} options.status - Tek bir status filtresi (opsiyonel)
     * @param {array} options.excludeStatus - Hariç tutulacak statusler (opsiyonel)
     * @param {array} options.includeStatus - Dahil edilecek statusler (opsiyonel)
     * @param {string} options.search - Arama terimi (opsiyonel)
     */
    async getPaginatedOffersByDealerId(dealerId, options = {}) {
        try {
            const {
                page = 0,
                pageSize = 20,
                status = null,
                excludeStatus = null,
                includeStatus = null,
                search = ''
            } = options;

            const from = page * pageSize;
            const to = from + pageSize - 1;

            let query = supabaseClient
                .from('offers')
                .select(`
                    id,
                    status,
                    created_at,
                    updated_at,
                    notes,
                    customer_branch_id,
                    customer:customers(
                        id,
                        vkn,
                        name,
                        company_name,
                        phone,
                        email,
                        is_active
                    ),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        this_month_quantity,
                        last_month_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `, { count: 'exact' })
                .eq('dealer_id', dealerId);

            // Status filtreleri
            if (status) {
                query = query.eq('status', status);
            } else if (includeStatus && includeStatus.length > 0) {
                query = query.in('status', includeStatus);
            } else if (excludeStatus && excludeStatus.length > 0) {
                excludeStatus.forEach(s => {
                    query = query.neq('status', s);
                });
            }

            query = query
                .order('created_at', { ascending: false })
                .range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            return {
                data,
                error: null,
                totalCount: count,
                totalPages: Math.ceil(count / pageSize),
                currentPage: page,
                pageSize
            };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getPaginatedOffersByDealerId');
        }
    },

    /**
     * Bayinin teklif sayılarını status bazında getir
     * @param {string} dealerId - Bayi ID
     */
    async getOffersCountByStatus(dealerId) {
        try {
            // Tek sorguda tüm status'ları al
            const { data, error } = await supabaseClient
                .from('offers')
                .select('status')
                .eq('dealer_id', dealerId);

            if (error) throw error;

            const counts = {
                requested: 0,
                pending: 0,
                accepted: 0,
                rejected: 0,
                cancelled: 0,
                passive: 0
            };

            // Sayıları hesapla
            data.forEach(offer => {
                if (counts[offer.status] !== undefined) {
                    counts[offer.status]++;
                }
            });

            // "Tümü" = toplam - rejected - cancelled
            const total = data.length;
            counts.all = total - counts.rejected - counts.cancelled;

            return { data: counts, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getOffersCountByStatus');
        }
    },

    // ==========================================
    // SUBE BAZLI TEKLIF METODLARI
    // ==========================================

    /**
     * Belirli bir sube icin kabul edilmis teklifi getir
     * Siparis verirken fiyat kontrolu icin kullanilir
     */
    async getAcceptedOfferForBranch(dealerId, customerId, branchId) {
        try {
            const { data, error } = await supabaseClient
                .from('offers')
                .select(`
                    *,
                    branch:customer_branches(id, branch_name, city, district),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('dealer_id', dealerId)
                .eq('customer_id', customerId)
                .eq('customer_branch_id', branchId)
                .eq('status', 'accepted')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            return { data: data || null, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getAcceptedOfferForBranch');
        }
    },

    /**
     * Musterinin belirli bir subesi icin tum teklifleri getir
     */
    async getByBranchId(customerId, branchId, filters = {}) {
        try {
            let query = supabaseClient
                .from('offers')
                .select(`
                    *,
                    dealer:dealers(id, name, code, city, district, phone),
                    branch:customer_branches(id, branch_name),
                    offer_details(
                        id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        product:products(id, code, name, base_price, image_url)
                    )
                `)
                .eq('customer_id', customerId)
                .eq('customer_branch_id', branchId);

            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            query = query.order('created_at', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getByBranchId');
        }
    },

    /**
     * Bayinin sorumluluk alanindaki musteri subelerini getir
     * Teklif olusturma ekraninda sube listesi icin
     */
    async getCustomerBranchesInDealerCoverage(dealerId, customerId) {
        try {
            // 1. Bayinin kapsadigi district'leri al
            const { data: coverageAreas, error: coverageError } = await supabaseClient
                .from('dealer_coverage_areas')
                .select('district_id')
                .eq('dealer_id', dealerId);

            if (coverageError) throw coverageError;

            const districtIds = coverageAreas.map(c => c.district_id);

            if (districtIds.length === 0) {
                return { data: [], error: null };
            }

            // 2. Musterinin bu district'lerdeki subelerini al
            const { data: branches, error: branchesError } = await supabaseClient
                .from('customer_branches')
                .select('*')
                .eq('customer_id', customerId)
                .eq('is_active', true)
                .in('district_id', districtIds)
                .order('is_default', { ascending: false });

            if (branchesError) throw branchesError;
            return { data: branches || [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getCustomerBranchesInDealerCoverage');
        }
    },

    // ==========================================
    // TEKLIF GENISLETME TALEPLERI
    // ==========================================

    /**
     * Teklif genisletme talebi olustur
     * Musteri mevcut teklifi baska subesine uygulatmak istediginde
     */
    async createExtensionRequest(originalOfferId, requestedBranchId, requestedByUserId) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_extension_requests')
                .insert([{
                    original_offer_id: originalOfferId,
                    requested_branch_id: requestedBranchId,
                    requested_by_user_id: requestedByUserId,
                    status: 'pending'
                }])
                .select(`
                    *,
                    original_offer:offers(id, dealer_id, customer_id, status),
                    requested_branch:customer_branches(id, branch_name, city, district)
                `)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.createExtensionRequest');
        }
    },

    /**
     * Bayinin bekleyen genisletme taleplerini getir
     */
    async getPendingExtensionRequests(dealerId) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_extension_requests')
                .select(`
                    *,
                    original_offer:offers!inner(
                        id,
                        dealer_id,
                        customer_id,
                        status,
                        customer:customers(id, name, company_name, vkn),
                        source_branch:customer_branches(id, branch_name, city, district),
                        offer_details(
                            id,
                            unit_price,
                            product:products(id, code, name)
                        )
                    ),
                    requested_branch:customer_branches(id, branch_name, city, district, full_address)
                `)
                .eq('original_offer.dealer_id', dealerId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getPendingExtensionRequests');
        }
    },

    /**
     * Genisletme talebini onayla
     * Yeni bir teklif olusturur ve talebi gunceller
     */
    async approveExtensionRequest(requestId, dealerNotes = null) {
        try {
            // 1. Talep bilgilerini al
            const { data: request, error: requestError } = await supabaseClient
                .from('offer_extension_requests')
                .select(`
                    *,
                    original_offer:offers(
                        id,
                        dealer_id,
                        customer_id,
                        notes,
                        offer_details(
                            product_id,
                            unit_price,
                            pricing_type,
                            discount_value,
                            commitment_quantity,
                            this_month_quantity,
                            last_month_quantity
                        )
                    )
                `)
                .eq('id', requestId)
                .single();

            if (requestError) throw requestError;
            if (!request) throw new Error('Talep bulunamadi');

            const originalOffer = request.original_offer;

            // 2. Yeni teklif olustur (ayni fiyatlarla)
            const newOfferData = {
                dealer_id: originalOffer.dealer_id,
                customer_id: originalOffer.customer_id,
                customer_branch_id: request.requested_branch_id,
                parent_offer_id: originalOffer.id,
                status: 'accepted', // Bayi onayladiği icin direkt accepted
                notes: dealerNotes || 'Genisletme ile olusturuldu'
            };

            const { data: newOffer, error: offerError } = await supabaseClient
                .from('offers')
                .insert([newOfferData])
                .select()
                .single();

            if (offerError) throw offerError;

            // 3. Teklif detaylarini kopyala
            if (originalOffer.offer_details && originalOffer.offer_details.length > 0) {
                const newDetails = originalOffer.offer_details.map(d => ({
                    offer_id: newOffer.id,
                    product_id: d.product_id,
                    unit_price: d.unit_price,
                    pricing_type: d.pricing_type,
                    discount_value: d.discount_value,
                    commitment_quantity: d.commitment_quantity,
                    this_month_quantity: d.this_month_quantity,
                    last_month_quantity: d.last_month_quantity
                }));

                const { error: detailsError } = await supabaseClient
                    .from('offer_details')
                    .insert(newDetails);

                if (detailsError) throw detailsError;
            }

            // 4. Talebi guncelle
            const { error: updateError } = await supabaseClient
                .from('offer_extension_requests')
                .update({
                    status: 'approved',
                    approved_offer_id: newOffer.id,
                    dealer_notes: dealerNotes,
                    dealer_response_at: new Date().toISOString()
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            return { data: { request, newOffer }, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.approveExtensionRequest');
        }
    },

    /**
     * Genisletme talebini reddet
     */
    async rejectExtensionRequest(requestId, dealerNotes = null) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_extension_requests')
                .update({
                    status: 'rejected',
                    dealer_notes: dealerNotes,
                    dealer_response_at: new Date().toISOString()
                })
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.rejectExtensionRequest');
        }
    },

    /**
     * Musterinin genisletme taleplerini getir
     */
    async getExtensionRequestsByCustomer(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_extension_requests')
                .select(`
                    *,
                    original_offer:offers!inner(
                        id,
                        customer_id,
                        dealer:dealers(id, name),
                        source_branch:customer_branches(id, branch_name)
                    ),
                    requested_branch:customer_branches(id, branch_name, city, district)
                `)
                .eq('original_offer.customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getExtensionRequestsByCustomer');
        }
    },

    /**
     * Bekleyen genisletme talebi sayisini getir (bayi bildirimi icin)
     */
    async getPendingExtensionRequestsCount(dealerId) {
        try {
            const { count, error } = await supabaseClient
                .from('offer_extension_requests')
                .select('id, original_offer:offers!inner(dealer_id)', { count: 'exact', head: true })
                .eq('original_offer.dealer_id', dealerId)
                .eq('status', 'pending');

            if (error) throw error;
            return { data: count || 0, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getPendingExtensionRequestsCount');
        }
    },

    // ==========================================
    // SUBE BAZLI FIYAT KONTROLU
    // ==========================================

    /**
     * Sube icin gecerli fiyatlari getir
     * Siparis verirken sube bazli fiyat kontrolu icin kullanilir
     * @param {string} dealerId - Bayi ID
     * @param {string} customerId - Musteri ID
     * @param {string} branchId - Sube ID
     * @returns {Object} - { hasValidOffer, prices: { productId: unitPrice } }
     */
    async getValidPricesForBranch(dealerId, customerId, branchId) {
        try {
            // Bu sube icin gecerli teklif var mi?
            const { data: offer, error } = await this.getAcceptedOfferForBranch(dealerId, customerId, branchId);

            if (error) throw error;

            if (!offer) {
                return {
                    data: {
                        hasValidOffer: false,
                        prices: {},
                        message: 'Bu sube icin gecerli teklif bulunamadi'
                    },
                    error: null
                };
            }

            // Teklifteki fiyatlari map olarak dondur
            const prices = {};
            (offer.offer_details || []).forEach(function(detail) {
                if (detail.product_id) {
                    prices[detail.product_id] = {
                        unit_price: detail.unit_price,
                        pricing_type: detail.pricing_type,
                        discount_value: detail.discount_value,
                        commitment_quantity: detail.commitment_quantity
                    };
                }
            });

            return {
                data: {
                    hasValidOffer: true,
                    offerId: offer.id,
                    branchId: branchId,
                    prices: prices
                },
                error: null
            };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getValidPricesForBranch');
        }
    },

    /**
     * Sepet urunlerinin fiyatlarini sube teklifine gore dogrula
     * @param {string} dealerId - Bayi ID
     * @param {string} customerId - Musteri ID
     * @param {string} branchId - Sube ID
     * @param {Array} cartItems - Sepet urunleri [{productId, quantity, unitPrice}]
     * @returns {Object} - { isValid, invalidItems, validPrices }
     */
    async validateCartPricesForBranch(dealerId, customerId, branchId, cartItems) {
        try {
            const { data: priceData, error } = await this.getValidPricesForBranch(dealerId, customerId, branchId);

            if (error) throw error;

            if (!priceData.hasValidOffer) {
                return {
                    data: {
                        isValid: false,
                        message: priceData.message,
                        invalidItems: cartItems.map(item => item.productId)
                    },
                    error: null
                };
            }

            const invalidItems = [];
            const validPrices = {};

            cartItems.forEach(function(item) {
                const offerPrice = priceData.prices[item.productId];

                if (!offerPrice) {
                    // Bu urun teklifte yok
                    invalidItems.push({
                        productId: item.productId,
                        reason: 'Urun teklifte bulunamadi'
                    });
                } else {
                    // Fiyat uyumlu mu kontrol et
                    validPrices[item.productId] = offerPrice.unit_price;

                    if (Math.abs(item.unitPrice - offerPrice.unit_price) > 0.01) {
                        invalidItems.push({
                            productId: item.productId,
                            reason: 'Fiyat uyusmuyor',
                            cartPrice: item.unitPrice,
                            offerPrice: offerPrice.unit_price
                        });
                    }
                }
            });

            return {
                data: {
                    isValid: invalidItems.length === 0,
                    offerId: priceData.offerId,
                    branchId: branchId,
                    invalidItems: invalidItems,
                    validPrices: validPrices
                },
                error: null
            };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.validateCartPricesForBranch');
        }
    },

    /**
     * Tum teklifleri getir (backoffice icin)
     * @param {Object} filters - { status, dealerId, customerId, dateFrom, dateTo }
     */
    async getAll(filters = {}) {
        try {
            let query = supabaseClient
                .from('offers')
                .select(`
                    *,
                    dealer:dealers(id, name, code),
                    customer:customers(id, name, company_name, vkn),
                    branch:customer_branches(id, branch_name, city, district),
                    offer_details(
                        id,
                        product_id,
                        unit_price,
                        pricing_type,
                        discount_value,
                        commitment_quantity,
                        product:products(id, code, name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.dealerId) {
                query = query.eq('dealer_id', filters.dealerId);
            }
            if (filters.customerId) {
                query = query.eq('customer_id', filters.customerId);
            }
            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom);
            }
            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo + 'T23:59:59');
            }

            const { data, error } = await query;
            if (error) throw error;

            return { data: data || [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'OffersService.getAll');
        }
    }
};

// Global erisim
window.OffersService = OffersService;
