# Sepet (Shopping Cart) — Business Logic Dokümantasyonu

> **Konum:** Header üst çubuğundaki (top bar) sepet ikonu
> **Portal:** Yalnızca Müşteri portalı (`isyerim-musteri-*`)
> **Son güncelleme:** 22.03.2026

---

## 1. Genel Bakış

Sepet sistemi, müşterilerin ürün ekleyip sipariş oluşturmasını sağlayan hibrit bir yapıdır. Hızlı UI güncellemeleri için `sessionStorage`, oturumlar arası kalıcılık için Supabase `cart_items` tablosu kullanılır. Sepet ikonu header'ın üst çubuğunda (top bar) yer alır ve tıklandığında doğrudan sepet sayfasına yönlendirir.

---

## 2. Görünürlük Koşulları

### Sepet İkonu Kimlere Görünür?

| Kullanıcı Tipi | Sepet İkonu | Açıklama |
|----------------|-------------|----------|
| **Müşteri — Owner** | ✅ Görünür | Tam erişim, sepet kullanabilir |
| **Müşteri — Staff** | ✅ Görünür | Tam erişim, sepet kullanabilir |
| **Bayi** | ❌ Görünmez | Bayi header'ında iç sepet yok (harici sisteme link var) |
| **Backoffice Admin** | ❌ Görünmez | Admin panelinde sepet özelliği yok |
| **Giriş yapmamış** | ❌ Görünmez | Müşteri portalına erişim yok |

> **Not:** Bayi portalında (`bayi-header.html`) farklı bir sepet ikonu bulunur, ancak bu ikon harici bir sisteme (`https://ipappbayi.ipragaz.com.tr/bayi/tr/cart`) yönlendirir ve bu dokümandaki iç sepet sistemiyle ilgisi yoktur.

---

## 3. Header UI — Sepet İkonu ve Badge

### 3.1. HTML Yapısı

**Dosya:** `components/isyerim-top-bar.html` (satır 68-75)

```
┌────────┐
│  🛒 [3] │  ← Sepet ikonu + ürün adedi badge'i
└────────┘
```

**Elementler:**
- **Sepet ikonu:** `.cart-link` (ID: `cartLink`) — SVG alışveriş sepeti ikonu
- **Badge:** `.cart-badge` (ID: `cartBadge`) — Kırmızı yuvarlak sayaç

### 3.2. Badge Hesaplama

```
Toplam ürün adedi = CartService.getItemCount()
  → Tüm ürünlerin quantity değerlerinin toplamı (farklı ürün sayısı değil)

Gösterim:
  - 0 ise → Badge gizlenir (display: none)
  - 1+ ise → Badge gösterilir, sayı yazılır
```

### 3.3. Badge Güncelleme Zamanları

Badge şu durumlarda güncellenir:
- Sayfa ilk yüklendiğinde (`ComponentLoader` başlatılırken)
- `cartUpdated` event'i tetiklendiğinde (her sepet değişikliğinde)
- `CartService.addItem()`, `removeItem()`, `updateQuantity()`, `clearCart()` çağrıldığında

### 3.4. Görsel Özellikler

- **Badge rengi:** Kırmızı (`#e31e24`)
- **Badge boyutu:** 18px yükseklik, yuvarlak (border-radius: 50%)
- **Badge konumu:** İkonun sağ üstünde (absolute, top: -8px, right: -8px)
- **Yazı:** 11px, bold, beyaz

---

## 4. Sepet Linkinin Dinamik Davranışı

Sepet ikonuna tıklandığında **her zaman** bir sayfaya yönlendirme yapılır (dropdown/popover açılmaz).

### Yönlendirme Kuralı

| Durum | Hedef Sayfa | Açıklama |
|-------|-------------|----------|
| Aktif (kabul edilmiş) teklif **var** | `isyerim-musteri-sepet.html` | Normal sepet sayfası |
| Aktif teklif **yok** | `isyerim-musteri-teklif-iste.html` | Teklif talep sayfası |

