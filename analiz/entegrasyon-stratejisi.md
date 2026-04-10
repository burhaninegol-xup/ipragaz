# Entegrasyon Stratejisi — Mevcut Yayın Ortamına Geçiş Planı

> **Kapsam:** AI ile geliştirilen teklif modülünün, yayındaki web ve mobil uygulamalarla entegrasyonu
> **Kısıt:** Mevcut yayındaki uygulamalarda köklü değişiklik yapılamaz
> **Hedef:** CTA'lar ile kullanıcıları (müşteri + bayi) yeni ortama yönlendirmek
> **Son güncelleme:** 22.03.2026

---

## 1. Mevcut Durum Özeti

### 1.1. Yeni Geliştirilen Modül (Bu Proje)

| Özellik | Detay |
|---------|-------|
| **Mimari** | Statik HTML/CSS/JS + Supabase backend |
| **Sunucu** | http-server (statik dosya sunucusu, sunucu tarafı mantık yok) |
| **Veritabanı** | Supabase PostgreSQL (doğrudan istemci erişimi, anon key ile) |
| **Kimlik doğrulama** | sessionStorage tabanlı, Supabase Auth kullanılmıyor |
| **RLS** | Permissive politikalar (tüm tablolar açık) |
| **Yeni tablolar** | offers, offer_details, offer_messages, offer_logs, customer_branches, dealer_districts, cart_items, notifications, vb. |
| **Yeni ekranlar** | ~97 sayfa (müşteri + bayi + backoffice portalları) |

### 1.2. Yayındaki Uygulama (Mevcut)

| Özellik | Varsayım |
|---------|----------|
| **Web** | Kurumsal web uygulaması (muhtemelen framework tabanlı) |
| **Mobil** | Native veya hybrid mobil uygulama |
| **Kimlik doğrulama** | Kurumsal SSO / token tabanlı auth |
| **Altyapı** | Güvenli sunucu ortamı, load balancer, SSL |

---

## 2. Entegrasyon Yaklaşımları

### Yaklaşım A: Deep Link ile Yönlendirme (Önerilen — Hızlı Başlangıç)

```
┌──────────────────────┐         ┌──────────────────────┐
│  Mevcut Web/Mobil     │  CTA   │  Yeni Teklif Modülü   │
│  Uygulama             │ ────►  │  (Ayrı domain/subdomain)│
│                       │        │                        │
│  "Teklif Al" butonu   │        │  Token ile otomatik    │
│  "Tekliflerim" linki  │        │  oturum açma           │
│                       │        │  Tüm süreç burada     │
└──────────────────────┘         └──────────────────────┘
```

**Nasıl çalışır:**
1. Mevcut uygulamada stratejik noktalara CTA butonları eklenir
2. Tıklandığında kullanıcı, yeni uygulamanın URL'ine yönlendirilir
3. URL'de şifreli token ile kullanıcı kimliği taşınır
4. Yeni uygulama token'ı doğrular ve oturumu otomatik başlatır
5. Kullanıcı tüm teklif sürecini yeni ortamda tamamlar

**Avantajları:**
- Mevcut uygulamada minimum değişiklik (sadece link/buton ekleme)
- Bağımsız deploy ve güncelleme imkanı
- Mobil uygulama için de aynı URL'ler kullanılabilir (in-app browser veya deep link)
- Hızlı go-live

**Dezavantajları:**
- Kullanıcı farklı bir ortama geçtiğini hissedebilir
- İki ayrı session yönetimi gerekir

---

### Yaklaşım B: iframe / WebView Gömme

