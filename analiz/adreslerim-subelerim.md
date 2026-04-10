# Adreslerim / Şubelerim Dropdown — Business Logic Dokümantasyonu

> **Konum:** Header'daki kullanıcı adı + şube adı pill butonu
> **Portal:** Yalnızca Müşteri portalı (`isyerim-musteri-*`)
> **Son güncelleme:** 22.03.2026

---

## 1. Genel Bakış

Adres/şube seçici, müşterinin hangi iş yeri (şube) için sipariş veya teklif işlemi yapacağını belirleyen merkezi bir bileşendir. Header'da pill şeklinde bir buton olarak görünür ve tıklandığında tüm şubeleri listeleyen bir modal açılır. Seçilen şube, fiyatlandırmayı, bayi eşleştirmesini, sepeti ve teklif süreçlerini doğrudan etkiler.

---

## 2. Görünürlük Koşulları

### Kimler Görür?

| Kullanıcı Tipi | Görünürlük | Şube Değiştirme |
|----------------|------------|-----------------|
| **Müşteri — Owner** | ✅ Görür | ✅ Tüm şubeleri seçebilir |
| **Müşteri — Staff** | ✅ Görür | ✅ Tüm şubeleri seçebilir |
| **Bayi** | ❌ Görmez | Bayi header'ında şube seçici yok |
| **Backoffice Admin** | ❌ Görmez | Admin panelinde şube seçici yok |
| **Giriş yapmamış** | ❌ Görmez | Müşteri portalına erişim yok |

> **Not:** Owner ve Staff arasında şube seçiminde herhangi bir kısıtlama yoktur. Staff kullanıcılar `customer_user_branches` tablosunda şube izinleri tanımlıdır, ancak bu izinler şube seçici modal'ı **kısıtlamaz** — her iki rol de tüm şubeleri görebilir ve seçebilir.

---

## 3. Header UI — Pill Buton

### 3.1. HTML Yapısı

**Dosya:** `components/isyerim-header.html`

```
┌──────────────────────────────────────────┐
│  Ali Ortancalı : Güloğlu Ticaret-Kadıköy  📍  │
└──────────────────────────────────────────┘
```

**Elementler:**
- **Kullanıcı adı:** `.user-name` (ID: `headerUserName`) — 500 font-weight
- **Ayırıcı:** `:` (iki nokta üst üste)
- **Şube adı:** `.location-text` (ID: `headerUserLocation`) — max-width 300px, taşarsa ellipsis
- **Konum ikonu:** SVG harita pini, kırmızı (`#e31e24`), 18x18px

### 3.2. Görsel Özellikler

- **Kenarlık:** 1px solid #e0e0e0, border-radius 30px (pill şekli)
- **Padding:** 8px 16px
- **İmleç:** pointer (tıklanabilir)
- **Hover:** Kenarlık rengi kırmızıya (`#e31e24`) döner
- **Mobil (≤768px):** Gizlenir (`display: none`)

### 3.3. Varsayılan Metin

Şube seçilmemişse: `"Şube Seçiniz"`

---

## 4. Varsayılan Şube Belirleme Mantığı

Sayfa yüklendiğinde `loadSelectedAddress()` fonksiyonu çalışır ve şu öncelik sırasıyla şube belirlenir:

### Öncelik Sırası

```
1. sessionStorage kontrolü (en hızlı)
   └─ selected_address_id + selected_address_name mevcutsa → Bu şubeyi kullan

2. Veritabanından son seçim (oturumlar arası kalıcılık)
   └─ customer_users.last_selected_branch_id
   └─ Koşullar: Şube aktif olmalı (is_active=true) + Aynı müşteriye ait olmalı

3. Varsayılan (Merkez) şube (fallback)
   └─ BranchesService.getByCustomerId() → is_default DESC sıralama
   └─ İlk sonuç = Merkez şube (is_default=true olan)
```

### Detaylı Akış

