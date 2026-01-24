# İPRAGAZ BAYİ SİSTEMİ - İŞ KURALLARI DOKÜMANTASYONU

Bu doküman, İpragaz Bayi Sistemi'nde uygulanan tüm iş kurallarını kapsamlı bir şekilde derlemektedir.

---

## 1. KULLANICI ROLLERİ VE YETKİLENDİRME

### 1.1 Bayi (Dealer) Rolleri
**Kaynak:** `/js/services/dealers-service.js`

**Giriş Kuralları:**
- Username + Password Hash kombinasyonu ile giriş
- Sadece `is_active = true` olan bayiler giriş yapabilir
- Başarısız girişte "Kullanıcı adı veya şifre hatalı" uyarısı
- Son giriş tarihi sistem tarafından otomatik kaydedilir

**Bayi Özellikleri:**
- `id`, `code`, `name`, `city`, `district`, `phone` gibi temel bilgiler
- `is_active` flag'ı ile soft delete (deactivate) desteği
- Bayiler coğrafi bölgelere tanımlanır (şehir, ilçe)
- **Mikro Pazar Desteği:** Ana bölgesinin dışında hizmet verebilir (`dealer_districts` tablosu)

### 1.2 Müşteri Kullanıcıları (Customer Users)
**Kaynak:** `/js/services/customer-users-service.js`

**Rol Türleri:**
| Rol | Açıklama |
|-----|----------|
| **Owner** | Ana kullanıcı (silinemez) |
| **Staff** | Alt kullanıcılar, sınırlı yetkiler |

**Yetkilendirme Kuralları:**
- Owner tüm işlemlere erişebilir
- Staff kullanıcıları için `owner-only` sınıfı ile tanımlanan menü öğeleri gizlenir
- Her alt kullanıcı (`customer_users`) spesifik şubelere (`customer_user_branches`) atanabilir
- Staff kullanıcı yalnızca yetkili olduğu şubelerin verilerine erişebilir
- Telefon numarası benzersiz olmalıdır (aynı müşteri içinde)

**Operasyonlar:**
- `createOwner()`: Kayıt sırasında owner kullanıcı oluşturulur
- `addBranchPermission()`: Şubeye yetki ekle
- `removeBranchPermission()`: Şubeden yetki kaldır
- `updateBranchPermissions()`: Toplu yetki güncelleme

### 1.3 Backoffice Admin Rolleri
**Kaynak:** `/js/services/backoffice-admins-service.js`

**Giriş Kontrolü:**
- Username + Password Hash
- Sadece `is_active = true` olan adminler giriş yapabilir
- Son giriş zamanı otomatik kaydedilir
- Şifre hash değeri giriş sonrası silinir

**İzin Verilen Güncellemeler:**
- Sadece: `name`, `email`, `phone` alanları güncellenebilir
- `role`, `is_active` ve `username` yöneticiler tarafından değiştirilmez

---

## 2. FİYATLANDIRMA KURALLARI

### 2.1 Fiyat Hiyerarşisi (Price Resolver Service)
**Kaynak:** `/js/services/price-resolver-service.js`

**Öncelik Sırası (En yüksek öncelikten):**

| Öncelik | Fiyat Tipi | Kaynak |
|---------|-----------|--------|
| 1 | "Size Özel" (Teklif Fiyatı) | `offer_details.unit_price` |
| 2 | "Bayi Özel" (Barem Fiyatı) | Bayi barem fiyatı (ilk kademe `min_quantity=1`) |
| 3 | "Perakende" (Retail) | `products.base_price` |

**Fiyat Çözümleme Fonksiyonları:**
```javascript
resolvePrice()              // Tek ürün için
resolvePricesForProducts()  // Toplu ürünler için
```

### 2.2 Barem Fiyatlandırması
**Kaynak:** `/js/services/barem-prices-service.js`

**Bayi Barem Kuralları:**
- Her bayi her ürün için kademeli fiyatlandırma tanımlayabilir
- `min_quantity` - `max_quantity` aralıklarına göre `unit_price` belirlenebilir
- Fiyat çözümlemede **ilk kademe** (min_quantity=1) kullanılır
- Barem güncellemesinde mevcut tümü silinip yenileri eklenir (full replacement)

