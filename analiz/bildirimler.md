# Bildirimler (Notifications) — Business Logic Dokümantasyonu

> **Konum:** Header'daki çan ikonu ve açılan dropdown
> **Portal:** Müşteri portalı (`isyerim-header.html`) ve Bayi portalı (`bayi-header.html`)
> **Son güncelleme:** 22.03.2026

---

## 1. Genel Bakış

Bildirim sistemi, teklif süreçlerinde ve mesajlaşmalarda gerçekleşen olayları kullanıcılara anlık olarak ileten bir mekanizmadır. Header'daki çan ikonuna tıklandığında açılan dropdown ile bildirimler listelenir. Supabase real-time aboneliği sayesinde yeni bildirimler anında gösterilir.

---

## 2. Bildirim Oluşturma Mekanizması

Bildirimler uygulama kodundan **doğrudan oluşturulmaz**. Veritabanı trigger'ları aracılığıyla otomatik üretilir.

### 2.1. Tetikleyici 1: Teklif Log Kaydı → Bildirim

**Trigger:** `create_notification_on_offer_log()`
**Tetiklenme:** `offer_logs` tablosuna INSERT yapıldığında
**Kaynak migration:** `20251229800000_create_notifications.sql`

Bir teklif üzerinde herhangi bir aksiyon gerçekleştiğinde (oluşturma, kabul, ret vb.) `OfferLogsService.log()` çağrılır ve `offer_logs` tablosuna kayıt eklenir. Bu kayıt eklenmesi, trigger fonksiyonunu tetikler ve ilgili tarafa bildirim oluşturur.

**Yönlendirme kuralı:**
- `actor_type = 'customer'` → Bayiye bildirim gönderilir
- `actor_type = 'dealer'` → Müşteriye bildirim gönderilir

### 2.2. Tetikleyici 2: Yeni Mesaj → Bildirim

**Trigger:** `create_notification_on_new_message()`
**Tetiklenme:** `offer_messages` tablosuna INSERT yapıldığında
**Kaynak migration:** `20251229900000_create_message_notifications.sql`

Teklif mesajlaşmasında yeni mesaj gönderildiğinde, karşı tarafa "Yeni Mesaj" bildirimi oluşturulur.

---

## 3. Bildirim Tipleri ve İçerikleri

### 3.1. Teklif Bildirimleri

| Aksiyon (action) | Bayi Bildirimi | Müşteri Bildirimi |
|-------------------|----------------|-------------------|
| `created` / `requested` | **Başlık:** "Yeni Teklif Talebi" **Mesaj:** "{Müşteri Adı} yeni teklif talebinde bulundu" | **Başlık:** "Talebiniz Alındı" **Mesaj:** "Teklif talebiniz bayiye iletildi" |
| `pending` | **Başlık:** "Teklif Gönderildi" **Mesaj:** "{Müşteri Adı} adına teklif gönderildi" | **Başlık:** "Teklifiniz Hazır!" **Mesaj:** "{Bayi Adı} size teklif gönderdi" |
| `accepted` | **Başlık:** "Teklif Kabul Edildi!" **Mesaj:** "{Müşteri Adı} teklifinizi kabul etti" | **Başlık:** "Teklif Onaylandı" **Mesaj:** "Teklifi kabul ettiniz" |
| `rejected` | **Başlık:** "Teklif Reddedildi" **Mesaj:** "{Müşteri Adı} teklifinizi reddetti" | **Başlık:** "Teklif Reddedildi" **Mesaj:** "Teklifi reddettiniz" |
| `cancelled` | **Başlık:** "Teklif İptal Edildi" | **Başlık:** "Teklif İptal Edildi" |
| `price_updated` | **Başlık:** "Fiyat Güncellendi" | **Başlık:** "Fiyat Güncellendi" **Mesaj:** "{Bayi Adı} fiyatları güncelledi" |
| `passived` | **Başlık:** "Teklif Pasife Alındı" | **Başlık:** "Teklif Pasif" |
| `activated` | **Başlık:** "Teklif Aktif Edildi" | **Başlık:** "Teklif Aktif" |

