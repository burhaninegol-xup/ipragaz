/**
 * Messages Service
 * Teklif mesajlaşma işlemleri
 */

const MessagesService = {
    /**
     * Teklif ID'ye göre mesajları getir
     */
    async getByOfferId(offerId) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_messages')
                .select('*')
                .eq('offer_id', offerId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'MessagesService.getByOfferId');
        }
    },

    /**
     * Yeni mesaj oluştur
     */
    async create(messageData) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_messages')
                .insert([messageData])
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'MessagesService.create');
        }
    },

    /**
     * Mesajları okundu olarak işaretle
     * Karşı tarafın mesajlarını okundu yapar
     */
    async markAsRead(offerId, currentSenderType) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_messages')
                .update({ is_read: true })
                .eq('offer_id', offerId)
                .neq('sender_type', currentSenderType)
                .eq('is_read', false);

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'MessagesService.markAsRead');
        }
    },

    /**
     * Okunmamış mesaj sayısını getir
     */
    async getUnreadCount(offerId, currentSenderType) {
        try {
            const { data, error } = await supabaseClient
                .from('offer_messages')
                .select('id', { count: 'exact' })
                .eq('offer_id', offerId)
                .neq('sender_type', currentSenderType)
                .eq('is_read', false);

            if (error) throw error;
            return { data: data?.length || 0, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'MessagesService.getUnreadCount');
        }
    },

    /**
     * Real-time subscription - teklif mesajlarını dinle
     */
    subscribeToOffer(offerId, callback) {
        return supabaseClient
            .channel(`messages:${offerId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'offer_messages',
                filter: `offer_id=eq.${offerId}`
            }, callback)
            .subscribe();
    },

    /**
     * Subscription'ı kaldır
     */
    unsubscribe(channel) {
        if (channel) {
            supabaseClient.removeChannel(channel);
        }
    }
};

// Global erişim
window.MessagesService = MessagesService;