**Kontrol mekanizması:** `ComponentLoader.updateCartLink()` fonksiyonu müşterinin kabul edilmiş aktif teklifi olup olmadığını Supabase'den sorgular ve link hedefini buna göre günceller.

> **Neden?** Aktif teklifi olmayan müşteri ürün fiyatlarını göremez, dolayısıyla önce teklif alması gerekir.

---

## 5. Veri Saklama Mimarisi

### 5.1. Hibrit Yaklaşım

```
┌─────────────────────┐         ┌──────────────────────┐
│   sessionStorage     │ ◄─────► │   Supabase DB        │
│   (isyerim_cart)     │  sync   │   (cart_items)       │
│   Hızlı UI okuma     │         │   Kalıcı depolama    │
└─────────────────────┘         └──────────────────────┘
```

### 5.2. sessionStorage Yapısı

**Anahtar:** `isyerim_cart`

```json
{
  "items": [
    {
      "id": "uuid",
      "code": "LPG-12KG",
      "name": "12 Kg Tüp",
      "price": 450.00,
      "priceType": "offer",
      "priceLabel": "Size Özel",
      "points": 450,
      "image_url": "https://...",
      "quantity": 5,
      "deposit_price": 750.00,
      "empty_tube_count": 3
    }
  ]
}
```

### 5.3. Supabase cart_items Tablosu

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `customer_id` | UUID | FK → customers |
| `product_id` | UUID | FK → products |
| `quantity` | INTEGER | Adet |
| `unit_price` | DECIMAL(10,2) | Birim fiyat |
| `created_at` | TIMESTAMPTZ | Oluşturulma zamanı |
| `updated_at` | TIMESTAMPTZ | Güncellenme zamanı (trigger ile otomatik) |

**Unique constraint:** `(customer_id, product_id)` → Aynı müşteri-ürün çifti için tek kayıt (UPSERT)

### 5.4. Senkronizasyon Akışı

1. **Giriş yapıldığında:** `CartService.loadFromDatabase(customerId)` → Supabase'den sessionStorage'a yükle
2. **Her değişiklikte:** sessionStorage anında güncele + `syncToDatabase()` arka planda Supabase'e yaz
3. **Checkout'ta:** Her iki depolama da temizlenir

---

## 6. Sepet Sayfası Yapısı

**Dosya:** `isyerim-musteri-sepet.html`

### 6.1. Sayfa Düzeni

İki sütunlu responsive düzen:

```
┌──────────────────────────────────┬─────────────────────┐
│  Sol Sütun (flex: 2)             │ Sağ Sütun (380px)   │
│                                  │                     │
│  Sepetim (X Ürün)   🗑 Temizle  │ Sipariş Özeti       │
│                                  │ (X Ürün)            │
│  ┌──────────────────────────┐   │                     │
│  │ [Resim] Ürün Adı         │   │ Ürün Tutarı: X ₺   │
│  │         Birim: X ₺       │   │ Depozito:    X ₺   │
│  │         ★ X Puan         │   │ ─────────────────── │
│  │    [- ] [5] [+ ]    🗑   │   │ Toplam:      X ₺   │
│  │         Toplam: X ₺      │   │ ★ X Puan           │
│  │                           │   │                     │
│  │  ┌─ Depozito ──────────┐ │   │ ┌─ Kampanya ─────┐ │
│  │  │ Boş tüp: [3]        │ │   │ │ Kilo Kilo Puan │ │
│  │  │ Depozito: X ₺       │ │   │ └────────────────┘ │
│  │  └─────────────────────┘ │   │                     │
│  └──────────────────────────┘   │ [Siparişe Devam Et] │
│                                  │                     │
│  ... (diğer ürünler)            │                     │
└──────────────────────────────────┴─────────────────────┘
```

### 6.2. Boş Sepet Durumu

Sepette ürün yoksa:

```
┌──────────────────────────────────┐
│          🛒                       │
│    Sepetiniz Boş                 │
│                                  │
│    [Alışverişe Başla]            │
│    → isyerim-musteri-anasayfa    │
└──────────────────────────────────┘
```

