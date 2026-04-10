# İpragaz Bayi Yönetim Sistemi — Modül Analizi & Faz Planı

> **Tarih:** 2026-04-07  
> **Amaç:** Projedeki tüm modülleri ve fonksiyonları listelemek, fazlara bölerek daha hafif bir kapsamla daha hızlı çıkış sağlamak.

---

## 1. Proje Genel Bakış

| Özellik | Değer |
|---------|-------|
| **Teknoloji** | Statik HTML/CSS/JS (framework yok) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **Modül Sistemi** | ES Modules |
| **Test** | Vitest + jsdom |
| **Toplam HTML Sayfası** | ~63 |
| **Toplam JS Servis** | 21 |
| **Toplam JS Sayfa Modülü** | 9 |
| **Toplam JS Component** | 4 |
| **Supabase Migration** | 62 dosya |

### Portal Yapısı

```
default.html (Ana Giriş)
├── Bayi Portalı (13 sayfa) — Distribütör/bayi kullanıcıları
├── İşYerim Portalı (31 sayfa) — B2B müşteri kullanıcıları  
└── BackOffice Portalı (19 sayfa) — Sistem yöneticileri
```

---

## 2. Modül Envanteri — PORTAL BAZINDA

### 2.1 BAYİ PORTALI (13 Sayfa)

| Sayfa | Dosya | Açıklama | Kritiklik |
|-------|-------|----------|-----------|
| Giriş | `bayi-login.html` | Bayi oturum açma | 🔴 Yüksek |
| Ana Sayfa | `bayi-anasayfa.html` | Dashboard: sipariş, müşteri, teklif istatistikleri | 🔴 Yüksek |
| Müşterilerim | `bayi-musterilerim.html` | Müşteri listesi | 🟡 Orta |
| Müşteri Detay | `bayi-musteri-detay.html` | Müşteri profil ve geçmiş | 🟡 Orta |
| Sipariş Listesi | `bayi-siparis-listesi.html` | Siparişler (durum filtreleme) | 🔴 Yüksek |
| Sipariş Detay | `bayi-siparis-detay.html` | Sipariş takip | 🔴 Yüksek |
| Teklif Listesi | `bayi-teklif-listesi.html` | Teklifler listesi | 🟡 Orta |
| Teklif Oluştur | `bayi-teklif-olustur.html` | Yeni teklif formu | 🟡 Orta |
| Teklif Talepleri | `bayi-teklif-talepleri.html` | Teklif uzatma talepleri | 🟢 Düşük |
| Sattığım Ürünler | `bayi-sattigim-urunler.html` | Ürün seçimi (aktif/pasif) | 🟡 Orta |
| Fiyatlandırma Raporu | `bayi-fiyatlandirma-raporu.html` | Fiyat karşılaştırma | 🟢 Düşük |

### 2.2 İŞYERİM PORTALI (31 Sayfa)

#### Kimlik Doğrulama & Kayıt (5 sayfa)

| Sayfa | Dosya | Kritiklik |
|-------|-------|-----------|
| Giriş | `isyerim-musteri-login.html` | 🔴 Yüksek |
| Üye Ol | `isyerim-musteri-uye-ol.html` | 🔴 Yüksek |
| OTP Doğrulama | `isyerim-musteri-otp.html` | 🔴 Yüksek |
| VKN Doğrulama | `isyerim-vkn-dogrulama.html` | 🔴 Yüksek |
| Bayi Seçimi | `isyerim-musteri-bayi-sec.html` | 🔴 Yüksek |

#### Alışveriş Akışı (6 sayfa)

| Sayfa | Dosya | Kritiklik |
|-------|-------|-----------|
| Ana Sayfa (Ürün Listesi) | `isyerim-musteri-anasayfa.html` | 🔴 Yüksek |
| Ürün Detay | `isyerim-musteri-urun-detay.html` | 🔴 Yüksek |
| Sepet | `isyerim-musteri-sepet.html` | 🔴 Yüksek |
| Teslimat & Ödeme | `isyerim-musteri-teslimat.html` | 🔴 Yüksek |
| Sipariş Özeti | `isyerim-musteri-siparis-ozet.html` | 🔴 Yüksek |
| Sipariş Detay | `isyerim-musteri-siparis-detay.html` | 🔴 Yüksek |