### 3.2. Mesaj Bildirimleri

| Aksiyon | İçerik |
|---------|--------|
| `message` | **Başlık:** "Yeni Mesaj" **Mesaj:** "{Gönderen Adı}: {Mesajın ilk 80 karakteri}" |

> **Not:** Mesaj 80 karakterden uzunsa kırpılır.

---

## 4. Header UI — Çan İkonu ve Badge

### 4.1. HTML Yapısı

```
┌──────────────────────────┐
│  🔔 [5]                  │  ← Çan ikonu + okunmamış sayı badge'i
└──────────────────────────┘
```

**Elementler:**
- **Çan ikonu:** `.notification-btn` (ID: `notificationBtn`) — SVG bell ikonu
- **Badge:** `.notification-badge` (ID: `notificationBadge`) — Kırmızı yuvarlak sayaç

### 4.2. Badge Hesaplama

```
Okunmamış sayı = notifications.filter(n => !n.is_read).length
Gösterim:
  - 0 ise → Badge gizlenir (müşteri) / "0" gösterilir (bayi)
  - 1-99 arası → Sayı gösterilir
  - 100+ ise → "99+" gösterilir
```

### 4.3. Animasyonlar

| Olay | Animasyon | Süre |
|------|-----------|------|
| Yeni bildirim geldiğinde | Çan sallanma (`bell-shake`: -15° → 15° rotasyon) | 0.5 saniye |
| Yeni bildirim geldiğinde | Badge nabız (`badge-pulse`: 1.0x → 1.15x ölçek) | 0.5 saniye |

---

## 5. Dropdown (Açılır Liste)

### 5.1. Açılma/Kapanma

- **Açılma:** Çan ikonuna tıklandığında `.active` class eklenir
- **Kapanma:** Dışarı tıklandığında veya tekrar çana tıklandığında kapanır
- **Özel durum:** Profil dropdown'u açıksa önce o kapanır

### 5.2. Dropdown Yapısı

```
┌─────────────────────────────────────────┐
│  Bildirimler          Tümünü Okundu     │
│                       İşaretle          │
├─────────────────────────────────────────┤
│  🟣 Yeni Teklif Talebi                 │
│     Güloğlu Ticaret yeni teklif...      │
│     5 dk önce                     ●     │  ← Mavi nokta = okunmamış
├─────────────────────────────────────────┤
│  ✅ Teklif Kabul Edildi!                │
│     ABC Ltd teklifinizi kabul etti       │
│     2 saat önce                         │
├─────────────────────────────────────────┤
│  💬 Yeni Mesaj                          │
│     Ahmet: Yarın teslimat için...        │
│     1 gün önce                          │
├─────────────────────────────────────────┤
│  ... (maks 20 bildirim)                 │
└─────────────────────────────────────────┘
```

### 5.3. Bildirim Öğesi İçeriği

Her bildirim satırında:
- **İkon:** Aksiyon tipine göre renkli SVG ikon (bkz. Bölüm 5.4)
- **Başlık:** Bildirim başlığı (bold)
- **Mesaj:** Bildirim mesajı (2 satıra kırpılır)
- **Zaman:** Göreli zaman formatı (Türkçe)
- **Okunmamış göstergesi:** Mavi nokta + açık mavi arka plan (`#f0f7ff`)

### 5.4. İkon ve Renk Eşleştirmesi

| Aksiyon | İkon | Renk |
|---------|------|------|
| `accepted` | ✓ (Onay işareti) | Yeşil (`#22c55e`) |
| `rejected` | ✕ (Çarpı) | Kırmızı (`#ef4444`) |
| `pending` | ⏱ (Saat) | Mavi (`#3b82f6`) |
| `price_updated` | $ (Para işareti) | Turuncu (`#f59e0b`) |
| `cancelled` | ⊘ (Çarpılı daire) | Gri (`#6b7280`) |
| `created` / `requested` | 📄+ (Doküman) | Mor (`#8b5cf6`) |
| `message` | 💬 (Sohbet balonu) | Mavi (`#3b82f6`) |
| `activated` | ✓ (Onay işareti) | Yeşil (`#22c55e`) |
| `passived` | − (Eksi) | Gri (`#6b7280`) |
| Varsayılan | 🔔 (Çan) | Gri (`#6b7280`) |