### 2.3 Teklifle Fiyatlandırma
**Kaynak:** `/js/services/offers-service.js`

**Teklif Detay Alanları:**
| Alan | Açıklama |
|------|----------|
| `unit_price` | Birim fiyat |
| `pricing_type` | Fiyat tipi |
| `discount_value` | İndirim tutarı/yüzdesi |
| `commitment_quantity` | Taahhüt miktarı |
| `this_month_quantity` | Bu ay sipariş miktarı |
| `last_month_quantity` | Geçen ay sipariş miktarı |

**Şube Bazlı Teklifler:**
- Her teklifin `customer_branch_id` sahip olması gerekir
- Aynı müşterinin farklı şubelerine farklı teklifler verilebilir
- Teklif genişletme talepları: Mevcut teklifi başka şubeye uygulatma istekleri

### 2.4 Sepet ve Sipariş Fiyatlandırması
**Kaynak:** `/js/services/cart-service.js`

**Sepet Fiyat Yönetimi:**
- Bayi değiştiğinde tüm ürünlerin fiyatları otomatik güncellenir
- `CartService.refreshPrices()`: Yeni bayi için fiyat çözümlemesi
- Fiyat bilgileri sessionStorage'da (UI) ve veritabanında (kalıcı) saklanır

---

## 3. SİPARİŞ/TEKLİF KURALLARI

### 3.1 Teklif Durum Akışı
**Kaynak:** `/js/services/offers-service.js`

```
requested → pending → accepted
                   → rejected
                   → cancelled
                   → passive
```

**Durum Değerleri:**
| Durum | Açıklama |
|-------|----------|
| `requested` | Talep edildi |
| `pending` | Beklemede (Bayi tarafından hazırlanıyor) |
| `accepted` | Kabul edildi (Müşteri tarafından) - **Aktif teklif** |
| `rejected` | Reddedildi |
| `cancelled` | İptal edildi |
| `passive` | Pasif (Deaktif) |

**İlişkili Kontroller:**
- **Aktif Teklif Tanımı:** `requested`, `pending`, `accepted`, `passive` durumları
- Müşteri başka bayilerle aktif teklifi varsa uyarı: `hasActiveOfferWithOtherDealer()`
- En son teklif getirilirken aktif teklif öncelikli: `getLatestOfferByCustomerId()`

### 3.2 Teklif Genişletme Talebi
**Senaryo:** Müşteri mevcut teklifi başka şubeye uygulatmak istiyor

**Talep Durumları:**
| Durum | Açıklama |
|-------|----------|
| `pending` | Bayi yanıt beklemede |
| `approved` | Bayi onayladı (yeni teklif oluşturuldu, status='accepted') |
| `rejected` | Bayi reddetti |

**Onay Süreci:**
1. İlk teklif detayları tamamen kopyalanır
2. Yeni teklif oluşturulur (status='accepted')
3. Talep durumu 'approved' yapılır
4. Dealer notları kaydedilir

### 3.3 Sipariş Durum Akışı
**Kaynak:** `/js/services/orders-service.js`

```
waiting_for_assignment → on_the_way → completed
                                   → cancelled
```

**Durum Değerleri:**
| Durum | Açıklama |
|-------|----------|
| `waiting_for_assignment` | Atama beklenmekte (ilk durum) |
| `on_the_way` | Dağıtımda |
| `completed` | Teslim edildi ✓ |
| `cancelled` | İptal edildi |

**Durum Değişimi Kuralları:**
- Her durum değişimi `order_status_history` tablosuna kaydedilir
- `changed_by_type`: 'system', 'customer', 'dealer'
- `changed_by_id`: İşlemi yapan kişi/sistem ID'si
- Teslim edildiğinde (`completed`) otomatik **puan verilir**: `awardPointsForCompletedOrder()`

**Timeline (History) Kaydı:**
```sql
order_status_history:
  - order_id
  - old_status
  - new_status
  - changed_by_type
  - changed_by_id
  - notes
  - created_at
```