#### Sipariş Yönetimi (1 sayfa)

| Sayfa | Dosya | Kritiklik |
|-------|-------|-----------|
| Siparişlerim | `isyerim-musteri-siparislerim.html` | 🔴 Yüksek |

#### Teklif Sistemi (3 sayfa)

| Sayfa | Dosya | Kritiklik |
|-------|-------|-----------|
| Tekliflerim | `isyerim-musteri-teklifler.html` | 🟡 Orta |
| Teklif İste | `isyerim-musteri-teklif-iste.html` | 🟡 Orta |
| Bayi Fiyatları | `isyerim-musteri-bayi-fiyatlari.html` | 🟡 Orta |

#### Hesap Yönetimi (4 sayfa)

| Sayfa | Dosya | Kritiklik |
|-------|-------|-----------|
| Adreslerim | `isyerim-musteri-adreslerim.html` | 🟡 Orta |
| Adres Ekle | `isyerim-musteri-adres-ekle.html` | 🟡 Orta |
| Kullanıcılar | `isyerim-musteri-kullanicilar.html` | 🟢 Düşük |
| Bilgileri Güncelle | `isyerim-musteri-bilgileri-guncelle.html` | 🟡 Orta |

#### Sadakat & Ödüller (2 sayfa)

| Sayfa | Dosya | Kritiklik |
|-------|-------|-----------|
| Puanlarım | `isyerim-musteri-puanlarim.html` | 🟢 Düşük |
| Kuponlarım | `isyerim-musteri-kuponlarim.html` | 🟢 Düşük |

#### Destek & Bilgilendirme (6 sayfa)

| Sayfa | Dosya | Kritiklik |
|-------|-------|-----------|
| Bildirimlerim | `isyerim-musteri-bildirimlerim.html` | 🟢 Düşük |
| Favorilerim | `isyerim-musteri-favorilerim.html` | 🟢 Düşük |
| Güvenlik Beyanları | `isyerim-musteri-sorular.html` | 🟢 Düşük |
| Bize Ulaşın | `isyerim-musteri-bize-ulasin.html` | 🟢 Düşük |
| Sözleşmeler | `isyerim-musteri-sozlesmeler.html` | 🟢 Düşük |
| SSS | `isyerim-musteri-sss.html` | 🟢 Düşük |

### 2.3 BACKOFFICE PORTALI (19 Sayfa)

| Sayfa | Dosya | Kritiklik |
|-------|-------|-----------|
| Giriş | `backoffice-login.html` | 🔴 Yüksek |
| Dashboard | `backoffice-anasayfa.html` | 🔴 Yüksek |
| Bayi Listesi | `backoffice-bayi-listesi.html` | 🔴 Yüksek |
| Bayi Ekle | `backoffice-bayi-ekle.html` | 🟡 Orta |
| Bayi Düzenle | `backoffice-bayi-duzenle.html` | 🟡 Orta |
| Müşteri Listesi | `backoffice-musteri-listesi.html` | 🔴 Yüksek |
| Müşteri Ekle | `backoffice-musteri-ekle.html` | 🟡 Orta |
| Müşteri Düzenle | `backoffice-musteri-duzenle.html` | 🟡 Orta |
| Müşteri Detay | `backoffice-musteri-detay.html` | 🟡 Orta |
| Ürünler | `backoffice-urunler.html` | 🔴 Yüksek |
| Ürün Detay | `backoffice-urun-detay.html` | 🟡 Orta |
| Kategoriler | `backoffice-kategoriler.html` | 🟡 Orta |
| Siparişler | `backoffice-siparisler.html` | 🔴 Yüksek |
| Sipariş Detay | `backoffice-siparis-detay.html` | 🔴 Yüksek |
| Teklifler | `backoffice-teklifler.html` | 🟡 Orta |
| Teklif Detay | `backoffice-teklif-detay.html` | 🟡 Orta |
| Şehir Fiyatları | `backoffice-sehir-fiyatlari.html` | 🟡 Orta |
| Raporlar | `backoffice-raporlar.html` | 🟢 Düşük |
| Profil | `backoffice-profil.html` | 🟢 Düşük |
| Ayarlar | `backoffice-ayarlar.html` | 🟢 Düşük |