```
Sayfa yüklenir
    │
    ▼
loadSelectedAddress()
    │
    ├─ sessionStorage'da selected_address_id var mı?
    │   ├─ EVET → Header'ı güncelle, devam et
    │   └─ HAYIR → Aşağı devam
    │
    ├─ CustomerUsersService.getById(userId)
    │   └─ last_selected_branch_id var mı?
    │       ├─ EVET → BranchesService.getById() ile kontrol
    │       │   ├─ Aktif + aynı müşteri → Bu şubeyi kullan
    │       │   └─ Aktif değil veya farklı müşteri → Aşağı devam
    │       └─ HAYIR → Aşağı devam
    │
    ├─ BranchesService.getByCustomerId(customerId)
    │   └─ İlk sonuç (is_default=true) → Bu şubeyi kullan
    │
    ▼
sessionStorage güncelle + Header'ı güncelle
    │
    ▼
evaluateDealerForBranch(branchId)
    │
    └─ Şubenin konumuna göre uygun bayi belirle
    │
    ▼
window.location.reload() (şube değiştiyse)
```

---

## 5. Adres Seçim Modal'ı

### 5.1. Açılma

Pill butona tıklandığında `openAddressModal()` fonksiyonu çalışır.

### 5.2. Modal Yapısı

```
┌─────────────────────────────────────────────┐
│  Adreslerim                                  │
│  Teklif almak veya sipariş vermek            │
│  istediğiniz iş yerinizi seçin.             │
├─────────────────────────────────────────────┤
│                                              │
│  ◉ Güloğlu Ticaret-Kadıköy          ← seçili│
│    Caferağa Mah, Moda Cad. Kadıköy/İstanbul │
│                                              │
│  ○ Güloğlu Ticaret-Beşiktaş                 │
│    Sinanpaşa Mah, Beşiktaş/İstanbul         │
│                                              │
│  ○ Güloğlu Ticaret-Ankara                   │
│    Çankaya, Ankara                           │
│                                              │
├─────────────────────────────────────────────┤
│              [Devam Et]                      │
└─────────────────────────────────────────────┘
```

### 5.3. Modal Özellikleri

| Özellik | Değer |
|---------|-------|
| **Genişlik** | 450px (max %90) |
| **Maksimum yükseklik** | 80vh (kaydırılabilir) |
| **Overlay** | Tam ekran, yarı-şeffaf siyah (z-index: 1000) |
| **Kapatma** | Overlay'e tıklama veya ESC |
| **Başlık** | "Adreslerim" |
| **Alt metin** | "Teklif almak veya sipariş vermek istediğiniz iş yerinizi seçin." |

### 5.4. Şube Listesi

- **Veri kaynağı:** `AddressesService.getByCustomerId(customerId)` (veya `BranchesService`)
- **Filtre:** Sadece `is_active=true` şubeler
- **Sıralama:** `is_default DESC` (Merkez önce), sonra `created_at DESC`
- **Seçili gösterim:** Kırmızı kenarlık + açık kırmızı arka plan (`#fff5f5`)
- **Varsayılan seçili:** Mevcut `selected_address_id` ile eşleşen veya `is_default=true`

### 5.5. Boş Durum

Hiç şube yoksa:

```
Henüz kayıtlı şubeniz yok.
[Şube eklemek için tıklayın] → isyerim-musteri-adreslerim.html
```

### 5.6. "Devam Et" Butonu

- **Başlangıçta:** Devre dışı (disabled)
- **Aktif olma koşulu:** Bir şube seçildiğinde
- **Tıklandığında:** `confirmAddressSelection()` çağrılır

---

## 6. Şube Değişikliği Onayı

`confirmAddressSelection()` fonksiyonunun davranışı:

### 6.1. Aynı Şube Seçilirse

```
→ Modal kapanır
→ Başka hiçbir şey olmaz
```

### 6.2. Farklı Şube Seçilirse

```
1. sessionStorage güncellenir
   ├─ selected_address_id = yeni şube ID
   └─ selected_address_name = yeni şube adı

2. Veritabanına kaydedilir
   └─ CustomerUsersService.updateLastSelectedBranch(userId, branchId)
   └─ customer_users.last_selected_branch_id güncellenir

3. Sepet temizlenir
   └─ CartService.clearCart()
   └─ sessionStorage + Supabase cart_items silme

4. Sayfa yeniden yüklenir
   └─ window.location.reload()

5. Yeniden yükleme sırasında:
   └─ loadSelectedAddress() → Header güncellenir
   └─ evaluateDealerForBranch() → Yeni şubenin konumuna uygun bayi bulunur
   └─ Fiyatlar, ürünler, teklifler yeni şubeye/bayiye göre yenilenir
```