### 5.5. Zaman Gösterimi

| Aralık | Gösterim |
|--------|----------|
| < 60 saniye | "Az önce" |
| < 60 dakika | "{X} dk önce" |
| < 24 saat | "{X} saat önce" |
| < 7 gün | "{X} gün önce" |
| ≥ 7 gün | Tam tarih (Türkçe locale) |

### 5.6. Görsel Özellikler

- **Genişlik:** 360px
- **Maksimum yükseklik:** 480px (kaydırılabilir)
- **Köşe yuvarlaklığı:** 16px
- **Gölge:** Hafif drop shadow
- **Mobilde:** Tam ekran sabit (fixed) overlay'e dönüşür

---

## 6. Bildirime Tıklama Davranışı

### 6.1. Müşteri Portalında

1. Bildirime tıklanır
2. Dropdown kapanır
3. **Bildirim detay modal'ı açılır:**

```
┌─────────────────────────────────────────┐
│                                    ✕    │
│  ┌─────────────────────────────────┐    │
│  │  ✅ Teklif Kabul Edildi!        │    │  ← Renkli durum badge'i
│  └─────────────────────────────────┘    │
│                                         │
│  2 saat önce                            │
│                                         │
│  ABC Ltd teklifinizi kabul etti.        │
│  Detayları görüntülemek için            │
│  aşağıdaki butona tıklayınız.           │
│                                         │
│  ┌─────────────┐  ┌──────────────┐      │
│  │Teklifi Gör  │  │   Kapat      │      │
│  └─────────────┘  └──────────────┘      │
└─────────────────────────────────────────┘
```

4. **2 saniye sonra** bildirim otomatik olarak okundu işaretlenir
5. Badge sayısı güncellenir

**"Teklifi Görüntüle" butonu:**
- Sadece `offer_id` mevcutsa gösterilir
- Tıklandığında → `isyerim-musteri-bayi-fiyatlari.html?offer_id={id}` sayfasına yönlendirir

### 6.2. Bayi Portalında

1. Bildirime tıklanır
2. Dropdown kapanır (hem masaüstü hem mobil)
3. **Modal açılmaz** — doğrudan yönlendirme yapılır
4. Bildirim hemen okundu işaretlenir → `NotificationsService.markAsRead(id)`
5. Bildirim listesi yenilenir
6. `offer_id` mevcutsa → `bayi-teklif-listesi.html` sayfasına yönlendirir

### 6.3. Müşteri vs Bayi Karşılaştırması

| Özellik | Müşteri Portalı | Bayi Portalı |
|---------|----------------|--------------|
| **Tıklama davranışı** | Modal açılır | Direkt sayfa yönlendirmesi |
| **Okundu işaretleme** | 2 sn gecikme ile otomatik | Anında |
| **Yönlendirme hedefi** | `isyerim-musteri-bayi-fiyatlari.html` | `bayi-teklif-listesi.html` |
| **Modal** | Var (detay + CTA butonları) | Yok |

---

## 7. "Tümünü Okundu İşaretle" Butonu

- **Konum:** Dropdown başlığının sağ tarafı
- **ID:** `markAllReadBtn`
- **Fonksiyon:** `NotificationsService.markAllAsRead(userId, userType)`
- **Davranış:**
  1. Tüm okunmamış bildirimler `is_read = true` yapılır
  2. Bildirim listesi yeniden render edilir
  3. Badge sayısı 0'a düşer / gizlenir

---

## 8. Real-Time (Anlık) Bildirimler

### 8.1. Abonelik Mekanizması

Sayfa yüklendiğinde `NotificationsService.subscribe(userId, callback)` çağrılır:

```
Supabase kanal: "notifications-{userId}"
Dinlenen olay: postgres_changes → INSERT
Filtre: user_id = eq.{userId}
```

### 8.2. Yeni Bildirim Geldiğinde

1. **Toast (kısa süreli bilgi kartı) gösterilir:**

```
┌─────────────────────────────────────┐
│  ✅ Teklif Kabul Edildi!            │
│  ABC Ltd teklifinizi kabul etti     │
│  ┌──────────┐                       │
│  │ Görüntüle│                       │
│  └──────────┘                       │
│  ████████████░░░░  ← ilerleme çubuğu│
└─────────────────────────────────────┘
```

- **Konum:** Sağ üst köşe (fixed, top: 20px, right: 20px)
- **Genişlik:** 320-400px
- **Süre:** 5 saniye sonra otomatik kapanır
- **İlerleme çubuğu:** Kırmızı (`#e31e24`), 5 saniyede %100'den %0'a iner
- **"Görüntüle" butonu:** `offer_id` mevcutsa teklif sayfasına yönlendirir
- **Kapanış animasyonu:** `.removing` class ile fade-out

2. **Çan ikonu sallanır** (shake animasyonu, 0.5 sn)
3. **Badge nabız atar** (pulse animasyonu, 0.5 sn)
4. **Bildirim listesi yeniden yüklenir** → `loadNotifications()`

### 8.3. Toast Yönlendirme Hedefleri

| Portal | Hedef Sayfa |
|--------|------------|
| Müşteri | `isyerim-musteri-bayi-fiyatlari.html?offer_id={id}` |
| Bayi | `bayi-teklif-listesi.html` |

---

## 9. Adres/Şube Bazlı Davranış

### 9.1. Mevcut Durum

**Bildirimler şu anda şube bazlı filtrelenmemektedir.**

- `notifications` tablosunda `branch_id` veya `customer_branch_id` kolonu **yoktur**
- `NotificationsService.getAll()` sorgusu şube filtresi **uygulamaz**
- Kullanıcı şube değiştirdiğinde bildirim listesi **değişmez**
- Tüm bildirimler, hangi şubeden yapılan teklif olursa olsun, gösterilir

### 9.2. Altyapı Durumu

Teklifler (offers) tablosunda şube bağlantısı **mevcuttur:**
- `offers.customer_branch_id` → FK → `customer_branches`
- `idx_offers_branch` (dealer_id, customer_branch_id, status) indeksi var
- `idx_offers_customer_branch` (customer_id, customer_branch_id) indeksi var

Ancak bu bağlantı bildirim oluşturma trigger'ına ve bildirim sorgularına **yansıtılmamıştır**.

### 9.3. Şube Seçim Mekanizması

Header'daki şube seçim dropdown'u:
- `sessionStorage.getItem('selected_address_id')` → Seçili şube ID'si
- `sessionStorage.getItem('selected_address_name')` → Seçili şube adı
- Şube değişikliği `loadSelectedAddress()` ile yönetilir (component-loader.js)

**Sonuç:** Şube değiştirildiğinde siparişler, teklifler gibi veriler filtrelenir, ancak bildirimler **filtrelenmez** — tüm şubelerin bildirimleri birlikte gösterilir.

---

## 10. Kullanıcı Seviyeleri ve Erişim

| Kullanıcı Tipi | Erişim | Bildirim Kaynağı |
|----------------|--------|-----------------|
| **Müşteri — Owner** | Tüm bildirimleri görür | Teklif + mesaj bildirimleri |
| **Müşteri — Staff** | Tüm bildirimleri görür | Aynı customer_id'ye ait bildirimler |
| **Bayi** | Tüm bildirimleri görür | Teklif + mesaj bildirimleri |
| **Backoffice Admin** | Bu özellik backoffice'te yok | — |
| **Giriş yapmamış** | Çan ikonu gösterilmez | — |

> **Not:** Owner ve Staff arasında bildirim erişiminde fark yoktur. Her ikisi de aynı `customer_id` üzerinden tüm bildirimleri görür.