---

## 3. Servis Katmanı (21 JS Servisi)

### 3.1 Çekirdek Servisler (Her Faz İçin Gerekli)

| Servis | Dosya | Satır | Ana Fonksiyonlar |
|--------|-------|-------|------------------|
| **Supabase Client** | `js/supabase-client.js` | ~50 | `supabaseClient`, `handleSupabaseError()`, `testSupabaseConnection()` |
| **Ürünler** | `js/services/products-service.js` | 306 | `getAll()`, `getById()`, `getByCategory()`, `getFiltered()`, `getPaginated()` |
| **Müşteriler** | `js/services/customers-service.js` | 317 | `getAll()`, `getById()`, `getByVkn()`, `create()`, `getFiltered()`, `getPaginatedByDealerId()` |
| **Bayiler** | `js/services/dealers-service.js` | 392 | `getAll()`, `getById()`, `getByCity()`, `create()`, `getFiltered()`, `getPaginated()` |
| **Lokasyonlar** | `js/services/locations-service.js` | 444 | `getCities()`, `getDistricts()`, `searchCities()` (Türkçe karakter desteği) |
| **Kimlik Doğrulama** | `js/project-auth-check.js` | ~30 | Session kontrol, yönlendirme |

### 3.2 Sipariş & Sepet Servisleri

| Servis | Dosya | Satır | Ana Fonksiyonlar |
|--------|-------|-------|------------------|
| **Sepet** | `js/services/cart-service.js` | 483 | `addItem()`, `updateQuantity()`, `removeItem()`, `clearCart()`, `checkout()`, `refreshPrices()`, `syncToDatabase()` |
| **Siparişler** | `js/services/orders-service.js` | 574 | `create()`, `getById()`, `updateStatus()`, `cancel()`, `startDelivery()`, `markDelivered()`, `getSalesStats()` |
| **Tekrarlayan Siparişler** | `js/services/recurring-orders-service.js` | 340 | `create()`, `activate()`, `pause()`, `resume()`, `delete()` |

### 3.3 Fiyatlandırma & Teklif Servisleri

| Servis | Dosya | Satır | Ana Fonksiyonlar |
|--------|-------|-------|------------------|
| **Fiyat Çözücü** | `js/services/price-resolver-service.js` | 261 | `resolvePrice()`, `resolvePricesForProducts()` — Öncelik: Teklif > Şehir Perakende > Baz Fiyat |
| **Teklifler** | `js/services/offers-service.js` | 1342 | `create()`, `accept()`, `reject()`, `getRequests()`, `createRequest()`, `respondToRequest()` |
| **Şehir Perakende Fiyatları** | `js/services/retail-prices-by-city-service.js` | 437 | `getAll()`, `getByCity()`, `getByProductAndCity()`, `create()`, `update()` |
| **Müşteri Özel Fiyatları** | `js/services/customer-prices-service.js` | 216 | `getByCustomer()`, `getByCustomerAndProduct()`, `create()`, `update()` |

### 3.4 Kullanıcı & Hesap Servisleri

| Servis | Dosya | Satır | Ana Fonksiyonlar |
|--------|-------|-------|------------------|
| **Müşteri Kullanıcılar** | `js/services/customer-users-service.js` | 363 | `getByPhone()`, `create()`, `update()`, `deactivate()`, `updateAccessLevel()` |
| **Şubeler** | `js/services/branches-service.js` | 336 | `getByCustomerId()`, `create()`, `setDefault()`, `updatePointsCollectionMode()` |
| **Hesap Silme** | `js/services/account-deletion-service.js` | 280 | `calculateDeletionImpact()`, `deleteUser()`, `recoverUser()` |
| **VKN Doğrulama** | `js/services/vkn-verification-service.js` | 188 | `create()`, `getByPhone()`, `getPendingRequests()`, `updateStatus()` |

