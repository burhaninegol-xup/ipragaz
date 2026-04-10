# Son Siparişimi Tekrarla — Business Logic Dokümantasyonu

> **Sayfa:** `isyerim-musteri-anasayfa.html`
> **Konum:** Slider bölümünün hemen altında, turuncu banner kartı olarak görünür
> **Son güncelleme:** 22.03.2026

---

## 1. Genel Bakış

"Son Siparişimi Tekrarla" özelliği, müşterinin en son verdiği siparişi tek tıkla yeniden oluşturmasını sağlayan bir hızlı sipariş mekanizmasıdır. Anasayfada turuncu gradient bir buton olarak gösterilir ve tıklandığında sipariş detaylarını içeren bir modal (overlay) açılır.

---

## 2. Görünürlük Koşulları

### Buton ne zaman GÖRÜNÜR?

| Koşul | Kontrol Yeri |
|-------|-------------|
| Müşteri oturum açmış olmalı | `sessionStorage.getItem('isyerim_customer_id')` |
| En az 1 tamamlanmış/aktif sipariş bulunmalı | Supabase sorgusu sonucu |
| Şube seçiliyse, o şubeye ait sipariş olmalı | `getByCustomerAndBranches()` ile filtreleme |

### Buton ne zaman GİZLİ?

- Müşteri giriş yapmamışsa → fonksiyon sessizce döner
- Hiç sipariş yoksa → section gizli kalır (`display: none`)
- Seçili şubeye ait sipariş yoksa → section gizli kalır

### Kullanıcı Seviyeleri

| Kullanıcı Tipi | Erişim |
|----------------|--------|
| **Owner (Firma Sahibi)** | Görür ve kullanabilir |
| **Staff (Personel)** | Görür ve kullanabilir |
| **Giriş yapmamış ziyaretçi** | Göremez |
| **Bayi kullanıcısı** | Bu sayfa bayilere ait değil, göremez |
| **Backoffice admin** | Bu sayfa adminlere ait değil, göremez |

> **Not:** Owner ve Staff arasında bu özellik için herhangi bir yetki farkı yoktur. Her iki seviye de aynı şekilde kullanır.

---

## 3. Buton Görünümü ve Üzerindeki Metinler

### HTML Yapısı
- **Container:** `.repeat-order-section` (ID: `repeatOrderSection`)
- **Buton:** `.btn-repeat-order` (ID: `btnRepeatOrder`)

### Buton İçeriği

```
┌─────────────────────────────────────────────────────────┐
│  🔄  Son Siparişimi Tekrarla                        ❯   │
│      {Şube Adı} - {Bayi Adı} bayisinden verdiginiz     │
│      {GG.AA.YYYY} tarihli siparişinizi                  │
│      tekrarlayabilirsiniz.                              │
└─────────────────────────────────────────────────────────┘
```

### Dinamik Metin Oluşturma Kuralları

| Durum | Gösterilen Metin |
|-------|-----------------|
| Şube + Bayi bilgisi mevcut | `"{branchName} - {dealerName} bayisinden verdiginiz {tarih} tarihli siparişinizi tekrarlayabilirsiniz."` |
| Sadece Bayi bilgisi mevcut | `"{dealerName} bayisinden verdiginiz {tarih} tarihli siparişinizi tekrarlayabilirsiniz."` |
| Bayi bilgisi eksik | `"Bayi bayisinden verdiginiz {tarih} tarihli siparişinizi tekrarlayabilirsiniz."` |

- **Tarih formatı:** `DD.MM.YYYY` (örn: 22.03.2026)
- **Başlık:** Her zaman sabit → `"Son Siparişimi Tekrarla"`

### Görsel Tasarım
- **Arka plan:** Turuncu gradient (`#ff8c42` → `#e67635`)
- **Köşe yuvarlaklığı:** 16px
- **Gölge:** Turuncu parıltı efekti
- **Hover:** 1.02x büyüme + güçlendirilmiş gölge
- **Sol ikon:** Döngü/yenileme SVG ikonu
- **Sağ ikon:** Chevron (ok) ikonu

---

## 4. Modal (Overlay) Yapısı ve İçeriği

Butona tıklandığında `openRepeatOrderModal()` fonksiyonu çalışır ve tam ekran bir overlay açılır.

### Modal Başlık
```
Son Siparişi Tekrarla                                    ✕
─────────────────────────────────────────────────────────
```

### Modal İçerik Bölümleri (Yukarıdan Aşağıya)

#### 4.1. Teslimat Adresi Bölümü
- **Koşul:** Sadece şube seçiliyse gösterilir
- **İçerik:** Şube adı ve açık adresi
- **Görsel:** Turuncu sol kenarlık, açık turuncu arka plan (`#fff5f0`)
- **Veri kaynağı:** `BranchesService.getById(branchId)` → `branch_name`, `address`

