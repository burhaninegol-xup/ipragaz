# 🧪 İpragaz E2E Test Otomasyon Sistemi

Playwright tabanlı otomatik test senaryoları çalıştırır, hata olduğunda ekran görüntüsü alır ve detaylı rapor oluşturur.

## 🚀 Kurulum

```bash
# 1. Bağımlılıkları kur
pip3 install -r requirements.txt

# 2. Playwright browser'ı kur
playwright install chromium
```

## 📋 Kullanım

### Web Dashboard (Önerilen)

```bash
python3 dashboard.py
```

Tarayıcıda aç: **http://localhost:8081**

Dashboard'da:
- Senaryoları görüntüle
- İstediğin senaryoları seç ve çalıştır
- Sonuçları ve ekran görüntülerini incele
- HTML raporları görüntüle

### Komut Satırı

```bash
# Tüm senaryoları çalıştır
python3 test_runner.py scenarios/test_scenarios.json

# Sadece belirli tag'leri çalıştır
python3 test_runner.py -t critical auth

# Sadece belirli senaryoları çalıştır
python3 test_runner.py -s login-success customer-list

# Headless modda çalıştır (arka planda)
python3 test_runner.py --headless
```

## 📝 Senaryo Yazımı

Senaryolar `scenarios/test_scenarios.json` dosyasında tanımlanır.

### Senaryo Yapısı

```json
{
  "id": "login-success",
  "name": "Başarılı Giriş",
  "description": "Geçerli kullanıcı bilgileriyle sisteme giriş",
  "tags": ["auth", "critical"],
  "steps": [
    {
      "action": "goto",
      "target": "/login.html",
      "description": "Login sayfasına git"
    },
    {
      "action": "fill",
      "target": "#email",
      "value": "{{testUser.email}}",
      "description": "Email gir"
    }
  ]
}
```

### Desteklenen Aksiyonlar

| Aksiyon | Açıklama | Parametreler |
|---------|----------|--------------|
| `goto` | Sayfaya git | `target`: URL yolu |
| `fill` | Input doldur | `target`: selector, `value`: değer |
| `click` | Tıkla | `target`: selector |
| `type` | Karakter karakter yaz | `target`: selector, `value`: metin |
| `select` | Dropdown seç | `target`: selector, `value`: değer veya "first" |
| `wait` | Bekle | `duration`: milisaniye |
| `waitForSelector` | Element bekle | `target`: selector |
| `waitForNavigation` | Sayfa yüklenmesini bekle | - |
| `hover` | Üzerine gel | `target`: selector |
| `press` | Tuş bas | `target`: selector, `value`: tuş adı |
| `screenshot` | Ekran görüntüsü al | `name`: dosya adı |
| `evaluate` | JavaScript çalıştır | `script`: JS kodu |

### Assertion'lar (Doğrulama)

| Aksiyon | Açıklama | Parametreler |
|---------|----------|--------------|
| `assertUrl` | URL kontrolü | `expected`: beklenen URL parçası |
| `assertVisible` | Görünürlük kontrolü | `target`: selector |
| `assertText` | Metin kontrolü | `target`: selector, `expected` veya `contains` |
| `assertCount` | Element sayısı | `target`: selector, `expected`: sayı |
| `assertNotEmpty` | Boş olmama kontrolü | `target`: selector |

### Değişkenler

Senaryolarda kullanılabilecek değişkenler:

- `{{timestamp}}` - Anlık zaman damgası
- `{{testUser.email}}` - credentials'daki testUser.email değeri
- `{{testUser.password}}` - credentials'daki testUser.password değeri

## 📊 Raporlar

Her test çalıştırması sonrası:

- `test_results/report_YYYYMMDD_HHMMSS.html` - Görsel HTML rapor
- `test_results/results_YYYYMMDD_HHMMSS.json` - JSON formatında sonuçlar
- `test_results/screenshots/` - Hata ekran görüntüleri

## ⚙️ Konfigürasyon

`test_scenarios.json` içinde:

```json
{
  "config": {
    "baseUrl": "http://localhost:5500",
    "timeout": 30000,
    "screenshotOnError": true,
    "screenshotOnSuccess": false,
    "headless": false,
    "slowMo": 100
  },
  "credentials": {
    "testUser": {
      "email": "test@ipragaz.com",
      "password": "test123"
    }
  }
}
```

| Ayar | Açıklama | Varsayılan |
|------|----------|------------|
| `baseUrl` | Test edilecek sitenin URL'i | - |
| `timeout` | Maksimum bekleme süresi (ms) | 30000 |
| `screenshotOnError` | Hata olunca screenshot al | true |
| `screenshotOnSuccess` | Her adımda screenshot al | false |
| `headless` | Tarayıcıyı arka planda çalıştır | false |
| `slowMo` | Aksiyonlar arası bekleme (ms) | 0 |

## 🔧 İpragaz Projesiyle Entegrasyon

1. İpragaz projesini çalıştır:
```bash
cd ~/cluade-code/ipragaz-bayi
npx live-server --port=5500
```

2. Test dashboard'u başlat:
```bash
cd ipragaz_tester
python3 dashboard.py
```

3. Dashboard'dan testleri çalıştır

## 📁 Dosya Yapısı

```
ipragaz_tester/
├── test_runner.py      # Ana test engine
├── dashboard.py        # Web arayüzü
├── requirements.txt    # Bağımlılıklar
├── README.md          # Bu dosya
├── scenarios/
│   └── test_scenarios.json  # Test senaryoları
└── test_results/
    ├── report_*.html   # HTML raporlar
    ├── results_*.json  # JSON sonuçlar
    └── screenshots/    # Ekran görüntüleri
```

## 💡 İpuçları

1. **Yeni senaryo eklerken**: Önce basit bir senaryo ile test edin, sonra adım adım karmaşıklaştırın.

2. **Selector bulamıyorsanız**: Browser DevTools'da element'e sağ tıklayıp "Copy selector" kullanın.

3. **Timing sorunları**: `waitForSelector` ve `wait` aksiyonlarını kullanın.

4. **Debug için**: `headless: false` ve `slowMo: 200` ayarlayın.