### 3.5 Ek Servisler

| Servis | Dosya | Satır | Ana Fonksiyonlar |
|--------|-------|-------|------------------|
| **Puanlar** | `js/services/points-service.js` | 589 | `awardPointsForOrder()`, `getCustomerBalance()`, `redeemPoints()` |
| **Bildirimler** | `js/services/notifications-service.js` | 174 | `getAll()`, `getUnreadCount()`, `markAsRead()`, `subscribeToNotifications()` (Realtime) |
| **Favoriler** | `js/services/favorites-service.js` | 164 | `getByCustomerId()`, `toggleFavorite()`, `addFavorite()`, `removeFavorite()` |
| **Mesajlar** | `js/services/messages-service.js` | 108 | `getByOfferId()`, `create()`, `markAsRead()` |
| **Raporlar** | `js/services/reports-service.js` | 920 | `getSalesReport()`, `getProductSalesReport()`, `getCustomerReport()`, `getOfferReport()` |
| **Bayi Ürünleri** | `js/services/dealer-products-service.js` | 89 | `getByDealerId()`, `toggleProductActivity()` |
| **Bayi Bölgeleri** | `js/services/dealer-districts-service.js` | 266 | `getByDealerId()`, `create()`, `delete()` |
| **Teklif Logları** | `js/services/offer-logs-service.js` | 97 | `create()`, `getByOfferId()` |
| **Geri Bildirim** | `js/services/feedback-service.js` | 203 | `create()`, `getByPage()`, `getAll()` |
| **Ayarlar** | `js/services/settings-service.js` | 46 | `getAll()`, `getByKey()`, `update()` |
| **BackOffice Admin** | `js/services/backoffice-admins-service.js` | 154 | `getAll()`, `create()`, `update()` |

---

## 4. Bileşen (Component) Katmanı

### 4.1 HTML Bileşenleri (`/components/`)

| Bileşen | Dosya | Kullanıldığı Portal |
|---------|-------|---------------------|
| Bayi Header | `components/bayi-header.html` | Bayi |
| Bayi Mobil Sidebar | `components/bayi-mobile-sidebar.html` | Bayi |
| İşYerim Header | `components/isyerim-header.html` | İşYerim |
| İşYerim Top Bar | `components/isyerim-top-bar.html` | İşYerim |
| İşYerim Footer | `components/isyerim-footer.html` | İşYerim |
| İşYerim Ayarlar Sidebar | `components/isyerim-settings-sidebar.html` | İşYerim |
| BackOffice Header | `components/backoffice-header.html` | BackOffice |
| BackOffice Sidebar | `components/backoffice-sidebar.html` | BackOffice |
| Feedback Toolbar | `components/feedback-toolbar.html` | Tümü |
| Adres Tamamlama Overlay | `components/address-completion-overlay.html` | İşYerim |
| Güvenlik Overlay | `components/security-overlay.html` | İşYerim |
| Hesap Silme Overlay | `components/delete-account-overlay.html` | İşYerim |
| VKN Duplicate Overlay | `components/vkn-duplicate-overlay.html` | İşYerim |

### 4.2 JS Bileşenleri (`/js/components/`)

| Bileşen | Dosya | İşlev |
|---------|-------|-------|
| Güvenlik Overlay | `js/components/security-overlay.js` | Güvenlik sorusu doğrulama |
| Feedback Toolbar | `js/components/feedback-toolbar.js` | Sayfa geri bildirimi + ekran çizim |
| Adres Tamamlama | `js/components/address-completion-overlay.js` | Adres otomatik tamamlama |
| Ayarlar Sidebar | `js/components/settings-sidebar.js` | Ayarlar menüsü |

### 4.3 Yardımcı Modül