```
┌──────────────────────────────────────┐
│  Mevcut Uygulama                      │
│  ┌──────────────────────────────────┐ │
│  │  iframe / WebView                 │ │
│  │  ┌────────────────────────────┐  │ │
│  │  │  Yeni Teklif Modülü         │  │ │
│  │  │  (Gömülü olarak çalışır)    │  │ │
│  │  └────────────────────────────┘  │ │
│  └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Nasıl çalışır:**
1. Mevcut uygulamada teklif ile ilgili sayfalar iframe içine gömülür
2. `postMessage` API ile iki uygulama arasında güvenli iletişim sağlanır
3. Kullanıcı kimliği parent window'dan iframe'e aktarılır

**Avantajları:**
- Kullanıcı aynı uygulamada kalmış hisseder
- Header/footer mevcut uygulamadan gelir, tutarlı deneyim

**Dezavantajları:**
- iframe güvenlik kısıtlamaları (X-Frame-Options, CSP)
- Mobilde iframe performans sorunları
- Çift scroll, responsive uyumsuzluklar
- postMessage güvenlik riskleri (origin validasyonu kritik)

---

### Yaklaşım C: API Köprüsü (Orta Vadeli — En Güvenli)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Mevcut       │     │  API Gateway  │     │  Supabase    │
│  Web/Mobil    │ ──► │  (Yeni katman)│ ──► │  PostgreSQL  │
│  Uygulama     │     │  JWT doğrulama│     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Nasıl çalışır:**
1. Mevcut uygulamanın backend'ine yeni API endpoint'leri eklenir
2. Bu endpoint'ler Supabase veritabanına sunucu tarafından bağlanır (service_role key ile)
3. Mevcut uygulamanın auth sistemi kullanılır
4. Frontend'de yeni ekranlar mevcut uygulamanın içine entegre edilir

**Avantajları:**
- En güvenli yaklaşım (sunucu tarafı doğrulama)
- Mevcut auth sistemiyle tam entegrasyon
- Tek session, tek kullanıcı deneyimi

**Dezavantajları:**
- En çok geliştirme gerektiren yaklaşım
- Mevcut backend'de değişiklik gerekir
- Daha uzun go-live süresi

---

## 3. Önerilen Strateji: Aşamalı Yaklaşım

### Faz 1: Deep Link ile Hızlı Başlangıç (1-2 Hafta)

**Hedef:** Kullanıcıları mevcut uygulamadan yeni teklif modülüne güvenli şekilde yönlendirmek.

#### 1.1. Güvenli Token Mekanizması

Mevcut uygulama ile yeni uygulama arasında kullanıcı aktarımı için tek kullanımlık, zamanlı token sistemi:

```
Mevcut Uygulama (Backend)
    │
    ├─ Kullanıcı "Teklif Al" CTA'sına tıklar
    ├─ Backend bir token üretir:
    │   {
    │     user_id: "xxx",
    │     user_type: "customer" | "dealer",
    │     customer_id: "xxx",
    │     dealer_id: "xxx",   (bayi ise)
    │     branch_id: "xxx",   (varsa)
    │     exp: timestamp + 5dk,
    │     nonce: random
    │   }
    ├─ Token şifrelenir (AES-256 veya JWT signed)
    ├─ Token veritabanına kaydedilir (tek kullanımlık)
    │
    ▼
Yönlendirme URL'i:
https://teklif.ipragaz.com/giris?token=eyJhbGci...
    │
    ▼
Yeni Uygulama
    ├─ Token'ı parse et
    ├─ Süre kontrolü (5 dk)
    ├─ Tek kullanım kontrolü (kullanıldıysa reddet)
    ├─ Token'ı kullanıldı olarak işaretle
    ├─ sessionStorage'ı doldur (isyerim_customer_id, vb.)
    └─ İlgili sayfaya yönlendir
```

#### 1.2. CTA Yerleşim Noktaları

**Müşteri (İşYerim) tarafında:**

| Mevcut Ekran | CTA Metni | Hedef Sayfa |
|-------------|-----------|-------------|
| Ana sayfa / Dashboard | "Teklif Talep Et" | `isyerim-musteri-teklif-iste.html` |
| Sipariş geçmişi | "Bu Siparişi Tekrarla" | `isyerim-musteri-anasayfa.html` (Son Siparişimi Tekrarla) |
| Ürün listesi | "Fiyat Teklifi Al" | `isyerim-musteri-bayi-fiyatlari.html` |
| Profil / Hesabım | "Tekliflerim" | `isyerim-musteri-teklifler.html` |
| Bildirim (push) | "Teklifiniz Hazır" | `isyerim-musteri-bayi-fiyatlari.html?offer_id=xxx` |

**Bayi tarafında:**

| Mevcut Ekran | CTA Metni | Hedef Sayfa |
|-------------|-----------|-------------|
| Bayi paneli | "Teklif Oluştur" | `bayi-teklif-olustur.html` |
| Müşteri listesi | "Teklif Gönder" | `bayi-teklif-olustur.html?customer_id=xxx` |
| Bildirim | "Yeni Teklif Talebi" | `bayi-teklif-talepleri.html` |

#### 1.3. Mobil Uygulama Entegrasyonu

| Yöntem | Açıklama | Avantaj | Dezavantaj |
|--------|----------|---------|-----------|
| **In-App Browser (Önerilen)** | Mobil uygulama içinde WebView ile açılır | Kullanıcı uygulamadan çıkmaz | Header/navigation uyumu gerekir |
| **Harici Tarayıcı** | Varsayılan tarayıcıda açılır | Kolay implementasyon | Kullanıcı deneyimi kötü |
| **Deep Link (Universal Links / App Links)** | Özel URL scheme ile mobil uygulamaya geri dönüş | İki yönlü geçiş | Platform bazlı implementasyon |

**Önerilen:** In-App Browser (SFSafariViewController / Chrome Custom Tabs) ile açılması. Bu yöntem:
- Kullanıcıyı uygulama içinde tutar
- Cookie ve session paylaşımına izin verir
- Geri dönüş butonu ile mevcut uygulamaya kolay geçiş sağlar

---

### Faz 2: Güvenlik Sertleştirme (Faz 1 ile Paralel veya Hemen Sonra)

**Mevcut güvenlik durumu ve alınması gereken önlemler:**

#### 2.1. Kritik: RLS Politikalarının Güçlendirilmesi

**Mevcut durum:** Tüm tablolarda `USING (true)` — herkes her şeyi okuyabilir/yazabilir.

**Yapılması gereken:**

```sql
-- Örnek: offers tablosu için
DROP POLICY "Allow all for anon" ON offers;
DROP POLICY "Allow all for authenticated" ON offers;

