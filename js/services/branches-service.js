/**
 * Branches Service
 * Musteri subeleri CRUD islemleri
 */

const BranchesService = {
    /**
     * Musterinin tum subelerini getir
     */
    async getByCustomerId(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_branches')
                .select('*')
                .eq('customer_id', customerId)
                .eq('is_active', true)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.getByCustomerId');
        }
    },

    /**
     * ID ile sube getir
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_branches')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.getById');
        }
    },

    /**
     * Yeni sube olustur
     */
    async create(branchData) {
        try {
            // Tam adresi olustur
            branchData.full_address = this.buildFullAddress(branchData);

            const { data, error } = await supabaseClient
                .from('customer_branches')
                .insert([branchData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.create');
        }
    },

    /**
     * Sube guncelle
     */
    async update(id, branchData) {
        try {
            // Tam adresi guncelle
            branchData.full_address = this.buildFullAddress(branchData);
            branchData.updated_at = new Date().toISOString();

            const { data, error } = await supabaseClient
                .from('customer_branches')
                .update(branchData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.update');
        }
    },

    /**
     * Sube sil (hard delete)
     */
    async delete(id) {
        try {
            const { error } = await supabaseClient
                .from('customer_branches')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { data: { success: true }, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.delete');
        }
    },

    /**
     * Varsayilan sube olarak ayarla
     */
    async setDefault(id, customerId) {
        try {
            // Once tum subelerin default'unu kaldir
            await supabaseClient
                .from('customer_branches')
                .update({ is_default: false })
                .eq('customer_id', customerId);

            // Secilen subeyi default yap
            const { data, error } = await supabaseClient
                .from('customer_branches')
                .update({ is_default: true })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.setDefault');
        }
    },

    /**
     * Tam adres metnini olustur
     */
    buildFullAddress(branchData) {
        var parts = [];

        if (branchData.neighborhood) parts.push(branchData.neighborhood);
        if (branchData.street) parts.push(branchData.street);
        if (branchData.building_no) parts.push('BINA NO:' + branchData.building_no);
        if (branchData.floor) parts.push('KAT:' + branchData.floor);
        if (branchData.apartment) parts.push('DAIRE:' + branchData.apartment);
        if (branchData.district) parts.push(branchData.district);
        if (branchData.city) parts.push(branchData.city);

        return parts.join(' ');
    },

    // ==========================================
    // BAYI COVERAGE KONTROLLERI
    // ==========================================

    /**
     * Sube, bayinin sorumluluk alaninda mi?
     * @param {string} dealerId - Bayi ID
     * @param {string} branchId - Sube ID
     * @returns {boolean}
     */
    async isBranchInDealerCoverage(dealerId, branchId) {
        try {
            // 1. Subenin district_id'sini al
            const { data: branch, error: branchError } = await supabaseClient
                .from('customer_branches')
                .select('district_id')
                .eq('id', branchId)
                .single();

            if (branchError) throw branchError;
            if (!branch || !branch.district_id) {
                return { data: false, error: null };
            }

            // 2. Bayi bu district'i kapsiyor mu?
            const { data: coverage, error: coverageError } = await supabaseClient
                .from('dealer_districts')
                .select('id')
                .eq('dealer_id', dealerId)
                .eq('district_id', branch.district_id)
                .maybeSingle();

            if (coverageError) throw coverageError;

            return { data: coverage !== null, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.isBranchInDealerCoverage');
        }
    },

    /**
     * Musterinin bayinin sorumluluk alanindaki subelerini getir
     * @param {string} customerId - Musteri ID
     * @param {string} dealerId - Bayi ID
     */
    async getByCustomerIdInDealerCoverage(customerId, dealerId) {
        try {
            // 1. Bayinin kapsadigi district'leri al
            const { data: coverageAreas, error: coverageError } = await supabaseClient
                .from('dealer_districts')
                .select('district_id')
                .eq('dealer_id', dealerId);

            if (coverageError) throw coverageError;

            const districtIds = (coverageAreas || []).map(c => c.district_id);

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
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (branchesError) throw branchesError;
            return { data: branches || [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.getByCustomerIdInDealerCoverage');
        }
    },

    /**
     * Musterinin bayinin sorumluluk alaninda OLMAYAN subelerini getir
     * (Bilgilendirme amacli - teklif genisletme ekraninda gri/disabled gosterilir)
     */
    async getByCustomerIdOutsideDealerCoverage(customerId, dealerId) {
        try {
            // 1. Bayinin kapsadigi district'leri al
            const { data: coverageAreas, error: coverageError } = await supabaseClient
                .from('dealer_districts')
                .select('district_id')
                .eq('dealer_id', dealerId);

            if (coverageError) throw coverageError;

            const districtIds = (coverageAreas || []).map(c => c.district_id);

            // 2. Musterinin bu district'lerin DISINDAKI subelerini al
            let query = supabaseClient
                .from('customer_branches')
                .select('*')
                .eq('customer_id', customerId)
                .eq('is_active', true);

            if (districtIds.length > 0) {
                // NOT IN - bu district'lerin disinda
                query = query.not('district_id', 'in', `(${districtIds.join(',')})`);
            }

            query = query.order('created_at', { ascending: false });

            const { data: branches, error: branchesError } = await query;

            if (branchesError) throw branchesError;
            return { data: branches || [], error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.getByCustomerIdOutsideDealerCoverage');
        }
    },

    // ==========================================
    // GUVENLIK SORULARI
    // ==========================================

    /**
     * Subenin guvenlik sorularini cevaplama durumunu kontrol et
     * @param {string} branchId - Sube ID
     * @returns {boolean} - Guvenlik sorulari cevaplanmis mi?
     */
    async hasSecurityAnswers(branchId) {
        const result = await this.getById(branchId);
        if (result.error || !result.data) return false;
        return result.data.security_accepted_at !== null;
    },

    /**
     * Sube icin guvenlik cevaplarini kaydet
     * @param {string} branchId - Sube ID
     * @param {object} answers - Cevaplar {q1: boolean, q2: boolean, q3: boolean, q4: boolean}
     */
    async updateSecurityAnswers(branchId, answers) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_branches')
                .update({
                    security_q1: answers.q1,
                    security_q2: answers.q2,
                    security_q3: answers.q3,
                    security_q4: answers.q4,
                    security_accepted_at: new Date().toISOString()
                })
                .eq('id', branchId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'BranchesService.updateSecurityAnswers');
        }
    }
};

// Global erisim
window.BranchesService = BranchesService;

// Geriye uyumluluk icin AddressesService alias
window.AddressesService = BranchesService;