| Modül | Dosya | Satır | İşlev |
|-------|-------|-------|-------|
| Component Loader | `js/component-loader.js` | 2254 | HTML bileşen yükleme, CSS enjeksiyon, lazy loading |

---

## 5. Servis Bağımlılık Haritası

```
CartService ──────────► ProductsService
    │                    PriceResolverService ──► OffersService
    │                                             RetailPricesByCityService
    └──► OrdersService ──► PointsService

OffersService ────────► CustomersService
    │                    DealersService
    │                    MessagesService
    └──► OfferLogsService

Sayfa Modülleri ──────► Birden fazla servis (window global erişim)
                         ComponentLoader (dinamik UI)
```

---

## 6. Özellik Matrisi — Ne Var, Ne Atılabilir?

| # | Özellik | Servisler | Sayfa Sayısı | Efor | Faz Önerisi |
|---|---------|-----------|--------------|------|-------------|
| 1 | **Giriş & Kimlik Doğrulama** | CustomerUsersService, ProjectAccessService, VknVerificationService | 5 | Düşük | Faz 1 |
| 2 | **Ürün Listeleme & Detay** | ProductsService, ProductCategoriesService, PriceResolverService | 2 | Düşük | Faz 1 |
| 3 | **Sepet & Sipariş Verme** | CartService, OrdersService, PriceResolverService | 5 | Orta | Faz 1 |
| 4 | **Sipariş Takip (Müşteri)** | OrdersService | 2 | Düşük | Faz 1 |
| 5 | **Sipariş Yönetimi (Bayi)** | OrdersService | 3 | Düşük | Faz 1 |
| 6 | **Bayi Dashboard** | OrdersService, CustomersService | 1 | Düşük | Faz 1 |
| 7 | **BackOffice — Bayi/Müşteri Yönetimi** | DealersService, CustomersService | 7 | Orta | Faz 1 |
| 8 | **BackOffice — Ürün Yönetimi** | ProductsService, ProductCategoriesService | 3 | Düşük | Faz 1 |
| 9 | **BackOffice — Sipariş Yönetimi** | OrdersService | 2 | Düşük | Faz 1 |
| 10 | **Adres/Şube Yönetimi** | BranchesService, LocationsService | 2 | Orta | Faz 2 |
| 11 | **Teklif Sistemi (İşYerim)** | OffersService, PriceResolverService | 3 | Yüksek | Faz 2 |
| 12 | **Teklif Sistemi (Bayi)** | OffersService, MessagesService, OfferLogsService | 3 | Yüksek | Faz 2 |
| 13 | **Teklif Yönetimi (BackOffice)** | OffersService | 2 | Orta | Faz 2 |
| 14 | **Şehir Fiyatlandırma** | RetailPricesByCityService | 1 | Orta | Faz 2 |
| 15 | **Bayi Sattığım Ürünler** | DealerProductsService | 1 | Düşük | Faz 2 |
| 16 | **Müşteri Detay (Bayi)** | CustomersService, BranchesService | 2 | Düşük | Faz 2 |
| 17 | **Hesap Bilgileri Güncelleme** | CustomerUsersService | 1 | Düşük | Faz 2 |
| 18 | **Bildirimler** | NotificationsService (Realtime) | 1 | Orta | Faz 3 |
| 19 | **Puan Sistemi** | PointsService | 1 | Orta | Faz 3 |
| 20 | **Kupon Sistemi** | (henüz servis yok) | 1 | Orta | Faz 3 |
| 21 | **Favoriler** | FavoritesService | 1 | Düşük | Faz 3 |
| 22 | **Tekrarlayan Siparişler** | RecurringOrdersService | 0 | Yüksek | Faz 3 |
| 23 | **Raporlar (BackOffice)** | ReportsService | 1 | Yüksek | Faz 3 |
| 24 | **Fiyatlandırma Raporu (Bayi)** | PriceResolverService, RetailPricesByCityService | 1 | Orta | Faz 3 |
| 25 | **Kullanıcı Yönetimi (İşYerim)** | CustomerUsersService | 1 | Düşük | Faz 3 |
| 26 | **Hesap Silme** | AccountDeletionService | 0 | Düşük | Faz 4 |
| 27 | **VKN Doğrulama (BackOffice)** | VknVerificationService | 0 | Düşük | Faz 4 |
| 28 | **Güvenlik Soruları** | SecurityOverlay component | 0 | Düşük | Faz 4 |
| 29 | **Feedback Toolbar** | FeedbackService | 0 | Düşük | Faz 4 |
| 30 | **SSS / Sözleşmeler / Bize Ulaşın** | Statik sayfalar | 3 | Çok Düşük | Faz 4 |
| 31 | **BackOffice Profil & Ayarlar** | SettingsService, BackOfficeAdminsService | 2 | Düşük | Faz 4 |