---

## 7. Şube Değişikliğinin Yan Etkileri

### 7.1. Etkilenen Bileşenler

| Bileşen | Etki |
|---------|------|
| **Sepet** | Tamamen temizlenir |
| **Bayi** | Yeniden değerlendirilir (farklı bayi atanabilir) |
| **Fiyatlar** | Yeni bayiye göre fiyatlar yenilenir |
| **Teklifler** | Şubeye ait teklifler gösterilir |
| **Son Siparişimi Tekrarla** | Yeni şubenin son siparişi gösterilir |
| **Bildirimler** | Etkilenmez (şube filtresi yok) |
| **Badge (sepet)** | 0'a düşer |

### 7.2. Bayi Değerlendirme Mantığı

`evaluateDealerForBranch(branchId)` fonksiyonu:

```
1. Merkez şubeyi bul (is_default=true)

2. Seçilen şubenin şehrini Merkez ile karşılaştır
   ├─ Aynı şehir → isyerim_branch_in_offer_city = "true"
   │                 Bayi araması Merkez şubenin konumuna göre yapılır
   └─ Farklı şehir → isyerim_branch_in_offer_city = "false"
                      Bayi araması seçilen şubenin konumuna göre yapılır

3. Aktif teklifleri kontrol et
   └─ Eğer kilitli bayi varsa → Otomatik seçim

4. Uygun bayileri ara
   └─ DealersService.getByDistrictWithMikroPazar(şehir, ilçe, ilçeId)
   └─ Hem birincil ilçe hem de Mikro Pazar (dealer_districts) tablosu kontrol edilir

5. Sonuç:
   ├─ 0 bayi → Bayi temizlenir, "bayi bulunamadı" uyarısı
   ├─ 1 bayi → Otomatik seçilir
   └─ 2+ bayi → Bayi seçim modal'ı gösterilir
```

---

## 8. Veri Çekme Sıklığı

### 8.1. Şube Verisi Ne Zaman Çekilir?

| Olay | Sorgu | Cache |
|------|-------|-------|
| Sayfa yüklenmesi (sessionStorage boşsa) | `BranchesService.getByCustomerId()` | Yok — her seferinde Supabase'den |
| Sayfa yüklenmesi (sessionStorage doluysa) | Sorgu yapılmaz | sessionStorage kullanılır |
| Modal açıldığında | `AddressesService.getByCustomerId()` | Yok — her seferinde Supabase'den |
| Şube onaylandığında | `CustomerUsersService.updateLastSelectedBranch()` | — (yazma işlemi) |
| Son seçim yüklenmesi | `CustomerUsersService.getById()` + `BranchesService.getById()` | Yok |

### 8.2. Özet

- **Explicit caching mekanizması yok** — her modal açılışında ve sayfa yüklemesinde (sessionStorage boşsa) Supabase sorgusu yapılır
- **sessionStorage** hız optimizasyonu sağlar — dolu olduğu sürece DB'ye gidilmez
- **Veritabanı kaydı** (`last_selected_branch_id`) oturumlar arası kalıcılık sağlar

---

## 9. Şube ile Teklif İlişkisi

### 9.1. Teklifler Şubeye Bağlıdır

`offers` tablosunda `customer_branch_id` kolonu mevcuttur:
- Teklif belirli bir şube için geçerlidir
- Şube değiştiğinde farklı teklifler uygulanabilir

### 9.2. Aynı Şehir / Farklı Şehir Kuralı

| Durum | Teklif Davranışı |
|-------|-----------------|
| Seçilen şube, Merkez ile **aynı şehirde** | Mevcut teklif geçerli kalır |
| Seçilen şube, Merkez'den **farklı şehirde** | Farklı bayi/teklif gerekebilir |

### 9.3. Şube Silme/Düzenleme ve Teklif Etkisi

Şube silindiğinde veya şehri değiştirildiğinde:

| Senaryo | Davranış |
|---------|----------|
| Silinen şubenin aktif teklifi var, aynı şehirde başka şube var | Teklifler varsayılan şubeye taşınır |
| Silinen şubenin aktif teklifi var, aynı şehirde başka şube yok | Teklifler iptal edilir |
| Şubenin şehri değiştirildi | Teklif uyumluluğu yeniden değerlendirilir |

