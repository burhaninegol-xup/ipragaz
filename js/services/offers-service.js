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
    }
};

// Global erisim
window.OffersService = OffersService;