-- Müşteri sadece kendi tekliflerini görebilir
CREATE POLICY "customer_read_own_offers" ON offers
    FOR SELECT USING (
        customer_id = current_setting('app.customer_id')::uuid
    );

-- Bayi sadece kendi tekliflerini görebilir
CREATE POLICY "dealer_read_own_offers" ON offers
    FOR SELECT USING (
        dealer_id = current_setting('app.dealer_id')::uuid
    );
```

> **Önemli:** Bu değişiklik için Supabase Auth entegrasyonu veya custom JWT çözümü gerekir.

#### 2.2. Kritik: API Katmanı Eklenmesi

Doğrudan istemci-Supabase bağlantısı yerine bir API Gateway:

```
İstemci → API Gateway (JWT doğrulama) → Supabase (service_role key)
```

**Seçenekler:**
- Supabase Edge Functions (Deno tabanlı, Supabase'in kendi altyapısı)
- Cloudflare Workers (düşük latency, global dağıtım)
- AWS Lambda + API Gateway
- Mevcut uygulamanın backend'ine ek endpoint'ler

#### 2.3. Session Güvenliği

| Mevcut | Hedef |
|--------|-------|
| sessionStorage (client-side, manipüle edilebilir) | HTTP-only secure cookie + JWT |
| SHA-256 client-side hashing | Server-side bcrypt + salt |
| Anon key ile doğrudan DB erişimi | Service role key sadece backend'de |
| Süresiz session | Token expiry + refresh token |

#### 2.4. Veri İzolasyonu

| Risk | Önlem |
|------|-------|
| Müşteri A, Müşteri B'nin tekliflerini görebilir | RLS: `customer_id = auth.uid()` |
| Bayi A, Bayi B'nin fiyatlarını görebilir | RLS: `dealer_id = auth.uid()` |
| Anon key ile doğrudan tablo erişimi | API katmanı + service_role |
| Bildirim tablosunda veri sızıntısı | RLS: `user_id = auth.uid()` |

---

### Faz 3: Derin Entegrasyon (Orta Vadeli, 1-3 Ay)

Faz 1 ve 2 başarılı olduktan sonra, kullanıcı deneyimini iyileştirmek için:

#### 3.1. Tek Oturum Açma (SSO)

Mevcut uygulamanın auth sistemi ile yeni modül arasında SSO:

```
Mevcut Uygulama (Auth Provider)
    │
    ├─ OAuth 2.0 / OpenID Connect
    │
    ▼
Yeni Teklif Modülü (Auth Consumer)
    └─ Mevcut token'ı kabul et, session oluştur
```

#### 3.2. Paylaşılan Header/Navigation

Mevcut uygulamanın header bileşenini yeni modülde de kullanmak:
- Micro-frontend yaklaşımı
- Veya ortak CSS/JS kütüphanesi

#### 3.3. Bildirim Entegrasyonu

Yeni modüldeki bildirimler (teklif kabul, fiyat güncelleme vb.) mevcut uygulamanın push notification altyapısına bağlanabilir:

```
Supabase Trigger (bildirim oluşturma)
    │
    ▼
Webhook → Mevcut Push Notification Servisi
    │
    ▼
Mobil Push / Web Push → Kullanıcıya bildirim
    │
    ▼