- Sipariş özeti "0 Ürün", tüm tutarlar ₺0,00
- "Siparişe Devam Et" tıklanırsa → Alert: "Sepetiniz boş. Lütfen ürün ekleyin."

### 6.3. Adres Bilgisi Banner'ı

- **Koşul:** Şube seçiliyse gösterilir
- **İçerik:** Seçili şube adı ve açık adresi
- **Güncelleme:** `addressChanged` event'i ile yenilenir

---

## 7. Ürün Fiyat Etiketleri

Her ürün kartında fiyatın yanında renkli bir etiket gösterilir:

| Fiyat Tipi | Etiket | Arka Plan | Yazı Rengi |
|------------|--------|-----------|------------|
| `offer` (Size Özel) | "Size Özel" | Yeşil (`#e8f5e9`) | Koyu yeşil (`#2e7d32`) |
| `bayi_ozel` (Bayi Özel) | "Bayi Özel" | Mavi (`#e3f2fd`) | Koyu mavi (`#1565c0`) |
| `retail` (Perakende) | "Perakende" | Gri (`#f5f5f5`) | Gri (`#666`) |

---

## 8. Depozito (Teminat) Yönetimi

### 8.1. Depozito Kavramı

LPG tüplerinde müşteriden depozito (teminat) alınır. Müşteri boş tüp iade ederse depozito alınmaz.

### 8.2. Depozito Hesaplama Formülü

```
depozitoluÜrünAdedi = max(0, sipariş_adedi - iade_edilen_boş_tüp_adedi)
depozitoTutarı = depozitoluÜrünAdedi × birim_depozito_fiyatı
```

**Örnek:**
- 5 adet tüp sipariş, 3 boş tüp iade → 2 adet depozito = 2 × 750 ₺ = 1.500 ₺
- 5 adet tüp sipariş, 0 boş tüp iade → 5 adet depozito = 5 × 750 ₺ = 3.750 ₺
- 5 adet tüp sipariş, 5 boş tüp iade → 0 adet depozito = 0 ₺

### 8.3. Boş Tüp Girişi

- Her depozitolu ürün kartında sarı bantlı bir alan gösterilir
- Metin: "Elinizde kaç adet boş tüp var?"
- Input alanı: Sayısal, min=0, max=sipariş adedi
- Değiştiğinde: `CartService.updateEmptyTubeCount(productId, count)` çağrılır
- Kısıtlama: `0 ≤ boşTüpAdedi ≤ ürünAdedi`

### 8.4. Depozito Gösterimi

| Konum | Gösterim |
|-------|----------|
| Ürün kartında | Per-ürün depozito hesabı (sarı bant) |
| Sipariş özeti sidebar | "Depozito Tutarı: X ₺" (sadece > 0 ise görünür) |
| Toplam | Ürün tutarı + Depozito tutarı |

---

## 9. Fiyat Çözümleme (Price Resolution)

Sepete ürün eklenirken ve bayi/şube değiştiğinde fiyatlar `PriceResolverService` ile çözümlenir.

### Öncelik Sırası

```
1. Teklif Fiyatı (Size Özel) — en yüksek öncelik
   └─ Müşterinin kabul edilmiş aktif teklifi varsa → teklif fiyatı

2. Şehir Bazlı Perakende Fiyat
   └─ RetailPricesByCityService → şehre göre perakende fiyat

3. Ürün Taban Fiyatı (fallback)
   └─ product.base_price
```

### Puan Hesaplama

```
puanPerÜrün = Math.floor(birimFiyat)   → 1 TL = 1 Puan
toplamPuan = Σ (puanPerÜrün × adet)    → tüm ürünler için
```

---

## 10. Şube (Adres) Değişikliğinde Davranış

### Şube Değiştirildiğinde Ne Olur?