---

## 10. Adres Tamamlama Overlay'i

### 10.1. Ne Zaman Gösterilir?

Sipariş veya teklif işlemi öncesinde, seçili şubenin adres bilgileri eksikse `AddressCompletionOverlay` açılır.

### 10.2. Kontrol Edilen Alanlar

| Alan | Zorunluluk |
|------|-----------|
| İl (city) | Zorunlu |
| İlçe (district) | Zorunlu |
| Mahalle (neighborhood) | Koşullu |
| Cadde/Sokak (street) | Opsiyonel |
| Bina No (building_no) | Opsiyonel |
| Daire (apartment) | Opsiyonel |

### 10.3. Akış

```
Sipariş/Teklif işlemi tetiklenir
    │
    ▼
AddressCompletionOverlay.checkAndProceed(branchId, callback)
    │
    ├─ Tüm gerekli alanlar dolu? → callback() çağrılır (devam et)
    └─ Eksik alan var? → Overlay açılır
        │
        ├─ Kullanıcı eksik alanları doldurur
        ├─ Kaydet → Şube kaydı güncellenir
        └─ callback() çağrılır (devam et)
```

---

## 11. Şube Yönetim Sayfası

**Dosya:** `isyerim-musteri-adreslerim.html`

### 11.1. Sayfa İçeriği

- Tüm şubelerin listesi
- Merkez şube "Merkez" badge'i ile işaretli
- Şube bazlı puan takibi aktifse "Şube Puanı" badge'i
- Yeni şube ekleme (slide panel)
- Şube düzenleme
- Şube silme (Merkez hariç)

### 11.2. Yönetim Kısıtlaması

Müşterinin `management_restricted = true` ise:
- Ekleme/düzenleme/silme butonları gizlenir
- Bilgi notu: "Şube yönetimi için lütfen bayinizle iletişime geçin."

### 11.3. Şube Ekleme Formu

Hiyerarşik adres seçimi:

```
İl seçimi → İlçe listesi yüklenir
    → İlçe seçimi → Mahalle listesi yüklenir
        → Mahalle seçimi → Cadde/Sokak listesi yüklenir
            → Cadde/Sokak seçimi (veya serbest metin)
                → Bina No, Daire, Adres Tarifi
                    → Şube Adı
```

- **Veri kaynağı:** `LocationsService` (şehirler → ilçeler → mahalleler → sokaklar)
- **Serbest metin:** Mahalle ve sokak bulunamazsa manuel giriş desteklenir
- **Merkez şube:** İlk şube `is_default=true` ile oluşturulur

---

## 12. Veritabanı Şeması

### 12.1. customer_branches Tablosu

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `customer_id` | UUID | FK → customers (CASCADE DELETE) |
| `branch_name` | VARCHAR(255) | Şube görüntüleme adı |
| `name` | VARCHAR(255) | Alternatif ad alanı |
| `address` | TEXT | Adres metni |
| `full_address` | TEXT | Hesaplanmış tam adres |
| `city_id` | UUID | FK → cities |
| `district_id` | UUID | FK → districts |
| `neighborhood_id` | UUID | FK → neighborhoods |
| `street_id` | UUID | FK → streets |
| `building_no` | VARCHAR | Bina numarası |
| `apartment` | VARCHAR | Daire numarası |
| `branch_description` | TEXT | Adres tarifi / yol tarifi |
| `phone` | VARCHAR(20) | Şube telefonu |
| `is_default` | BOOLEAN | Merkez şube mi? (varsayılan: false) |
| `is_active` | BOOLEAN | Aktif mi? (varsayılan: true) |
| `security_q1` – `security_q4` | BOOLEAN | Güvenlik soruları |
| `security_accepted_at` | TIMESTAMPTZ | Güvenlik onay zamanı |
| `points_collection_mode` | VARCHAR | `"customer"` veya `"branch"` |
| `created_at` | TIMESTAMPTZ | Oluşturulma |
| `updated_at` | TIMESTAMPTZ | Güncellenme |

