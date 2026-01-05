"""
İpragaz LPG Bayi Yönetim Sistemi - Proje Konfigürasyonu
Bu dosyayı scrum_agents/ipragaz_config.py olarak kaydet
"""

# Proje bilgileri
PROJECT_NAME = "İpragaz LPG Bayi Yönetim Sistemi"

PROJECT_CONTEXT = """
## Teknoloji Stack
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Deployment:** Vercel
- **Stil:** Custom CSS (Tailwind yok)

## Mevcut Modüller
- Dashboard (ana sayfa)
- Müşteri Yönetimi (CRUD)
- Stok Takibi
- Kullanıcı Girişi (Supabase Auth)

## Veritabanı Tabloları (Supabase)
- customers (müşteriler)
- products (ürünler/LPG tüpler)
- orders (siparişler)
- dealers (bayiler)
- users (kullanıcılar)

## Kod Standartları
- ES6+ JavaScript
- Async/await pattern
- Supabase client kullanımı
- Modüler dosya yapısı
- Türkçe yorum ve değişken isimleri kabul edilir

## Dosya Yapısı
```
ipragaz/
├── index.html          # Ana dashboard
├── pages/
│   ├── customers.html  # Müşteri listesi
│   ├── orders.html     # Sipariş yönetimi
│   └── stock.html      # Stok takibi
├── css/
│   ├── style.css       # Ana stil
│   └── components.css  # Component stilleri
├── js/
│   ├── app.js          # Ana uygulama
│   ├── supabase.js     # Supabase client
│   ├── customers.js    # Müşteri işlemleri
│   └── utils.js        # Yardımcı fonksiyonlar
└── assets/
    └── images/
```

## Önemli Notlar
- Tüm API çağrıları Supabase client üzerinden
- Row Level Security (RLS) aktif
- Responsive tasarım zorunlu
- Türkçe karakter desteği şart
"""

# Sık kullanılan talepler için şablonlar
COMMON_REQUESTS = {
    "yeni_modul": "Yeni bir modül/sayfa eklenmesi",
    "crud": "CRUD işlemleri (Create, Read, Update, Delete)",
    "rapor": "Raporlama ve istatistik özellikleri",
    "entegrasyon": "Dış sistem entegrasyonu",
    "ui_iyilestirme": "UI/UX iyileştirmesi",
    "bug_fix": "Hata düzeltme",
    "performans": "Performans optimizasyonu"
}