1. Kullanıcı header'daki konum butonuna tıklar → Şube modal'ı açılır → Farklı şube seçer
2. `selected_address_id` ve `selected_address_name` sessionStorage'da güncellenir
3. **Sayfa yeniden yüklenir** (`window.location.reload()`)
4. Yeniden yükleme sırasında `CartService.loadFromDatabase()` çalışır
5. **Sepet içeriği korunur** — aynı ürünler kalır
6. Adres banner'ı yeni şube bilgisiyle güncellenir

> **Önemli:** Şube değişikliğinde sepet temizlenmez. Ürünler aynı kalır, ancak depozito fiyatları şubeye göre farklılık gösterebilir.

---

## 11. Bayi Değişikliğinde Davranış

### Bayi Değiştirildiğinde Ne Olur?

1. Kullanıcı farklı bir bayi seçer
2. `CartService.refreshPrices(customerId, branchId, dealerId)` çağrılır
3. Her ürün için `PriceResolverService` yeni bayinin fiyatlarını çözümler
4. Sepetteki her ürünün `price`, `priceType`, `priceLabel`, `points` değerleri güncellenir
5. Güncel fiyatlar Supabase'e senkronize edilir
6. UI yeniden render edilir

> **Önemli:** Sepet içeriği (ürünler ve adetler) korunur, sadece fiyatlar değişir. Farklı bayilerin farklı indirim kademeleri olabilir.

---

## 12. Sepete Ürün Ekleme Noktaları

### 12.1. Anasayfa (`isyerim-musteri-anasayfa.html`)

- Ürün kartlarında "Sepete Ekle" butonu
- Tıklandığında: `CartService.addItem(product, 1)`
- Sayfa yüklendiğinde: `CartService.loadFromDatabase(customerId)` (satır 704)

### 12.2. Ürün Detay Sayfası (`isyerim-musteri-urun-detay.html`)

- Miktar seçici + "Sepete Ekle" butonu
- Tıklandığında: `CartService.addItem(product, selectedQuantity)`
- Bayi değiştiğinde: `CartService.refreshPrices()` çağrılır

### 12.3. Son Siparişimi Tekrarla — "Siparişi Düzenle" CTA

- `editRepeatOrder()` fonksiyonu sepeti temizler ve orijinal sipariş kalemlerini sepete ekler
- Yönlendirme: Sepet sayfasına

### 12.4. Ürün Zaten Sepette İse

- Aynı ürün tekrar eklendiğinde adet artırılır (yeni kayıt oluşturulmaz)
- Fiyat, fiyat tipi ve depozito bilgisi güncellenir

---

## 13. Checkout (Sipariş Oluşturma) Akışı

### Adım 1: Sepet Sayfası → "Siparişe Devam Et"

**Validasyonlar:**
1. Sepet boş mu? → Boşsa alert gösterilir, işlem durur
2. Müşteri ve Bayi ID'leri mevcut mu? → Yoksa ilk bayi atanır
3. Adres tamamlanmış mı? → Eksikse `AddressCompletionOverlay` açılır

**Başarılı validasyon sonrası:** → `isyerim-musteri-teslimat.html` sayfasına yönlendirme

### Adım 2: Teslimat ve Ödeme Sayfası

Kullanıcı seçer:
- Teslimat tarihi
- Teslimat saati (zaman dilimi)
- Ödeme yöntemi (Nakit / Kredi Kartı)
- Notlar (opsiyonel)

### Adım 3: Sipariş Oluşturma

`CartService.checkout(customerId, dealerId, deliveryInfo)` çağrılır:

**orders tablosuna INSERT:**
- `customer_id`, `dealer_id`, `customer_branch_id`
- `total_amount` (ürün + depozito toplamı)
- `deposit_total`
- `total_points`
- `delivery_address`, `delivery_date`, `delivery_time`
- `payment_method`, `notes`
- `status`: `waiting_for_assignment`

**order_items tablosuna INSERT (her ürün için):**
- `order_id`, `product_id`
- `quantity`, `unit_price`, `total_price`
- `empty_tube_count`, `deposit_count`, `deposit_unit_price`, `deposit_total`
- `points`