---

## 11. Bildirim Yükleme ve Sayfa Başlangıcı

### 11.1. Başlatma Akışı

```
Sayfa yüklenir (DOMContentLoaded)
    │
    ▼
NotificationUI.init()
    │
    ├─ sessionStorage'dan userId ve userType alınır
    ├─ NotificationsService yüklenene kadar beklenir
    │
    ▼
loadNotifications()
    │
    ├─ NotificationsService.getAll(userId, userType, {limit: 20})
    ├─ Bildirimler dropdown'a render edilir
    ├─ Badge güncellenir
    │
    ▼
subscribeToRealtime()
    │
    └─ NotificationsService.subscribe(userId, callback)
        └─ Yeni bildirim geldiğinde: toast + animasyon + liste yenileme
```

### 11.2. Listeleme Limiti

- Dropdown'da maksimum **20 bildirim** gösterilir
- Sıralama: `created_at DESC` (en yeni en üstte)

---

## 12. Veritabanı Şeması

### 12.1. notifications Tablosu

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Bildirim alıcısının ID'si |
| `user_type` | VARCHAR(20) | `'dealer'` veya `'customer'` |
| `offer_id` | UUID (nullable) | İlişkili teklif ID'si (FK → offers) |
| `action` | VARCHAR(50) | Bildirim tipi (bkz. Bölüm 3) |
| `title` | VARCHAR(255) | Bildirim başlığı |
| `message` | TEXT | Bildirim mesajı |
| `is_read` | BOOLEAN | Okundu durumu (varsayılan: `false`) |
| `created_at` | TIMESTAMP | Oluşturulma zamanı |

**İndeksler:**
- `idx_notifications_user` → (user_id, user_type, is_read)
- `idx_notifications_created_at` → (created_at DESC)

**RLS:** Permissive politika — tüm kullanıcılar için açık (filtreleme uygulama seviyesinde yapılır)

### 12.2. offer_logs Tablosu (Bildirim Kaynağı)

| Kolon | Tip | Açıklama |
|-------|-----|----------|
| `id` | UUID | Primary key |
| `offer_id` | UUID | İlişkili teklif (FK → offers) |
| `action` | VARCHAR(50) | Gerçekleştirilen aksiyon |
| `actor_type` | VARCHAR(20) | `'dealer'` veya `'customer'` |
| `actor_id` | UUID | Aksiyonu yapan kullanıcı |
| `actor_name` | VARCHAR(255) | Aksiyonu yapanın adı |
| `details` | JSONB | Ek meta veri |
| `created_at` | TIMESTAMP | Oluşturulma zamanı |

### 12.3. offer_messages Tablosu (Mesaj Bildirimi Kaynağı)

Mesaj tablosuna INSERT yapıldığında `create_notification_on_new_message()` trigger'ı tetiklenir ve karşı tarafa bildirim oluşturulur.

---

## 13. Bildirimlerim Sayfası

**Dosya:** `isyerim-musteri-bildirimlerim.html`

**Mevcut durum:** Placeholder sayfası — henüz aktif değil.

Sayfa şu anda şu mesajı göstermektedir:
> "Bu sayfa yakın zamanda aktif olacak"
> "Bildirimlerinizi buradan görüntüleyebileceksiniz"

Bildirimlerin tamamı şu anda yalnızca header dropdown üzerinden görüntülenebilmektedir.

---

## 14. Servis Metotları

**Dosya:** `js/services/notifications-service.js`

| Metot | Açıklama |
|-------|----------|
| `getAll(userId, userType, options)` | Bildirimleri getirir. `options`: `{unreadOnly: bool, limit: number}` |
| `getUnreadCount(userId, userType)` | Okunmamış bildirim sayısını döndürür |
| `markAsRead(notificationId)` | Tek bildirimi okundu işaretler |
| `markAllAsRead(userId, userType)` | Tüm bildirimleri okundu işaretler |
| `delete(notificationId)` | Tek bildirimi siler |
| `deleteAll(userId, userType)` | Tüm bildirimleri siler |
| `subscribe(userId, callback)` | Real-time abonelik başlatır (INSERT olayları) |
| `unsubscribe()` | Real-time aboneliği sonlandırır |