### 3.4 Sepetten Siparişe Dönüştürme (Checkout)
**Kaynak:** `/js/services/cart-service.js`

**Zorunlu Bilgiler:**
- Müşteri ID
- Bayi ID
- Dağıtım şubesi (customer_branch_id)
- Dağıtım adresi
- Dağıtım tarihi/saati
- Ödeme yöntemi (varsayılan: 'cash')
- Notlar
- Toplam tutar ve puanlar (otomatik hesaplanır)

---

## 4. STOK/ÜRÜN KURALLARI

### 4.1 Ürün Yönetimi
**Kaynak:** `/js/services/products-service.js`

**Temel Alanlar:**
| Alan | Açıklama |
|------|----------|
| `id`, `code`, `name` | Temel kimlik bilgileri |
| `category` | Ürün kategorisi |
| `base_price` | Perakende fiyatı |
| `points_per_unit` | Ürün başına verilen puan |
| `image_url` | Ürün görseli |
| `weight_kg` | Ağırlık bilgisi |
| `is_active` | Ürün aktiflik durumu |

**Filtreleme:**
- Sadece `is_active = true` ürünler listelenir
- Kategoriye göre filtreleme desteklenir: `getByCategory()`

### 4.2 Favoriler
**Kaynak:** `/js/services/favorites-service.js`

**Özellikler:**
- Müşteri favorilerine ürün ekle/çıkar
- Favori ürünlerin stok durumu izlenir
- Müşteri favorilerinin tam listesi getirilebilir

---

## 5. MÜŞTERİ YÖNETİMİ

### 5.1 Müşteri Oluşturma ve Yönetimi
**Kaynak:** `/js/services/customers-service.js`

**Temel Bilgiler:**
| Alan | Açıklama | Kural |
|------|----------|-------|
| `id` | UUID | Otomatik |
| `name` | Müşteri/Firma adı | **Zorunlu** |
| `vkn` | Vergi Kimlik Numarası | **Benzersiz** |
| `phone` | Telefon numarası | **Benzersiz** |
| `email` | E-posta | Format kontrolü |
| `company_name` | Şirket adı | - |
| `address` | Adres bilgisi | - |
| `is_active` | Aktif/Pasif durum | Default: true |
| `tabela_unvani` | Tabel ünvanı | Resmî unvan |

**Müşteri Segmentasyonu:**
- Bayi ID ile segmentasyon (Bayinin müşterisi)
- Aktif/Pasif duruma göre filtreleme
- İsim veya VKN ile arama: `getFiltered()`

**Müşteri Aktivasyon/Deaktivasyon:**
- `activate()`: Müşteriyi aktif et
- `deactivate()`: Müşteriyi pasif yap (soft delete)

### 5.2 Güvenlik Soruları
**Yönetim:**
- 4 adet güvenlik sorusu ve cevapları
- `updateSecurityAnswers()` ile kayıt/güncelleme
- `security_accepted_at`: Kabul tarihi kaydedilir

### 5.3 Müşteri Şubeleri (Branches)
**Kaynak:** `/js/services/branches-service.js`

**Özellikler:**
- Bir müşterinin birden fazla şubesi (konumu) olabilir
- `is_default = true`: Merkez şube
- `is_active`: Şube aktif/pasif
- Tam adres (`full_address`) otomatik derlenir

**Puan Toplama Modu:**
| Mod | Açıklama |
|-----|----------|
| `'customer'` | Puanlar ana hesapta toplanır (varsayılan) |
| `'branch'` | Puanlar şubede toplanır |

**Şube Seçim Kuralı (Öncelik Sırası):**
1. Kullanıcının son seçtiği şube (`last_selected_branch_id`)
2. Yoksa merkez şube (`is_default = true`)
3. Yoksa en eski şube

### 5.4 Müşteri Adres Yönetimi
**Kaynak:** `/js/services/locations-service.js`

**Adres Hiyerarşisi:**
```
Şehir (City) → İlçe (District) → Mahalle (Neighborhood) → Sokak (Street)
```