**Sonrası:**
1. `OrdersService.logOrderCreated()` → Timeline kaydı
2. `CartService.clearCart()` → Sepet temizlenir (sessionStorage + Supabase)
3. Sipariş özet sayfasına yönlendirme

### Adım 4: Sipariş Özeti (`isyerim-musteri-siparis-ozet.html`)

3 adımlı stepper gösterilir (tamamlanmış):
1. Sipariş Detayı
2. Sepet
3. Teslimat ve Ödeme ✓

Sayfada gösterilen bilgiler:
- Başarı mesajı (yeşil onay ikonu)
- Sipariş detayları (4 sütunlu grid)
- Teslimat ve fatura adresleri
- Ödeme özeti (ürün tutarı, depozito, toplam)
- Ürün listesi (resim, ad, adet, fiyat, puan)
- Sipariş iptal butonu

---

## 14. Servis Metotları Referansı

**Dosya:** `js/services/cart-service.js`

### Okuma/Yazma

| Metot | Açıklama |
|-------|----------|
| `getCart()` | sessionStorage'dan sepeti döndürür |
| `saveCart(cart)` | sessionStorage'a yazar + `cartUpdated` event'i tetikler |
| `loadFromDatabase(customerId)` | Supabase'den sessionStorage'a yükler |
| `syncToDatabase(productId, qty, price)` | Tek ürünü Supabase'e senkronize eder (UPSERT/DELETE) |
| `isEmpty()` | Sepet boş mu? |

### Ürün İşlemleri

| Metot | Açıklama |
|-------|----------|
| `addItem(product, quantity)` | Ürün ekler (mevcutsa adedi artırır) |
| `removeItem(productId)` | Ürünü sepetten çıkarır |
| `updateQuantity(productId, qty)` | Adedi günceller (≤0 ise siler) |
| `incrementQuantity(productId)` | +1 adet |
| `decrementQuantity(productId)` | -1 adet (1 ise siler) |
| `clearCart()` | Tüm sepeti temizler (sessionStorage + Supabase) |
| `hasItem(productId)` | Ürün sepette mi? |
| `getItemQuantity(productId)` | Ürünün adedi |

### Hesaplama

| Metot | Açıklama |
|-------|----------|
| `getItemCount()` | Toplam adet (tüm ürünlerin quantity toplamı) |
| `getUniqueItemCount()` | Farklı ürün sayısı |
| `getProductTotal()` | Ürün tutarı toplamı (depozito hariç) |
| `getDepositTotal()` | Depozito tutarı toplamı |
| `getTotal()` | Genel toplam (ürün + depozito) |
| `getTotalPoints()` | Toplam puan |
| `calculatePointsFromPrice(price)` | Fiyattan puan hesapla (Math.floor) |
| `getSummary()` | Tüm özet bilgileri tek nesnede döndürür |

### Özel İşlemler

| Metot | Açıklama |
|-------|----------|
| `updateEmptyTubeCount(productId, count)` | Boş tüp adetini günceller |
| `refreshPrices(customerId, branchId, dealerId)` | Tüm fiyatları yeniden çözümler |
| `checkout(customerId, dealerId, deliveryInfo)` | Sipariş oluşturur ve sepeti temizler |

---

## 15. Event Sistemi

### `cartUpdated` Custom Event

Her sepet değişikliğinde `CartService.saveCart()` tarafından tetiklenir:

```
window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }))
```

**Dinleyenler:**

| Dinleyici | Davranış |
|-----------|----------|
| `ComponentLoader` (component-loader.js) | Badge sayısını günceller |
| Sepet sayfası (`isyerim-musteri-sepet.html`) | Sepeti yeniden render eder |

### `addressChanged` Event

Şube değiştiğinde tetiklenir:

| Dinleyici | Davranış |
|-----------|----------|
| Sepet sayfası | Adres banner'ını günceller |

---

## 16. Veri Akış Diyagramı

