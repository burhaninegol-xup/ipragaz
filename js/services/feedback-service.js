/**
 * Feedback Service
 * Sayfa geri bildirim kayitlari CRUD + screenshot upload
 */

const FeedbackService = {

    /**
     * Yeni geri bildirim olustur
     */
    async create(feedbackData) {
        try {
            const { data, error } = await supabaseClient
                .from('page_feedback')
                .insert([{
                    page_url: feedbackData.page_url,
                    feedback_text: feedbackData.feedback_text,
                    screenshot_url: feedbackData.screenshot_url || null,
                    rect_x: feedbackData.rect_x,
                    rect_y: feedbackData.rect_y,
                    rect_width: feedbackData.rect_width,
                    rect_height: feedbackData.rect_height,
                    scroll_x: feedbackData.scroll_x || 0,
                    scroll_y: feedbackData.scroll_y || 0,
                    viewport_width: feedbackData.viewport_width || null,
                    viewport_height: feedbackData.viewport_height || null,
                    user_name: feedbackData.user_name || null,
                    status: 'open'
                }])
                .select()
                .single();

            if (error) throw error;
            return { data: data, error: null };
        } catch (error) {
            console.error('FeedbackService.create error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Sayfa URL'ine gore geri bildirimleri getir
     */
    async getByPage(pageUrl, status) {
        try {
            var query = supabaseClient
                .from('page_feedback')
                .select('*')
                .eq('page_url', pageUrl)
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('FeedbackService.getByPage error:', error);
            return { data: [], error: { message: error.message } };
        }
    },

    /**
     * Tum sayfalardaki geri bildirimleri getir
     */
    async getAll(status) {
        try {
            var query = supabaseClient
                .from('page_feedback')
                .select('*')
                .order('created_at', { ascending: false });

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;
            return { data: data || [], error: null };
        } catch (error) {
            console.error('FeedbackService.getAll error:', error);
            return { data: [], error: { message: error.message } };
        }
    },

    /**
     * Sayfa icin acik geri bildirim sayisi
     */
    async getOpenCount(pageUrl) {
        try {
            const { count, error } = await supabaseClient
                .from('page_feedback')
                .select('*', { count: 'exact', head: true })
                .eq('page_url', pageUrl)
                .eq('status', 'open');

            if (error) throw error;
            return { data: count || 0, error: null };
        } catch (error) {
            console.error('FeedbackService.getOpenCount error:', error);
            return { data: 0, error: { message: error.message } };
        }
    },

    /**
     * Geri bildirimi cozuldu olarak isaretle
     */
    async resolve(id, resolverName) {
        try {
            const { data, error } = await supabaseClient
                .from('page_feedback')
                .update({
                    status: 'resolved',
                    resolved_by: resolverName || null,
                    resolved_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data: data, error: null };
        } catch (error) {
            console.error('FeedbackService.resolve error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Geri bildirimi sil
     */
    async delete(id) {
        try {
            const { data, error } = await supabaseClient
                .from('page_feedback')
                .delete()
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { data: data, error: null };
        } catch (error) {
            console.error('FeedbackService.delete error:', error);
            return { data: null, error: { message: error.message } };
        }
    },

    /**
     * Screenshot blob'unu Supabase storage'a yukle
     */
    async uploadScreenshot(blob, pageUrl) {
        try {
            if (!blob) {
                console.error('FeedbackService.uploadScreenshot: blob is null/undefined');
                return { data: null, error: { message: 'Screenshot blob olusamadi' } };
            }

            console.log('FeedbackService.uploadScreenshot: blob size=', blob.size, 'type=', blob.type);

            var timestamp = Date.now();
            var random = Math.random().toString(36).substring(2, 8);
            var pageName = pageUrl.replace('.html', '').replace(/[^a-zA-Z0-9-_]/g, '_');
            var filePath = 'feedback-screenshots/' + pageName + '_' + timestamp + '_' + random + '.jpg';

            console.log('FeedbackService.uploadScreenshot: uploading to', filePath);

            const { data, error } = await supabaseClient
                .storage
                .from('feedback')
                .upload(filePath, blob, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('FeedbackService.uploadScreenshot: upload error', error);
                throw error;
            }

            console.log('FeedbackService.uploadScreenshot: upload success', data);

            const { data: urlData } = supabaseClient
                .storage
                .from('feedback')
                .getPublicUrl(filePath);

            console.log('FeedbackService.uploadScreenshot: publicUrl=', urlData.publicUrl);

            return { data: urlData.publicUrl, error: null };
        } catch (error) {
            console.error('FeedbackService.uploadScreenshot error:', error);
            return { data: null, error: { message: error.message } };
        }
    }
};

window.FeedbackService = FeedbackService;