- Her seviyede `name_ascii` (Türkçe karakterler normalize edilmiş) saklı
- Adres araması Türkçe karakterlere duyarlı

---

## 6. FORM VALİDASYONLARI

### 6.1 Müşteri Girişi (Customer Login)
**Kaynak:** `/isyerim-musteri-login.html`

**Validation Rules:**
- Telefon numarası boş olamaz
- Müşteri aktif (`is_active=true`) olmalı
- Şifre kontrolü (password hash)
- OTP doğrulaması (2FA)

### 6.2 Bayi Girişi (Dealer Login)
**Kaynak:** `/bayi-login.html`

**Validation Rules:**
- Username boş olamaz
- Şifre boş olamaz
- `is_active=true` bayi gerekli
- Hatalı giriş: "Kullanıcı adı veya şifre hatalı"

### 6.3 Teklif Oluşturma Validasyonları
**Kaynak:** `/bayi-teklif-olustur.html`

**Kontroller:**
- Müşteri seçimi zorunlu
- En az 1 şube seçimi zorunlu
- En az 1 ürün/detay zorunlu
- Her ürün için: `unit_price` zorunlu
- İndirim ve taahhüt miktarı isteğe bağlı

### 6.4 Müşteri Oluşturma/Düzenleme
**Validation Rules:**
- VKN benzersiz olmalı (müşteri düzeyinde)
- Telefon numarası benzersiz (müşteri düzeyinde)
- E-mail formatı geçerli olmalı
- Şirket adı/Firma adı zorunlu
- Şehir/İlçe seçimi zorunlu

---

## 7. BİLDİRİM/UYARI KURALLARI

### 7.1 Bildirim Türleri
**Kaynak:** `/js/services/notifications-service.js`

**Bildirim Yönetimi:**
- `user_id`: Bildirim alan kişi
- `user_type`: 'customer' veya 'dealer'
- `is_read`: Okundu/Okunmadı
- Real-time subscription: Postgres Changes ile yeni bildirim dinleme

### 7.2 Bildirim Operasyonları
| Metot | Açıklama |
|-------|----------|
| `getAll()` | Tüm bildirimler (filtreli) |
| `getUnreadCount()` | Okunmamış bildirim sayısı |
| `markAsRead()` | Tekil bildirim okundu yap |
| `markAllAsRead()` | Tüm bildirimler okundu yap |
| `subscribe()` | Real-time yeni bildirim dinleme |

### 7.3 Teklif Genişletme Talep Bildirimleri
- **Bayi:** Bekleyen genişletme talepleri sayısı (`getPendingExtensionRequestsCount()`)
- **Müşteri:** Kendi genişletme taleplerinin durumu

### 7.4 Sipariş Bildirimleri
- Durum değişiklikleri (waiting → on_the_way → completed)
- Teslim bildirimi (completed)

---

## 8. API ENTEGRASYONLARI & VERİ SENKRONİZASYONU

### 8.1 Sepet Senkronizasyonu
**Kaynak:** `/js/services/cart-service.js`

**Hybrid Model:**
| Katman | Kullanım |
|--------|----------|
| **SessionStorage** | Hızlı UI güncellemeleri (Anlık) |
| **Supabase** | `cart_items` tablosu (Kalıcı) |

**Senkronizasyon Metodları:**
- `syncToDatabase()`: SessionStorage'daki sepeti veritabanına yazar
- `loadFromDatabase()`: Login sonrası sepeti veritabanından yükle

### 8.2 Fiyat Güncelleme (Bayi Değişimi)
- Bayi seçildiğinde tüm sepet öğelerinin fiyatları yeniden hesaplanır
- `PriceResolverService.resolvePricesForProducts()`
- Hem SessionStorage hem Supabase güncellenir

### 8.3 Teklif Kopyalama (Genişletme)
- Orijinal teklif detayları yeni teklife kopyalanır
- `approveExtensionRequest()`
- Kopyalanan alanlar: `unit_price`, `pricing_type`, `discount_value`, `commitment_quantity`, vb.