Tıklama → Deep link ile yeni modüle yönlendirme
```

---

## 4. Performans Değerlendirmesi

### 4.1. Mevcut Performans Profili

| Metrik | Durum | Not |
|--------|-------|-----|
| İlk yükleme | Yavaş (97 HTML dosyası, her sayfa bağımsız) | CDN ile iyileştirilebilir |
| Supabase sorguları | Hızlı (indeksler mevcut) | Her sayfa yüklemesinde yeniden sorgu |
| Statik dosya boyutu | Orta (~129K LOC) | Minify + gzip gerekli |
| Real-time (bildirimler) | İyi (Supabase Realtime) | WebSocket bağlantı limitleri |
| Mobilde WebView | Riskli | DOM ağır, framework yok |

### 4.2. Performans İyileştirme Önerileri

| Alan | Öneri | Öncelik |
|------|-------|---------|
| **CDN** | Statik dosyaları CDN'den sun (CloudFront, Cloudflare) | Yüksek |
| **Minify** | HTML/CSS/JS minification + gzip | Yüksek |
| **Lazy Loading** | Servis dosyalarını ihtiyaç anında yükle | Orta |
| **Caching** | Supabase sorgu sonuçlarını sessionStorage'da önbellekle | Orta |
| **Image Optimization** | Ürün resimlerini WebP formatına dönüştür | Düşük |
| **Bundle** | Kritik JS dosyalarını tek dosyada birleştir | Düşük |

---

## 5. Güvenlik Kontrol Listesi (Go-Live Öncesi)

### 5.1. Zorunlu (Faz 1 ile birlikte)

- [ ] SSL/TLS sertifikası (HTTPS zorunlu)
- [ ] Token tabanlı kullanıcı aktarımı (açık URL parametresi yerine)
- [ ] Token tek kullanımlık + zamanlı (max 5 dakika)
- [ ] Origin/Referer validasyonu (sadece bilinen domain'lerden geçiş)
- [ ] Varsayılan şifrelerin değiştirilmesi (admin/admin123)
- [ ] Supabase anon key'in production için yeniden oluşturulması
- [ ] Rate limiting (login endpoint'lerinde)
- [ ] Error mesajlarında hassas bilgi sızıntısı kontrolü

### 5.2. Yüksek Öncelikli (Faz 2)

- [ ] RLS politikalarının güçlendirilmesi (row-level veri izolasyonu)
- [ ] API Gateway eklenmesi (doğrudan DB erişiminin kapatılması)
- [ ] JWT tabanlı session yönetimi
- [ ] Server-side password hashing (bcrypt)
- [ ] PII verilerinin şifrelenmesi (VKN, telefon)
- [ ] Audit log (kim, ne zaman, ne yaptı)
- [ ] Content Security Policy (CSP) header'ları
- [ ] CORS konfigürasyonu (sadece izinli origin'ler)

### 5.3. İyi Olur (Faz 3)

- [ ] Penetration test
- [ ] KVKK uyumluluğu değerlendirmesi
- [ ] WAF (Web Application Firewall)
- [ ] DDoS koruması
- [ ] Otomatik güvenlik taraması (OWASP ZAP veya benzeri)

---

## 6. Mimari Karar Matrisi

| Kriter | Deep Link (A) | iframe (B) | API Köprüsü (C) |
|--------|:------------:|:----------:|:----------------:|
| **Mevcut uygulamada değişiklik** | Minimum ✅ | Orta | Yüksek |
| **Go-live süresi** | 1-2 hafta ✅ | 2-4 hafta | 1-3 ay |
| **Kullanıcı deneyimi** | Orta | İyi | En iyi ✅ |
| **Güvenlik** | Orta | Riskli | En güvenli ✅ |
| **Mobil uyumluluk** | İyi | Zayıf | En iyi ✅ |
| **Bakım kolaylığı** | Bağımsız deploy ✅ | Karmaşık | Sıkı bağımlılık |
| **Performans** | İyi | Kötü (çift DOM) | En iyi ✅ |

**Önerilen yol:** **A → B atlayarak → C'ye geçiş**

1. **Hemen:** Deep Link (Faz 1) ile başla — minimum eforla canlıya al
2. **Paralelde:** Güvenlik sertleştirme (Faz 2) çalışmalarını başlat
3. **Orta vadede:** API Köprüsü (Faz 3) ile tam entegrasyona geç
4. **iframe yolunu atla** — güvenlik ve performans riskleri çözülmesi zor sorunlar yaratır

---

## 7. Önerilen URL Yapısı

```
Production Domain Yapısı:

Ana uygulama:     https://isyerim.ipragaz.com.tr
Teklif modülü:    https://teklif.isyerim.ipragaz.com.tr  (subdomain)
                  veya
                  https://isyerim.ipragaz.com.tr/teklif/  (alt dizin)

