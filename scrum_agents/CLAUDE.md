# İpragaz LPG Bayi Yönetim Sistemi

## Proje Hakkında
Bu proje İpragaz bayileri için LPG müşteri ve sipariş yönetim sistemidir.

## Teknoloji Stack
- **Frontend:** Vanilla HTML, CSS, JavaScript (framework yok)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Deployment:** Vercel
- **Test:** Vitest (unit testler için)

## Kod Standartları
- ES6+ JavaScript kullan
- Async/await pattern tercih et
- Supabase client üzerinden veritabanı işlemleri
- Responsive tasarım zorunlu (mobile-first)
- Türkçe yorum kabul edilir
- Dosya isimleri İngilizce, değişkenler snake_case

## Dosya Yapısı
```
ipragaz/
├── index.html              # Ana dashboard
├── pages/                  # Sayfa HTML'leri
├── css/                    # Stil dosyaları
├── js/                     # JavaScript modülleri
├── assets/                 # Görseller, fontlar
├── scrum_agents/           # AI Scrum Takımı
│   ├── run_sprint.py       # Sprint çalıştırıcı
│   └── logs/               # Tartışma logları
└── .vscode/
    └── tasks.json          # VSCode görevleri
```

## Veritabanı Tabloları (Supabase)
- `customers` - Müşteri bilgileri
- `orders` - Siparişler
- `products` - Ürünler (LPG tüpler)
- `dealers` - Bayiler
- `deliveries` - Teslimatlar

## Scrum Agent Takımı Kullanımı
Bu projede AI destekli bir Scrum takımı var. Yeni özellik geliştirmek için:

1. Terminal'de: `cd scrum_agents && python run_sprint.py -i`
2. Veya VSCode'da: `Ctrl+Shift+P` → "Tasks: Run Task" → "Scrum Sprint"

Takım üyeleri:
- 👩‍💼 Ayşe (Product Owner) - Gereksinim analizi
- 👨‍💻 Mehmet (Tech Lead) - Teknik planlama  
- 🧑‍💻 Ali (Senior Dev) - Backend geliştirme
- 👩‍🎨 Zeynep (Frontend Dev) - UI/UX geliştirme
- 🔍 Can (QA Engineer) - Test ve kalite

## Sık Kullanılan Komutlar

### Geliştirme
```bash
# Local server başlat
python -m http.server 8080

# Testleri çalıştır
npx vitest run
```

### Scrum Sprint
```bash
# İnteraktif mod
cd scrum_agents && python run_sprint.py -i

# Direkt talep
cd scrum_agents && python run_sprint.py "Teslimat takip modülü ekle"

# Hızlı şablonlar
python run_sprint.py --crud "Fatura modülü"
python run_sprint.py --rapor "Haftalık satış raporu"
python run_sprint.py --bug "Müşteri silme çalışmıyor"
```

## Notlar
- Supabase URL ve Key `.env` dosyasında
- RLS (Row Level Security) aktif, policy'ler tanımlı
- Her değişiklik sonrası Vercel otomatik deploy eder