### 8.4 Puan Hesaplaması
**Kaynak:** `/js/services/points-service.js`

**Puan Kaynakları:**
- Sipariş teslimi sırasında: `awardPointsForOrder()`
- Ürün başına puan: `products.points_per_unit`
- Hesaplama: `quantity × points_per_unit`
- Veya teklif detayındaki `points` bilgisi kullanılır

**Şube Bazlı Puan Toplama:**
| Mod | Tablo |
|-----|-------|
| `'customer'` | `customer_points` where branch_id IS NULL |
| `'branch'` | `customer_points` where branch_id = X |

### 8.5 Tekrarlayan Siparişler (Recurring Orders)
**Kaynak:** `/js/services/recurring-orders-service.js`

**Özellikler:**
- Haftalık tekrarlayan sipariş tanımı
- `day_of_week`: Hangi gün tekrarlansın
- `status`: 'active', 'paused', 'cancelled'
- `next_order_date`: Sonraki sipariş tarihi

---

## 9. VERİTABANINDA SAKLI İŞ KURALLARI

### 9.1 Teklif Şubesine Göre Geçerlilik
**Kural:** Müşteri spesifik şube için sipariş vermek istiyor

**Çözüm:** `OffersService.getAcceptedOfferForBranch(dealerId, customerId, branchId)`

Sadece ilgili şubeye ait teklif geçerlidir.

### 9.2 Müşteri Şubenin Bayi Kapsama Alanında Olması
**Kaynak:** `/js/services/offers-service.js`

**Metod:** `getCustomerBranchesInDealerCoverage()`

Bayi, yalnızca kapsama alanında (`dealer_coverage_areas`) olan şubelerin teklifini yapabilir.

### 9.3 Teklif İçeri Ürün Kontrolü (Cart Validation)
**Metod:** `OffersService.validateCartPricesForBranch()`

Sepetteki ürünlerin teklifteki fiyatlarla eşleşip eşleşmediğini kontrol eder. Geçersiz ürünler detayıyla listelenebilir.

---

## 10. RAPORLAMA KURALLARI

### 10.1 İstatistiksel Veriler
**Kaynak:** `/js/services/reports-service.js`

**Müşteri İstatistikleri:**
- Toplam müşteri sayısı
- Aktif/Pasif müşteri oranı
- Müşteri başına ortalama sipariş sayısı

**Teklif İstatistikleri:**
- Duruma göre gruplama (pending, accepted, rejected, cancelled)
- Bayi/Müşteri bazında filtering

**Satış İstatistikleri:** `getSalesStats()`
- Ürün bazında satış ve gelir
- İptal edilen siparişler hariç tutulur
- Tarih aralığına göre filtreleme

---

## ÖZET - KRİTİK İŞ KURALLARI

| Kural | Açıklama | Dosya |
|-------|----------|-------|
| **Fiyat Önceliği** | Teklif > Barem > Perakende | price-resolver-service.js |
| **Teklif Durumları** | requested → pending → accepted/rejected/cancelled | offers-service.js |
| **Sipariş Durumları** | waiting_for_assignment → on_the_way → completed | orders-service.js |
| **Puan Verme** | Sipariş tesliminde otomatik (`quantity × points_per_unit`) | points-service.js |
| **Şube Seçimi** | Son seçilen > Merkez (is_default) > Eski | branches-service.js |
| **Rol Yetkileri** | Owner: Tüm yetkiler, Staff: Atanmış şubeler | customer-users-service.js |
| **Teklif Genişletme** | Talep → Bayi Onayı → Yeni Teklif (accepted) | offers-service.js |
| **Çoklu Bayiler** | VKN düzeyinde farklı bayilerle teklif verilebilir | offers-service.js |
| **Sepet Senkronizasyonu** | SessionStorage + Supabase (Hybrid) | cart-service.js |
| **Adres Hiyerarşisi** | City → District → Neighborhood → Street | locations-service.js |

---

*Bu doküman İpragaz Bayi Sistemi kaynak kodlarının analizi sonucunda otomatik olarak oluşturulmuştur.*
*Son güncelleme: Ocak 2026*
