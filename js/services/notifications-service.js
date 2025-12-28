/**
 * Notifications Service
 * Bildirim CRUD islemleri ve Realtime subscription
 */

const NotificationsService = {
    subscription: null,
    onNewNotification: null,

    /**
     * Kullanicinin bildirimlerini getir
     */
    async getAll(userId, userType, options = {}) {
        try {
            let query = supabaseClient
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .eq('user_type', userType)
                .order('created_at', { ascending: false });

            if (options.unreadOnly) {
                query = query.eq('is_read', false);
            }

            if (options.limit) {
                query = query.limit(options.limit);
            }

            const { data, error } = await query;
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'NotificationsService.getAll');
        }
    },

    /**
     * Okunmamis bildirim sayisini getir
     */
    async getUnreadCount(userId, userType) {
        try {
            const { count, error } = await supabaseClient
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('user_type', userType)
                .eq('is_read', false);

            if (error) throw error;
            return { data: count || 0, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'NotificationsService.getUnreadCount');
        }
    },

    /**
     * Bildirimi okundu olarak isaretle
     */
    async markAsRead(notificationId) {
        try {
            const { data, error } = await supabaseClient
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'NotificationsService.markAsRead');
        }
    },

    /**
     * Tum bildirimleri okundu olarak isaretle
     */
    async markAllAsRead(userId, userType) {
        try {
            const { data, error } = await supabaseClient
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('user_type', userType)
                .eq('is_read', false)
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'NotificationsService.markAllAsRead');
        }
    },

    /**
     * Bildirimi sil
     */
    async delete(notificationId) {
        try {
            const { error } = await supabaseClient
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'NotificationsService.delete');
        }
    },

    /**
     * Tum bildirimleri sil
     */
    async deleteAll(userId, userType) {
        try {
            const { error } = await supabaseClient
                .from('notifications')
                .delete()
                .eq('user_id', userId)
                .eq('user_type', userType);

            if (error) throw error;
            return { data: true, error: null };
        } catch (error) {
            return handleSupabaseError(error, 'NotificationsService.deleteAll');
        }
    },

    /**
     * Realtime subscription baslat
     */
    subscribe(userId, callback) {
        // Eski subscription varsa kaldir
        this.unsubscribe();

        this.onNewNotification = callback;

        this.subscription = supabaseClient
            .channel('notifications-' + userId)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: 'user_id=eq.' + userId
                },
                (payload) => {
                    if (this.onNewNotification) {
                        this.onNewNotification(payload.new);
                    }
                }
            )
            .subscribe();

        return this.subscription;
    },

    /**
     * Realtime subscription'i durdur
     */
    unsubscribe() {
        if (this.subscription) {
            supabaseClient.removeChannel(this.subscription);
            this.subscription = null;
        }
        this.onNewNotification = null;
    }
};

// Global erisim
window.NotificationsService = NotificationsService;