#### 4.2. Bayi Bilgisi Bölümü
- **İçerik:**
  - Bayi adı (bold)
  - Telefon numarası (varsa)
  - Konum bilgisi (varsa)
- **Görsel:** Gri arka plan, harita ikonu
- **Veri kaynağı:** `lastOrder.dealer` nesnesi

#### 4.3. Sipariş Kalemleri Listesi
Her ürün için bir kart gösterilir:

```
┌──────────────────────────────────────────┐
│  [Ürün Resmi]  Ürün Adı                 │
│                x{adet}                   │
│                {birimFiyat}₺  Toplam: {toplamFiyat}₺ │
└──────────────────────────────────────────┘
```

**Fiyat Gösterim Kuralları:**

| Durum | Gösterim |
|-------|----------|
| Teklif fiyatı varsa | ~~Perakende fiyat~~ üstü çizili + Teklif fiyatı gösterilir |
| Teklif yoksa, şehir fiyatı varsa | Şehir bazlı perakende fiyat gösterilir |
| Hiçbiri yoksa | Ürün base_price gösterilir |

> **KRİTİK:** Modal'da gösterilen fiyatlar her zaman **güncel fiyatlardır**, orijinal siparişteki fiyatlar değil. Fiyat değişmişse müşteri yeni fiyatı görür.