---

## 7. FAZ PLANI

### FAZ 1 — MVP: Sipariş Ver & Yönet 🔴
> **Hedef:** Müşteri ürün seçip sipariş verebilsin, bayi siparişi görsün, backoffice sistemi yönetsin.

**Kapsam:** 30 sayfa | 11 servis

#### İşYerim Portalı (14 sayfa)
- ✅ Giriş + Kayıt + OTP + VKN Doğrulama + Bayi Seç (5 sayfa)
- ✅ Ana Sayfa (ürün listesi) + Ürün Detay (2 sayfa)
- ✅ Sepet + Teslimat + Sipariş Özeti (3 sayfa)
- ✅ Siparişlerim + Sipariş Detay (2 sayfa)
- ✅ Bilgileri Güncelle (1 sayfa)
- ✅ Adreslerim (1 sayfa — basit versiyon)

#### Bayi Portalı (4 sayfa)
- ✅ Giriş (1 sayfa)
- ✅ Ana Sayfa / Dashboard (1 sayfa)
- ✅ Sipariş Listesi + Sipariş Detay (2 sayfa)

#### BackOffice Portalı (12 sayfa)
- ✅ Giriş + Dashboard (2 sayfa)
- ✅ Bayi Listesi + Ekle + Düzenle (3 sayfa)
- ✅ Müşteri Listesi + Ekle + Düzenle + Detay (4 sayfa)
- ✅ Ürünler + Ürün Detay + Kategoriler (3 sayfa)

#### Gerekli Servisler
```
supabase-client.js          ← Temel
products-service.js         ← Ürün listeleme
product-categories-service.js ← Kategori
customers-service.js        ← Müşteri CRUD
customer-users-service.js   ← Kullanıcı auth
dealers-service.js          ← Bayi CRUD
branches-service.js         ← Şube (basit)
locations-service.js        ← Şehir/ilçe
cart-service.js             ← Sepet
orders-service.js           ← Sipariş
price-resolver-service.js   ← Fiyat (sadece baz fiyat)
project-auth-check.js       ← Auth guard
component-loader.js         ← Bileşen yükleme
```

#### ATILAN Özellikler (Faz 1'de YOK)
- ❌ Teklif sistemi (tüm portallar)
- ❌ Puan & kupon sistemi
- ❌ Favoriler
- ❌ Bildirimler (realtime)
- ❌ Tekrarlayan siparişler
- ❌ Raporlar
- ❌ Güvenlik soruları overlay
- ❌ Feedback toolbar
- ❌ SSS, Sözleşmeler, Bize Ulaşın
- ❌ Kullanıcı yönetimi (çoklu kullanıcı)
- ❌ Hesap silme
- ❌ Şehir bazlı fiyatlandırma (baz fiyat yeterli)

---

### FAZ 2 — Teklif & Fiyatlandırma 🟡
> **Hedef:** Bayi-müşteri arası teklif sistemi ve gelişmiş fiyatlandırma.

**Ek Kapsam:** +12 sayfa | +6 servis

#### İşYerim Portalı (+3 sayfa)
- Tekliflerim + Teklif İste + Bayi Fiyatları

