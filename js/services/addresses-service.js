/**
 * Addresses Service
 * Müşteri adresleri CRUD işlemleri
 */

const AddressesService = {
    /**
     * Müşterinin tüm adreslerini getir
     */
    async getByCustomerId(customerId) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_addresses')
                .select('*')
                .eq('customer_id', customerId)
                .eq('is_active', true)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AddressesService.getByCustomerId');
        }
    },

    /**
     * ID ile adres getir
     */
    async getById(id) {
        try {
            const { data, error } = await supabaseClient
                .from('customer_addresses')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AddressesService.getById');
        }
    },

    /**
     * Yeni adres oluştur
     */
    async create(addressData) {
        try {
            // Tam adresi oluştur
            addressData.full_address = this.buildFullAddress(addressData);

            const { data, error } = await supabaseClient
                .from('customer_addresses')
                .insert([addressData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AddressesService.create');
        }
    },

    /**
     * Adres güncelle
     */
    async update(id, addressData) {
        try {
            // Tam adresi güncelle
            addressData.full_address = this.buildFullAddress(addressData);
            addressData.updated_at = new Date().toISOString();

            const { data, error } = await supabaseClient
                .from('customer_addresses')
                .update(addressData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AddressesService.update');
        }
    },

    /**
     * Adres sil (hard delete)
     */
    async delete(id) {
        try {
            const { error } = await supabaseClient
                .from('customer_addresses')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { data: { success: true }, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AddressesService.delete');
        }
    },

    /**
     * Varsayılan adres olarak ayarla
     */
    async setDefault(id, customerId) {
        try {
            // Önce tüm adreslerin default'unu kaldır
            await supabaseClient
                .from('customer_addresses')
                .update({ is_default: false })
                .eq('customer_id', customerId);

            // Seçilen adresi default yap
            const { data, error } = await supabaseClient
                .from('customer_addresses')
                .update({ is_default: true })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'AddressesService.setDefault');
        }
    },

    /**
     * Tam adres metnini oluştur
     */
    buildFullAddress(addressData) {
        var parts = [];

        if (addressData.neighborhood) parts.push(addressData.neighborhood);
        if (addressData.street) parts.push(addressData.street);
        if (addressData.building_no) parts.push('BİNA NO:' + addressData.building_no);
        if (addressData.floor) parts.push('KAT:' + addressData.floor);
        if (addressData.apartment) parts.push('DAİRE:' + addressData.apartment);
        if (addressData.district) parts.push(addressData.district);
        if (addressData.city) parts.push(addressData.city);

        return parts.join(' ');
    }
};

// Global erişim
window.AddressesService = AddressesService;