**İndeksler:**
- `idx_customer_branches_customer` → (customer_id)
- `idx_customer_branches_city` → (city_id)
- `idx_customer_branches_district` → (district_id)
- `idx_customer_addresses_neighborhood_id` → (neighborhood_id)
- `idx_customer_addresses_street_id` → (street_id)

### 12.2. customer_users — Son Seçim Kalıcılığı

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `last_selected_branch_id` | UUID | FK → customer_branches — Kullanıcının son seçtiği şube |

### 12.3. customer_user_branches — Personel Şube İzinleri

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `customer_user_id` | UUID | FK → customer_users |
| `branch_id` | UUID | FK → customer_branches |

### 12.4. dealer_districts — Bayi Kapsama Alanı (Mikro Pazar)

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `dealer_id` | UUID | FK → dealers |
| `district_id` | UUID | FK → districts |

**Unique constraint:** `(dealer_id, district_id)`

---

## 13. sessionStorage Anahtarları

| Anahtar | Değer | Açıklama |
|---------|-------|----------|
| `selected_address_id` | UUID | Seçili şube ID |
| `selected_address_name` | String | Seçili şube adı |
| `selected_address` | String | Tam adres metni |
| `isyerim_branch_in_offer_city` | `"true"` / `"false"` | Seçili şube Merkez ile aynı şehirde mi? |
| `isyerim_user_city` | String | Şubenin şehir adı |
| `isyerim_user_district` | String | Şubenin ilçe adı |
| `isyerim_user_city_id` | UUID | Şehir ID |
| `isyerim_user_district_id` | UUID | İlçe ID |

---

## 14. Veri Akış Diyagramı

```
Sayfa Yüklenir
    │
    ▼
loadSelectedAddress()
    │
    ├─ sessionStorage dolu? ──── EVET → Header güncelle, evaluateDealerForBranch()
    │
    └─ HAYIR
        │
        ├─ customer_users.last_selected_branch_id var mı?
        │   ├─ EVET + aktif + aynı müşteri → sessionStorage yaz, sayfa yenile
        │   └─ HAYIR → Aşağı devam
        │
        └─ BranchesService.getByCustomerId()
            └─ İlk sonuç (Merkez) → sessionStorage yaz, sayfa yenile

Kullanıcı pill butona tıklar
    │
    ▼
openAddressModal()
    │
    ├─ Supabase'den tüm aktif şubeleri çek
    ├─ Modal'ı render et (seçili şube işaretli)
    └─ "Devam Et" butonu → confirmAddressSelection()
        │
        ├─ Aynı şube? → Modal kapanır, hiçbir şey olmaz
        │
        └─ Farklı şube?
            ├─ sessionStorage güncelle
            ├─ DB'ye kaydet (last_selected_branch_id)
            ├─ Sepeti temizle (CartService.clearCart())
            └─ Sayfa yenile (window.location.reload())
                │
                ▼
            evaluateDealerForBranch(yeniŞubeId)
                │
                ├─ Merkez ile şehir karşılaştır
                ├─ Uygun bayileri ara (ilçe + Mikro Pazar)
                │
                ├─ 0 bayi → Uyarı göster
                ├─ 1 bayi → Otomatik seç
                └─ 2+ bayi → Bayi seçim modal'ı
```

---

## 15. Edge Case'ler ve Özel Durumlar

| Senaryo | Davranış |
|---------|----------|
| Hiç şube yoksa | Modal'da boş durum mesajı + şube ekleme linki |
| Tek şube varsa (sadece Merkez) | Modal'da tek seçenek, değiştirme imkanı yok |
| sessionStorage temizlenmişse | DB'den `last_selected_branch_id` okunur |
| Son seçilen şube silinmişse | Validasyon geçemez, Merkez şubeye düşer |
| Son seçilen şube pasife alınmışsa | `is_active=false` filtresi yakalar, Merkez'e düşer |
| Farklı şehirde şube seçilirse | Farklı bayi atanabilir, sepet temizlenir |
| Aynı şehirde farklı ilçede şube seçilirse | Aynı bayi kalabilir (Mikro Pazar kapsamına bağlı) |
| Şubenin bölgesinde bayi yoksa | Bayi temizlenir, uyarı gösterilir |
| Şubenin bölgesinde birden fazla bayi varsa | Bayi seçim modal'ı açılır |
| Mobil cihazda (≤768px) | Pill buton gizlidir, alternatif erişim yolu gerekir |
| Yönetim kısıtlamalı müşteri | Şube ekleme/düzenleme/silme engellenir |
| Şube silinirken aktif teklif varsa | Teklifler taşınır veya iptal edilir (bkz. Bölüm 9.3) |
| Şube şehri değiştirilirse | Teklif uyumluluğu yeniden değerlendirilir |

