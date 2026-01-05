/**
 * Supabase Client Configuration
 * İpragaz Bayi Projesi
 */

const SUPABASE_URL = 'https://mkofufdksqejvrnarxae.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jA5Htra9A1BrGTRGDi0tnA_gmw8xU-R';

// Supabase client'i oluştur (cache bypass için global header)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
        }
    }
});

// Global erişim için
window.supabaseClient = supabaseClient;

/**
 * Hata yönetimi helper fonksiyonu
 */
function handleSupabaseError(error, context) {
    console.error(`Supabase Error [${context}]:`, error);
    return { data: null, error: error.message || 'Bir hata oluştu' };
}

/**
 * Bağlantı testi
 */
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabaseClient
            .from('products')
            .select('count')
            .limit(1);

        if (error) throw error;
        console.log('Supabase bağlantısı başarılı!');
        return true;
    } catch (error) {
        console.error('Supabase bağlantı hatası:', error);
        return false;
    }
}

// Export
window.handleSupabaseError = handleSupabaseError;
window.testSupabaseConnection = testSupabaseConnection;