#### Bayi Portalı (+5 sayfa)
- Müşterilerim + Müşteri Detay
- Teklif Listesi + Teklif Oluştur + Teklif Talepleri
- Sattığım Ürünler

#### BackOffice Portalı (+3 sayfa)
- Teklifler + Teklif Detay
- Şehir Fiyatları

#### İşYerim Portalı (+1 sayfa)
- Adres Ekle (gelişmiş adres yönetimi)

#### Ek Servisler
```
offers-service.js               ← Teklif CRUD
retail-prices-by-city-service.js ← Şehir fiyatları
customer-prices-service.js       ← Müşteri özel fiyat
dealer-products-service.js       ← Bayi ürün seçimi
dealer-districts-service.js      ← Bayi bölge
messages-service.js              ← Teklif mesajlaşma
offer-logs-service.js            ← Teklif log
```

---

### FAZ 3 — Sadakat & Raporlama 🟢
> **Hedef:** Puan sistemi, bildirimler, raporlar, tekrarlayan siparişler.

**Ek Kapsam:** +6 sayfa | +4 servis

#### İşYerim Portalı (+4 sayfa)
- Puanlarım + Kuponlarım
- Bildirimlerim
- Favorilerim

#### Bayi Portalı (+1 sayfa)
- Fiyatlandırma Raporu

#### BackOffice Portalı (+1 sayfa)
- Raporlar

#### Ek Servisler
```
points-service.js            ← Puan kazanma/harcama
notifications-service.js     ← Realtime bildirimler
favorites-service.js         ← Favori ürünler
reports-service.js           ← Satış/müşteri/teklif raporları
recurring-orders-service.js  ← Tekrarlayan sipariş
```

---

### FAZ 4 — Tam Kapsam & İyileştirmeler 🔵
> **Hedef:** Kalan tüm sayfalar ve ek özellikler.

**Ek Kapsam:** +8 sayfa | +4 servis

#### İşYerim Portalı (+5 sayfa)
- Kullanıcılar (çoklu kullanıcı yönetimi)
- Güvenlik Beyanları
- Bize Ulaşın + SSS + Sözleşmeler

#### BackOffice Portalı (+2 sayfa)
- Profil + Ayarlar

#### Sistem Geneli (+1)
- Feedback Toolbar (tüm sayfalar)

#### Ek Servisler
```
account-deletion-service.js    ← Hesap silme
vkn-verification-service.js    ← VKN doğrulama (backoffice)
feedback-service.js            ← Geri bildirim
settings-service.js            ← Sistem ayarları
backoffice-admins-service.js   ← Admin yönetimi
```

---

## 8. Faz Özeti

| Faz | Odak | Sayfa | Servis | Tahmini Ağırlık |
|-----|------|-------|--------|-----------------|
| **Faz 1** | MVP — Sipariş ver & yönet | 30 | 11 | %50 |
| **Faz 2** | Teklif & fiyatlandırma | +12 | +6 | %25 |
| **Faz 3** | Sadakat & raporlama | +6 | +4 | %15 |
| **Faz 4** | Tam kapsam | +8 | +4 | %10 |
| **TOPLAM** | | ~56 | ~25 | %100 |

> **Not:** Kalan ~7 sayfa (arşiv dosyaları, scrum dashboard, project-login) proje altyapısıdır ve faz planına dahil değildir.

---

## 9. Atılabilecek / Ertelenebilecek Modüller Özeti

Eğer Faz 1'den bile daha hafif çıkmak isterseniz, şu modüller **tamamen ertelenebilir**:

| Modül | Neden Ertelenebilir |
|-------|---------------------|
| BackOffice Portalı | Manuel veritabanı yönetimi ile başlanabilir |
| VKN Doğrulama | İlk etapta manuel onay ile geçilebilir |
| Adres Yönetimi | Tek adres ile başlanabilir |
| Bayi Portalı | İlk etapta sadece BackOffice üzerinden sipariş yönetimi |

**Ultra MVP (sadece İşYerim):** Müşteri giriş yapıp, ürün seçip, sipariş verebilir → 12 sayfa, 8 servis