---

## 16. Servis Metotları Referansı

### BranchesService (`js/services/branches-service.js`)

| Metot | Açıklama |
|-------|----------|
| `getByCustomerId(customerId)` | Müşterinin tüm aktif şubelerini getirir (is_default DESC sıralı) |
| `getById(branchId)` | Tek şubeyi getirir |
| `create(branchData)` | Yeni şube oluşturur (full_address hesaplar) |
| `update(id, branchData)` | Şubeyi günceller |
| `delete(id)` | Şubeyi siler (hard delete) |
| `setDefault(id, customerId)` | Merkez şubeyi değiştirir |
| `buildFullAddress(branchData)` | Adres parçalarından tam adres oluşturur |
| `isBranchInDealerCoverage(dealerId, branchId)` | Şube bayinin kapsama alanında mı? |
| `getByCustomerIdInDealerCoverage(customerId, dealerId)` | Bayinin kapsadığı şubeler |
| `getByCustomerIdOutsideDealerCoverage(customerId, dealerId)` | Bayinin kapsamadığı şubeler |
| `hasSecurityAnswers(branchId)` | Güvenlik soruları cevaplanmış mı? |
| `updateSecurityAnswers(branchId, answers)` | Güvenlik sorularını kaydet |

### CustomerUsersService (`js/services/customer-users-service.js`)

| Metot | Açıklama |
|-------|----------|
| `updateLastSelectedBranch(userId, branchId)` | Son seçilen şubeyi DB'ye kaydet |
| `getBranches(userId)` | Kullanıcının izinli şubelerini getir |
| `getBranchIds(userId)` | İzinli şube ID'lerini getir |
| `addBranchPermission(userId, branchId)` | Şube izni ekle |
| `removeBranchPermission(userId, branchId)` | Şube iznini kaldır |
| `hasPermission(userId, branchId)` | Belirli şubeye izin var mı? |

### LocationsService (`js/services/locations-service.js`)

| Metot | Açıklama |
|-------|----------|
| `getCities()` | Tüm aktif şehirler |
| `getDistrictsByCityId(cityId)` | Şehrin ilçeleri |
| `getNeighborhoodsByDistrictId(districtId)` | İlçenin mahalleleri |
| `getStreetsByNeighborhoodId(neighborhoodId)` | Mahallenin sokakları |

---

## 17. İlgili Dosyalar

| Dosya | İçerik |
|-------|--------|
| `components/isyerim-header.html` | Pill buton HTML + adres modal HTML + CSS |
| `js/component-loader.js` (satır 887-953, 1370-1519) | loadSelectedAddress, openAddressModal, confirmAddressSelection |
| `js/services/branches-service.js` | Şube CRUD + kapsama alanı kontrolleri |
| `js/services/customer-users-service.js` | Son seçim kalıcılığı + şube izinleri |
| `js/services/locations-service.js` | Şehir/ilçe/mahalle/sokak hiyerarşisi |
| `js/services/dealers-service.js` | Bayi arama (ilçe + Mikro Pazar) |
| `components/address-completion-overlay.html` | Adres tamamlama overlay'i |
| `isyerim-musteri-adreslerim.html` | Şube yönetim sayfası |
| `isyerim-musteri-adres-ekle.html` | İlk şube oluşturma (kayıt akışı) |
| `isyerim-musteri-bayi-sec.html` | Bayi seçim sayfası |
| `supabase/migrations/20260100000000_create_customer_branches.sql` | Tablo tanımı |
| `supabase/migrations/20260106000000_add_last_selected_branch.sql` | Son seçim kolonu |
| `supabase/migrations/20251230600000_create_dealer_districts.sql` | Mikro Pazar tablosu |
| `supabase/migrations/20260103000000_add_branch_to_offers.sql` | Teklif-şube ilişkisi |
