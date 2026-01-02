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
    }
};

// Global erisim
window.BranchesService = BranchesService;

// Geriye uyumluluk icin AddressesService alias
window.AddressesService = BranchesService;