```
Ürün Ekleme
    │
    ▼
CartService.addItem(product, qty)
    │
    ├─ sessionStorage güncelle (anında)
    ├─ cartUpdated event tetikle → Badge güncelle
    └─ syncToDatabase() (arka planda)
         └─ Supabase cart_items UPSERT

Sepet Sayfası Yükleme
    │
    ▼
CartService.loadFromDatabase(customerId)
    │
    ├─ Supabase cart_items SELECT + products JOIN
    ├─ sessionStorage'a yaz
    └─ renderCart() → UI göster

Bayi Değişikliği
    │
    ▼
CartService.refreshPrices(customerId, branchId, dealerId)
    │
    ├─ PriceResolverService her ürün için çalışır
    ├─ price, priceType, priceLabel, points güncellenir
    ├─ sessionStorage güncelle
    ├─ Her ürün için syncToDatabase()
    └─ cartUpdated event → UI güncelle

Checkout
    │
    ▼
CartService.checkout(customerId, dealerId, deliveryInfo)
    │
    ├─ Supabase orders INSERT
    ├─ Supabase order_items INSERT (her ürün)
    ├─ OrdersService.logOrderCreated()
    ├─ CartService.clearCart()
    │   ├─ sessionStorage temizle
    │   └─ Supabase cart_items DELETE
    └─ → isyerim-musteri-siparis-ozet.html yönlendirme
```

---

## 17. Edge Case'ler ve Özel Durumlar

| Senaryo | Davranış |
|---------|----------|
| Sepet boşken "Siparişe Devam Et" | Alert: "Sepetiniz boş. Lütfen ürün ekleyin." |
| Aynı ürün tekrar eklendiğinde | Yeni kayıt oluşmaz, mevcut ürünün adedi artırılır |
| Adet 1'den 0'a düşürülürse | Ürün sepetten tamamen kaldırılır |
| Ürünün fiyatı bulunamazsa | Taban fiyat (base_price) kullanılır |
| Boş tüp adedi > sipariş adedinden fazla girilirse | Sipariş adedine kısıtlanır |
| Depozito fiyatı 0 olan ürün | Depozito bandı gösterilmez |
| Aktif teklifi olmayan müşteri sepete tıklarsa | Teklif talep sayfasına yönlendirilir |
| Adres eksik bilgi içeriyorsa | AddressCompletionOverlay açılır, checkout engellenir |
| Şube değiştirildiğinde | Sepet korunur, sayfa yenilenir |
| Bayi değiştirildiğinde | Sepet korunur, fiyatlar yeniden çözümlenir |
| Checkout başarısız olursa | Alert ile hata, teslimat sayfasında kalır |
| Oturum kapanıp açılırsa | Supabase'den yeniden yüklenir (kalıcı) |
| Sepeti temizle butonuna tıklanırsa | Onay dialogu gösterilir, onaylarsa tüm ürünler silinir |

---

## 18. İlgili Dosyalar

| Dosya | İçerik |
|-------|--------|
| `components/isyerim-top-bar.html` (satır 68-75) | Sepet ikonu + badge HTML |
| `js/services/cart-service.js` | Tüm sepet iş mantığı (480+ satır) |
| `js/services/price-resolver-service.js` | Fiyat çözümleme servisi |
| `js/component-loader.js` (satır 822-862) | Badge güncelleme + link yönetimi |
| `isyerim-musteri-sepet.html` (satır 813-1124) | Sepet sayfası HTML + inline CSS/JS |
| `isyerim-musteri-teslimat.html` | Teslimat ve ödeme sayfası |
| `isyerim-musteri-siparis-ozet.html` | Sipariş özeti sayfası |
| `isyerim-musteri-anasayfa.html` | Sepete ekleme noktası (anasayfa) |
| `isyerim-musteri-urun-detay.html` | Sepete ekleme noktası (ürün detay) |
| `js/isyerim-musteri-anasayfa.js` (satır 704) | Anasayfada sepet yükleme |
| `supabase/migrations/20251226180106_cart_items_table.sql` | cart_items tablo tanımı |
| `js/services/orders-service.js` | Sipariş oluşturma (checkout sonrası) |