---

## 15. Veri Akış Diyagramı

```
                    ┌──────────────────────┐
                    │   Kullanıcı Aksiyonu  │
                    │  (teklif oluştur,     │
                    │   kabul et, mesaj     │
                    │   gönder vb.)         │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  offer_logs INSERT    │
                    │  veya                 │
                    │  offer_messages INSERT│
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │  DB Trigger tetiklenir │
                    │  (SECURITY DEFINER)   │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                                  │
    ┌─────────▼─────────┐            ┌──────────▼──────────┐
    │ Bayi bildirimi     │            │ Müşteri bildirimi    │
    │ INSERT into        │            │ INSERT into          │
    │ notifications      │            │ notifications        │
    └─────────┬─────────┘            └──────────┬──────────┘
              │                                  │
    ┌─────────▼─────────┐            ┌──────────▼──────────┐
    │ Supabase Real-time │            │ Supabase Real-time   │
    │ postgres_changes   │            │ postgres_changes     │
    └─────────┬─────────┘            └──────────┬──────────┘
              │                                  │
    ┌─────────▼─────────┐            ┌──────────▼──────────┐
    │ Bayi UI            │            │ Müşteri UI           │
    │ • Çan sallanır     │            │ • Çan sallanır       │
    │ • Badge güncellenir│            │ • Badge güncellenir  │
    │ • Toast gösterilir │            │ • Toast gösterilir   │
    │ • Liste yenilenir  │            │ • Liste yenilenir    │
    └───────────────────┘            └─────────────────────┘
```

---

## 16. Edge Case'ler ve Özel Durumlar

| Senaryo | Davranış |
|---------|----------|
| Hiç bildirim yoksa | Dropdown'da boş liste gösterilir |
| 100+ okunmamış bildirim | Badge "99+" gösterir |
| Bildirimde offer_id yoksa | "Teklifi Görüntüle" butonu gösterilmez |
| Bayi/müşteri adı NULL ise | Fallback: "Bayi" veya "Müşteri" kullanılır |
| Kullanıcı giriş yapmamışsa | Bildirim sistemi başlatılmaz |
| Sayfa kapatıldığında | Real-time abonelik otomatik sonlanır |
| Şube değiştirildiğinde | Bildirimler **filtrelenmez**, tümü gösterilmeye devam eder |
| Aynı anda birden fazla bildirim gelirse | Her biri için ayrı toast gösterilir, liste toplu yenilenir |
| Profil dropdown'u açıkken çana tıklanırsa | Profil dropdown kapanır, bildirim dropdown açılır |

---

## 17. İlgili Dosyalar

| Dosya | İçerik |
|-------|--------|
| `components/isyerim-header.html` (satır 1192-1250, 1347-1587) | Müşteri header: HTML + JS bildirim mantığı |
| `components/bayi-header.html` (satır 688-715) | Bayi header: HTML + JS bildirim mantığı |
| `js/services/notifications-service.js` | Bildirim CRUD + real-time abonelik |
| `js/component-loader.js` (satır 358-799, 1174-1277) | UI render, event handler'lar, real-time |
| `js/services/offer-logs-service.js` | Teklif log kaydı (bildirimi tetikler) |
| `js/services/messages-service.js` | Mesaj CRUD (bildirimi tetikler) |
| `isyerim-musteri-bildirimlerim.html` | Bildirimlerim sayfası (placeholder) |
| `supabase/migrations/20251229800000_create_notifications.sql` | Tablo + teklif log trigger'ı |
| `supabase/migrations/20251229900000_create_message_notifications.sql` | Mesaj trigger'ı |
| `supabase/migrations/20251229950000_fix_notifications_rls.sql` | RLS politikaları |
| `supabase/migrations/20251229400000_create_offer_logs.sql` | offer_logs tablosu |