#### 4.4. Teslimat Saati Seçimi
3 sabit zaman dilimi sunulur (3'lü grid):

| Slot | Etiket | Saat Aralığı |
|------|--------|-------------|
| 1 | Sabah | 09:00 - 12:00 |
| 2 | Öğle | 12:00 - 15:00 |
| 3 | Akşam | 15:00 - 18:00 |

- **Varsayılan:** İlk slot (Sabah) otomatik seçili gelir
- **Seçim:** Tek seçim, tıklanan slot kırmızı kenarlık + açık pembe arka plan alır

#### 4.5. Ödeme Yöntemi Seçimi
Radio button grubu:

| Seçenek | Değer |
|---------|-------|
| Nakit | `cash` |
| Kredi Kartı | `credit_card` |

- **Varsayılan:** Orijinal siparişin ödeme yöntemi (`lastOrder.payment_method`) seçili gelir

#### 4.6. Toplam Özeti
```
┌─────────────────────────────────────────┐
│  Toplam Tutar:              {tutar} ₺   │
│  Kazanılacak Puan:          {puan}      │
└─────────────────────────────────────────┘
```

- **Tutar hesaplama:** Σ (güncelBirimFiyat × adet) tüm kalemler için
- **Puan hesaplama:** Σ (puanPerUnit × adet) tüm kalemler için
- **Puan formülü:** `CartService.calculatePointsFromPrice()` → 1 TL = 1 puan

---

## 5. CTA Butonları ve Davranışları

Modal'ın alt kısmında yan yana iki buton bulunur:

### 5.1. "Siparişi Düzenle" Butonu (Sol - Turuncu Kenarlıklı)

**Fonksiyon:** `editRepeatOrder()`

**Davranış Akışı:**
1. Mevcut sepeti tamamen temizler → `CartService.clearCart()`
2. Orijinal siparişteki her kalemi sepete ekler → `CartService.addItem()`
3. Sepet badge sayısını günceller
4. Modal'ı kapatır
5. Sepet sayfasına yönlendirir → `isyerim-musteri-sepet.html`

**Önemli Detaylar:**
- Sepete eklenen ürünlerde **orijinal siparişteki fiyatlar** kullanılır (güncel fiyat değil)
- Ürün kodu, adı, resmi, depozito fiyatı orijinal siparişten kopyalanır
- Müşteri sepette miktarları değiştirebilir, ürün ekleyip çıkarabilir

### 5.2. "Sipariş Ver" Butonu (Sağ - Kırmızı Dolgulu)

**Fonksiyon:** `submitRepeatOrder()`

**Validasyon Kontrolleri:**
1. `lastOrder` nesnesi mevcut olmalı
2. Teslimat saati seçilmiş olmalı (`selectedTimeSlot`)
3. Ödeme yöntemi seçilmiş olmalı

**Başarısız validasyon:** Alert mesajı gösterilir, işlem durur.

**Sipariş Oluşturma Akışı:**
1. Yeni sipariş verisi hazırlanır:
   - `customer_id`: sessionStorage'dan
   - `dealer_id`: sessionStorage veya lastOrder'dan
   - `customer_branch_id`: sessionStorage veya lastOrder'dan
   - `delivery_date`: Bugünün tarihi (ISO format)
   - `delivery_time`: Seçilen zaman dilimi
   - `payment_method`: Seçilen radio değeri
   - `status`: `waiting_for_assignment`
   - `total_amount`: Hesaplanan güncel toplam
   - `total_points`: Hesaplanan toplam puan
2. Sipariş kalemleri hazırlanır (her ürün için):
   - `product_id`: Orijinal ürün ID'si
   - `quantity`: Orijinal adet
   - `unit_price`: **Güncel fiyat** (PriceResolverService'den)
   - `total_price`: Güncel birim fiyat × adet
   - `points`: Güncel fiyattan hesaplanan puan
3. `OrdersService.create(orderData, orderItems)` çağrılır
4. Timeline kaydı oluşturulur → `OrdersService.logOrderCreated()`
5. Modal kapatılır
6. Sipariş özet sayfasına yönlendirilir → `isyerim-musteri-siparis-ozet.html?order_id={id}`

**Hata durumu:** Alert ile hata mesajı gösterilir, buton tekrar aktif edilir.

### CTA Butonları Karşılaştırması

| Özellik | Siparişi Düzenle | Sipariş Ver |
|---------|-----------------|-------------|
| **Renk** | Turuncu kenarlık, beyaz dolgu | Kırmızı gradient dolgu |
| **Flex oranı** | 1 (dar) | 2 (geniş) |
| **Kullanılan fiyat** | Orijinal sipariş fiyatı | Güncel fiyat |
| **Yönlendirme** | Sepet sayfası | Sipariş özet sayfası |
| **Sipariş oluşur mu?** | Hayır (sepete eklenir) | Evet (anında oluşur) |
| **Düzenleme imkanı** | Var (sepette) | Yok (direkt onaylanır) |

---

## 6. Fiyat Çözümleme Mantığı (PriceResolverService)

Modal açıldığında ürünlerin güncel fiyatları şu öncelik sırasıyla çözümlenir:

```
1. Kabul edilmiş teklif fiyatı (en yüksek öncelik)
   └─ OffersService.getAcceptedOffer(dealerId, customerId)
   └─ offer_details[].unit_price

2. Şehir bazlı perakende fiyat
   └─ RetailPricesByCityService.getByCityId(cityId)
   └─ retail_price (ürün bazında)

3. Ürün taban fiyatı (fallback)
   └─ product.base_price
```

> **Dikkat:** Eğer ürünün hiçbir fiyat kaynağında değeri yoksa, fiyat 0 olarak gösterilir.

---

## 7. Veritabanı Yapısı

### 7.1. orders Tablosu

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `order_number` | VARCHAR(50) | Otomatik üretilir: `ORD-YYYYMMDD-xxxxxx` |
| `customer_id` | UUID | FK → customers |
| `dealer_id` | UUID | FK → dealers |
| `customer_branch_id` | UUID | FK → customer_branches |
| `status` | VARCHAR(50) | Sipariş durumu |
| `total_amount` | NUMERIC(12,2) | Toplam tutar |
| `total_points` | INTEGER | Toplam puan |
| `delivery_address` | TEXT | Teslimat adresi |
| `delivery_date` | DATE | Teslimat tarihi |
| `delivery_time` | VARCHAR(50) | Zaman dilimi (ör: "09:00-12:00") |
| `payment_method` | VARCHAR(50) | Ödeme yöntemi |
| `notes` | TEXT | Notlar |
| `created_at` | TIMESTAMPTZ | Oluşturulma zamanı |
| `updated_at` | TIMESTAMPTZ | Güncellenme zamanı |

**Sipariş Durumları:**

| Durum | Açıklama |
|-------|----------|
| `waiting_for_assignment` | Sipariş verildi, bayi ataması bekleniyor |
| `on_the_way` | Sipariş yolda |
| `completed` | Teslim edildi |
| `cancelled` | İptal edildi |

### 7.2. order_items Tablosu

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `order_id` | UUID | FK → orders (CASCADE DELETE) |
| `product_id` | UUID | FK → products |
| `quantity` | INTEGER | Adet |
| `unit_price` | NUMERIC(10,2) | Birim fiyat |
| `total_price` | NUMERIC(10,2) | Toplam fiyat |
| `points` | INTEGER | Kazanılan puan |
| `created_at` | TIMESTAMPTZ | Oluşturulma zamanı |

### 7.3. order_status_history Tablosu

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `order_id` | UUID | FK → orders (CASCADE DELETE) |
| `old_status` | VARCHAR(50) | Önceki durum |
| `new_status` | VARCHAR(50) | Yeni durum |
| `changed_by_type` | VARCHAR(20) | `customer` / `dealer` / `system` |
| `changed_by_id` | UUID | Değişikliği yapan kullanıcı |
| `notes` | TEXT | Değişiklik notu |
| `created_at` | TIMESTAMPTZ | Değişiklik zamanı |

### 7.4. Supabase Sorgusu — Son Siparişi Getir

```
Tablo: orders
Select: *, customer(*), branch:customer_branches(*), order_items(*, product:products(*))
Filtre: customer_id = {müşteriId} AND customer_branch_id = {şubeId}
Sıralama: created_at DESC
Limit: 1
```

Şube seçili değilse `customer_branch_id` filtresi kaldırılır.

---

## 8. Veri Akış Diyagramı

```
Sayfa Yüklenir
    │
    ▼
loadLastOrder()
    │
    ├─ Müşteri giriş yapmamış? → Sessizce çık, buton gizli kalır
    │
    ├─ Şube seçili?
    │   ├─ Evet → OrdersService.getByCustomerAndBranches(customerId, [branchId], limit=1)
    │   └─ Hayır → OrdersService.getByCustomerId(customerId, limit=1)
    │
    ├─ Sipariş bulundu?
    │   ├─ Evet → lastOrder = sipariş verisi
    │   │         → Buton görünür yapılır (.visible class)
    │   │         → Dinamik açıklama metni yazılır
    │   └─ Hayır → Buton gizli kalır
    │
    ▼
Kullanıcı butona tıklar
    │
    ▼
openRepeatOrderModal()
    │
    ├─ Loading gösterilir
    ├─ PriceResolverService ile güncel fiyatlar çözümlenir
    ├─ Modal içeriği dinamik oluşturulur
    │   ├─ Teslimat adresi
    │   ├─ Bayi bilgisi
    │   ├─ Ürün kalemleri (güncel fiyatlarla)
    │   ├─ Zaman dilimi seçimi (ilk slot seçili)
    │   ├─ Ödeme yöntemi (orijinalden varsayılan)
    │   └─ Toplam tutar & puan
    ├─ Overlay açılır
    │
    ▼
Kullanıcı seçim yapar
    │
    ├─── "Siparişi Düzenle" tıklar ──────────────────┐
    │                                                  ▼
    │                                        editRepeatOrder()
    │                                          ├─ Sepet temizlenir
    │                                          ├─ Ürünler sepete eklenir
    │                                          │   (orijinal fiyatlarla)
    │                                          ├─ Modal kapanır
    │                                          └─ → isyerim-musteri-sepet.html
    │
    └─── "Sipariş Ver" tıklar ───────────────────────┐
                                                       ▼
                                             submitRepeatOrder()
                                               ├─ Validasyon
                                               ├─ OrdersService.create()
                                               │   (güncel fiyatlarla)
                                               ├─ Timeline log oluşturulur
                                               ├─ Modal kapanır
                                               └─ → isyerim-musteri-siparis-ozet.html
```

---

## 9. Edge Case'ler ve Özel Durumlar

| Senaryo | Davranış |
|---------|----------|
| Müşterinin hiç siparişi yok | Buton hiç gösterilmez |
| Seçili şubeye ait sipariş yok | Buton gösterilmez |
| Ürün fiyatı değişmiş | Modal'da güncel fiyat gösterilir |
| Ürünün teklif fiyatı var | Perakende fiyat üstü çizili, teklif fiyatı gösterilir |
| Ürünün hiçbir fiyatı yok | 0 ₺ olarak gösterilir |
| Bayi bilgisi eksik | "Bayi" olarak fallback gösterilir |
| Bayi telefon/konum eksik | İlgili alan boş bırakılır |
| Zaman dilimi seçilmeden sipariş ver | Alert uyarısı, işlem engellenir |
| Ödeme yöntemi seçilmeden sipariş ver | Alert uyarısı, işlem engellenir |
| Sipariş oluşturma hatası | Alert ile hata mesajı, buton tekrar aktif |
| Tekrarlanan sipariş ile mevcut teklif çakışması | Bağımsız çalışır, çakışma yok |

---

## 10. İlgili Dosyalar

| Dosya | İçerik |
|-------|--------|
| `isyerim-musteri-anasayfa.html` (satır 160-202, 448-463) | HTML yapısı: buton + modal |
| `js/isyerim-musteri-anasayfa.js` (satır 736-1193) | Tüm business logic |
| `css/isyerim-musteri-anasayfa.css` (satır 1070-1518) | Stil tanımları |
| `js/services/orders-service.js` | Sipariş CRUD işlemleri |
| `js/services/price-resolver-service.js` | 3 kademeli fiyat çözümleme |
| `js/services/cart-service.js` | Sepet yönetimi |
| `js/services/branches-service.js` | Şube bilgisi sorgulama |
| `js/services/offers-service.js` | Teklif fiyatı kontrolü |
| `supabase/migrations/20251226143645_remote_schema.sql` | orders & order_items tabloları |
| `supabase/migrations/20251231000000_create_order_status_history.sql` | Durum geçmişi tablosu |
| `supabase/migrations/20260102000000_add_customer_branch_id_to_orders.sql` | Şube desteği |