Bayi uygulaması:  https://bayi.ipragaz.com.tr
Teklif modülü:    https://teklif.bayi.ipragaz.com.tr
                  veya
                  https://bayi.ipragaz.com.tr/teklif/
```

**Subdomain vs Alt dizin:**

| | Subdomain | Alt dizin |
|--|-----------|-----------|
| Cookie paylaşımı | `.ipragaz.com.tr` domain cookie ile | Otomatik |
| SSL | Ayrı sertifika veya wildcard | Aynı sertifika |
| Deploy bağımsızlığı | Tam bağımsız ✅ | Sunucu konfigürasyonu gerekir |
| CORS | Cross-origin (konfigürasyon gerekli) | Same-origin ✅ |
| **Öneri** | **Faz 1 için önerilen** | Faz 3 için daha uygun |

---

## 8. Veri Senkronizasyonu

### 8.1. Mevcut Uygulama → Yeni Modül

Mevcut uygulamadaki müşteri ve bayi verileri Supabase'e aktarılmalı:

| Veri | Kaynak | Hedef | Yöntem |
|------|--------|-------|--------|
| Müşteri bilgileri | Mevcut DB | Supabase `customers` | Toplu import + incremental sync |
| Bayi bilgileri | Mevcut DB | Supabase `dealers` | Toplu import + incremental sync |
| Ürün kataloğu | Mevcut DB | Supabase `products` | Toplu import + incremental sync |
| Şube/adresler | Mevcut DB | Supabase `customer_branches` | İlk kullanımda veya toplu import |

### 8.2. Yeni Modül → Mevcut Uygulama

Yeni modülde oluşturulan verilerin mevcut sisteme geri akması:

| Veri | Kaynak | Hedef | Yöntem |
|------|--------|-------|--------|
| Oluşturulan siparişler | Supabase `orders` | Mevcut sipariş sistemi | Webhook / DB trigger |
| Kabul edilen teklifler | Supabase `offers` | Mevcut fiyatlandırma | Webhook / scheduled job |
| Yeni şubeler | Supabase `customer_branches` | Mevcut adres veritabanı | Webhook |

**Önerilen senkronizasyon yöntemi:**

```
Supabase Database Trigger
    │
    ▼
Supabase Edge Function (Webhook)
    │
    ▼
Mevcut Uygulamanın API'si
    │
    ▼
Mevcut Veritabanı Güncelleme
```

---

## 9. Riskler ve Azaltma Stratejileri

| Risk | Etki | Olasılık | Azaltma |
|------|------|----------|---------|
| **Token çalınması** | Yetkisiz erişim | Orta | Tek kullanım + 5 dk süre + IP kontrolü |
| **Supabase anon key kötüye kullanımı** | Veri sızıntısı | Yüksek | API Gateway (Faz 2) + RLS güçlendirme |
| **SessionStorage manipülasyonu** | Kimlik taklit | Yüksek | JWT (Faz 2) + sunucu doğrulaması |
| **Çift veri kaynağı tutarsızlığı** | İş süreci hatası | Orta | Webhook + reconciliation job |
| **WebView performans sorunları** | Kötü mobil deneyim | Orta | Lazy loading + minification + CDN |
| **Kullanıcı karmaşası (iki farklı ortam)** | Düşük kullanım | Düşük | Tutarlı branding + smooth geçiş animasyonu |

---

## 10. Sonuç ve Yol Haritası

```
Hafta 1-2: Faz 1 — Deep Link Entegrasyonu
    ├─ Token mekanizması geliştir
    ├─ Mevcut uygulamada CTA butonları ekle
    ├─ SSL sertifikası + subdomain kur
    ├─ Temel güvenlik kontrolleri
    └─ Pilot kullanıcılarla test

Hafta 3-4: Faz 2 — Güvenlik Sertleştirme
    ├─ RLS politikalarını güçlendir
    ├─ API Gateway / Edge Functions ekle
    ├─ JWT session yönetimine geç
    └─ Penetration test

Ay 2-3: Faz 3 — Derin Entegrasyon
    ├─ SSO entegrasyonu
    ├─ Paylaşılan header/navigation
    ├─ Push notification entegrasyonu
    ├─ Veri senkronizasyonu otomasyonu
    └─ Tam kullanıcı deneyimi birleştirme
```

**Kısa cevap:** Evet, yapılabilir. En güvenli ve pratik yol, **Deep Link + Token ile başlayıp** aşamalı olarak **API katmanı ve SSO'ya geçmektir**. iframe yaklaşımından kaçınılmalıdır — güvenlik ve performans riskleri çözülmesi zor sorunlara yol açar.
