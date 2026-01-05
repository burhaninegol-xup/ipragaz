"""
Task Runner - Basitleştirilmiş Akış
Soru → Analiz → Tartışma → Geliştirme → Test → Sonuç

Agent'lar proje baglamini (dosya yapisi, DB semasi, mevcut kodlar) bilerek calisir.
"""

import os
import sys
import json
from datetime import datetime
from typing import Generator, Dict, Any, Optional
from pathlib import Path

# dotenv yükle
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

# Parent path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents import Agent, get_agent, get_all_agents, TEAM_MEMBERS
from llm_engine import get_llm_engine
from project_context import (
    get_project_context,
    detect_target_files,
    get_related_files_content,
    get_service_details
)
from validation import validate_code, ValidationResult


class TaskRunner:
    """Tek bir task'ı işleyen basit runner - proje baglamiyla"""

    def __init__(self):
        self.llm = get_llm_engine()
        self.messages = []
        self.task_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Proje baglamini yukle (cached)
        self.project_context = get_project_context()
    
    def run_task(self, user_question: str, additional_context: str = "") -> Generator[Dict[str, Any], None, None]:
        """
        Task'ı çalıştır ve her adımı yield et (streaming için)
        Proje baglami otomatik olarak enjekte edilir.
        Agent'lar güncellenecek dosyaların MEVCUT içeriklerini görür.
        """

        # Tam proje baglami: otomatik + kullanicidan gelen ek bilgi
        full_context = self.project_context
        if additional_context:
            full_context += f"\n\n## EK BILGI (Kullanicidan)\n{additional_context}"

        # === HEDEF DOSYA TESPITI VE ICERIK CEKME ===
        # Kullanici talebinden guncellenecek dosyalari tahmin et
        target_files = detect_target_files(user_question)

        # Hedef dosyalarin mevcut iceriklerini al
        target_files_content = ""
        if target_files:
            target_files_content = get_related_files_content(user_question)

        # Ilgili servislerin detaylarini al
        service_details = ""
        service_keywords = ["service", "servis", "customer", "musteri", "order", "siparis",
                          "dealer", "bayi", "report", "rapor", "product", "urun"]
        for keyword in service_keywords:
            if keyword in user_question.lower():
                # keyword'e gore servis adini tahmin et
                service_map = {
                    "customer": "CustomersService", "musteri": "CustomersService",
                    "order": "OrdersService", "siparis": "OrdersService",
                    "dealer": "DealersService", "bayi": "DealersService",
                    "report": "ReportsService", "rapor": "ReportsService",
                    "product": "ProductsService", "urun": "ProductsService",
                }
                for kw, svc_name in service_map.items():
                    if kw in user_question.lower():
                        details = get_service_details(svc_name)
                        if details:
                            methods_str = "\n".join([f"  - {m['signature']}" for m in details['methods'][:10]])
                            service_details += f"\n### {svc_name} ({details['file_path']})\nMetodlar:\n{methods_str}\n"
                        break

        if service_details:
            full_context += f"\n\n## KULLANILABILIR SERVIS METODLARI\n{service_details}"

        if target_files_content:
            full_context += f"\n\n{target_files_content}"

        # Başlangıç
        yield {
            "type": "start",
            "task_id": self.task_id,
            "question": user_question,
            "timestamp": datetime.now().isoformat()
        }

        # ===== ADIM 1: ANALİZ (Product Owner) =====
        yield {"type": "phase", "phase": "analysis", "status": "started", "title": "📋 Analiz"}

        po = get_agent("po")
        yield {"type": "agent_start", "agent": po.name, "emoji": po.emoji, "title": po.title, "phase": "analysis"}

        analysis = self.llm.generate_response(
            agent=po,
            user_prompt=f"""Aşağıdaki talebi analiz et ve kısa özetle:

TALEP: {user_question}

{full_context}

ONEMLI: Yukaridaki proje baglamini (mevcut sayfalar, servisler, veritabani) dikkate alarak analiz yap.
Mevcut yapiyla uyumlu bir cozum onermelisin.

Şunları belirt:
1. Ne isteniyor? (1-2 cümle)
2. Hangi mevcut dosyalar/servisler etkilenecek?
3. Kabul kriterleri (3-5 madde)
4. Öncelik ve karmaşıklık tahmini
""",
            temperature=0.7
        )
        
        self._add_message(po, "analysis", analysis)
        yield {"type": "agent_response", "agent": po.name, "emoji": po.emoji, "content": analysis, "phase": "analysis"}
        yield {"type": "phase", "phase": "analysis", "status": "completed"}
        
        # ===== ADIM 2: TEKNİK TARTIŞMA =====
        yield {"type": "phase", "phase": "discussion", "status": "started", "title": "💬 Teknik Tartışma"}
        
        tech_lead = get_agent("tech_lead")
        senior_dev = get_agent("senior_dev")
        frontend_dev = get_agent("frontend_dev")
        qa = get_agent("qa")
        
        # Tech Lead görüşü
        yield {"type": "agent_start", "agent": tech_lead.name, "emoji": tech_lead.emoji, "title": tech_lead.title, "phase": "discussion"}

        tech_opinion = self.llm.generate_response(
            agent=tech_lead,
            user_prompt=f"""PO'nun analizi:
{analysis}

PROJE BAGLAMI:
{full_context}

Teknik perspektiften değerlendir (MEVCUT YAPIYI DIKKATE AL):
1. Hangi mevcut servisler/dosyalar kullanilmali veya degistirilmeli?
2. Mevcut kod pattern'larina uygun nasil implement edilmeli?
3. Dikkat edilmesi gereken teknik riskler?

Kısa ve öz ol. Somut dosya/servis adlari ver.""",
            temperature=0.7
        )
        
        self._add_message(tech_lead, "discussion", tech_opinion)
        yield {"type": "agent_response", "agent": tech_lead.name, "emoji": tech_lead.emoji, "content": tech_opinion, "phase": "discussion"}
        
        # Senior Dev görüşü
        yield {"type": "agent_start", "agent": senior_dev.name, "emoji": senior_dev.emoji, "title": senior_dev.title, "phase": "discussion"}

        dev_opinion = self.llm.generate_response(
            agent=senior_dev,
            user_prompt=f"""Talep: {user_question}

Tech Lead görüşü:
{tech_opinion}

PROJE BAGLAMI (Mevcut Servisler ve Metodlar):
{full_context}

Implementation perspektifinden (MEVCUT SERVISLERI KULLAN):
1. Hangi mevcut servis metodlari kullanilacak? (ornegin OrdersService.getByCustomerId)
2. Yeni metod gerekiyor mu, yoksa mevcut metodlar yeterli mi?
3. Error handling ve edge case'ler?

Kısa ve öz ol. Mevcut servis adlarini ve metodlarini referans ver.""",
            temperature=0.7
        )
        
        self._add_message(senior_dev, "discussion", dev_opinion)
        yield {"type": "agent_response", "agent": senior_dev.name, "emoji": senior_dev.emoji, "content": dev_opinion, "phase": "discussion"}
        
        # Frontend Dev görüşü
        yield {"type": "agent_start", "agent": frontend_dev.name, "emoji": frontend_dev.emoji, "title": frontend_dev.title, "phase": "discussion"}

        frontend_opinion = self.llm.generate_response(
            agent=frontend_dev,
            user_prompt=f"""Talep: {user_question}

PROJE BAGLAMI (Mevcut Sayfalar):
{full_context}

UI/UX perspektifinden (MEVCUT SAYFALARI DIKKATE AL):
1. Hangi mevcut sayfa etkilenecek? (ornegin backoffice-raporlar.html)
2. Mevcut UI pattern'larina uygun tasarim nasil olmali?
3. Responsive/erişilebilirlik notları?

Kısa ve öz ol. Mevcut sayfa adlarini referans ver.""",
            temperature=0.7
        )
        
        self._add_message(frontend_dev, "discussion", frontend_opinion)
        yield {"type": "agent_response", "agent": frontend_dev.name, "emoji": frontend_dev.emoji, "content": frontend_opinion, "phase": "discussion"}
        
        # QA erken görüşü
        yield {"type": "agent_start", "agent": qa.name, "emoji": qa.emoji, "title": qa.title, "phase": "discussion"}
        
        qa_early = self.llm.generate_response(
            agent=qa,
            user_prompt=f"""Talep: {user_question}

Test perspektifinden erken uyarılar:
1. Test edilmesi zor olabilecek noktalar?
2. Edge case'ler akla gelenler?
3. Kabul kriterlerini nasıl test ederiz?

Kısa ve öz ol.""",
            temperature=0.7
        )
        
        self._add_message(qa, "discussion", qa_early)
        yield {"type": "agent_response", "agent": qa.name, "emoji": qa.emoji, "content": qa_early, "phase": "discussion"}
        
        yield {"type": "phase", "phase": "discussion", "status": "completed"}
        
        # ===== ADIM 3: GELİŞTİRME =====
        yield {"type": "phase", "phase": "development", "status": "started", "title": "💻 Geliştirme"}
        
        # Tartışma özeti
        discussion_summary = f"""
Analiz: {analysis[:500]}
Tech Lead: {tech_opinion[:300]}
Senior Dev: {dev_opinion[:300]}
Frontend: {frontend_opinion[:300]}
QA: {qa_early[:200]}
"""

        # Backend/Logic kodu
        yield {"type": "agent_start", "agent": senior_dev.name, "emoji": senior_dev.emoji, "title": senior_dev.title, "phase": "development"}

        backend_code = self.llm.generate_response(
            agent=senior_dev,
            user_prompt=f"""Tartışma sonucuna göre backend/logic kodunu yaz:

{discussion_summary}

PROJE BAGLAMI:
{full_context}

ONEMLI KURALLAR:
- Proje: Vanilla JS + Supabase (framework yok!)
- Mevcut servisleri kullan: window.XxxService formatinda
- Error handling: try/catch + {{data, error}} pattern
- Supabase client: window.supabaseClient

## KOD YAZMA FORMATLARI

### FORMAT 1: YENİ DOSYA OLUSTURMA (FILE:)
Yeni servis veya dosya olusturuyorsan:
```javascript
// FILE: js/services/xxx-service.js
const XxxService = {{
    async methodName() {{
        // tam implementasyon
    }}
}};
window.XxxService = XxxService;
```

### FORMAT 2: MEVCUT DOSYAYI DUZENLEME (EDIT:) - TERCIH EDILEN!
Mevcut bir dosyada sadece bir fonksiyonu degistirmek istiyorsan:
```javascript
// EDIT: js/services/reports-service.js
// FIND:
async getOrderStats() {{
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // eski kod
}}
// REPLACE:
async getOrderStats() {{
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // yeni kod
}}
// END_EDIT
```

### EDIT FORMATI KURALLARI:
- FIND kisminda degistirilecek kodun MEVCUT HALI olmali (dosyadaki ile AYNI)
- REPLACE kisminda YENI kod olmali
- Birden fazla EDIT blogu kullanabilirsin
- FIND bulunamazsa degisiklik UYGULANMAZ (guvenli)

### NE ZAMAN HANGISINI KULLAN:
- Kucuk degisiklik (1-2 fonksiyon) → EDIT formatini kullan
- Yeni dosya veya buyuk degisiklik → FILE formatini kullan

Açıklama kısa olsun, kod üzerine odaklan.""",
            temperature=0.5
        )
        
        self._add_message(senior_dev, "development", backend_code)
        yield {"type": "agent_response", "agent": senior_dev.name, "emoji": senior_dev.emoji, "content": backend_code, "phase": "development"}

        # Backend kodunu dosyalara kaydet
        backend_files = self._save_generated_code(backend_code, senior_dev.name)
        if backend_files:
            files_info = "\n".join([f"- {'✨ YENİ' if f['is_new'] else '📝 GÜNCELLEME'}: `{f['path']}`" for f in backend_files])
            yield {"type": "files_saved", "files": backend_files, "agent": senior_dev.name}
            yield {"type": "agent_response", "agent": senior_dev.name, "emoji": senior_dev.emoji,
                   "content": f"## Dosyalar Kaydedildi\n{files_info}", "phase": "development"}

        # Frontend kodu
        yield {"type": "agent_start", "agent": frontend_dev.name, "emoji": frontend_dev.emoji, "title": frontend_dev.title, "phase": "development"}

        frontend_code = self.llm.generate_response(
            agent=frontend_dev,
            user_prompt=f"""Tartışma sonucuna göre frontend kodunu yaz:

{discussion_summary}

Backend kodu:
{backend_code[:1000]}

PROJE BAGLAMI:
{full_context}

KRITIK KURALLAR - MUTLAKA UY!

## CSS KURALLARI:
- HARICI CSS DOSYASI KULLANMA! css/components/ klasoru YOKTUR!
- CSS'i <style> tag'i icinde INLINE yaz (HTML icerisinde)
- CSS degiskenleri :root icinde tanimla (--bo-primary, --bo-sidebar-bg, vb.)
- Backoffice icin sinif prefix'i: bo-* (ornek: bo-main-content, bo-card)
- Bayi icin sinif prefix'i: bayi-*
- Google Fonts Poppins kullan

## JS KURALLARI:
- js/pages/ klasoru YOKTUR! Bu klasore dosya OLUSTURMA!
- Servis dosyalari: js/services/[isim]-service.js (kebab-case, kucuk harf)
- Ornek: dealers-service.js, customers-service.js (DealersService.js DEGIL!)
- Supabase client: js/supabase-client.js (js/supabase.js DEGIL!)
- Sayfa JS'ini inline <script> tag'i icinde yaz

## GENEL:
- Proje: Vanilla HTML/CSS/JS (React/Vue yok!)
- Mobile-first responsive tasarim
- Component loader kullanimi: loadComponent() ile HTML parcalari

## KOD YAZMA FORMATLARI

### FORMAT 1: YENİ HTML DOSYASI (FILE:)
Yeni sayfa olusturuyorsan TAMAMINI yaz:
```html
<!-- FILE: backoffice-raporlar.html -->
<!DOCTYPE html>
<html lang="tr">
<head>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>/* CSS */</style>
</head>
<body>
    <!-- HTML -->
    <script src="js/supabase-client.js"></script>
    <script>// JS</script>
</body>
</html>
```

### FORMAT 2: MEVCUT HTML'DE KISMI DEGISIKLIK (EDIT:) - TERCIH EDILEN!
Mevcut bir HTML'de sadece bir bolumu degistirmek istiyorsan:
```html
<!-- EDIT: backoffice-raporlar.html -->
<!-- FIND -->
<div class="stats-card">
    <h3>Eski Baslik</h3>
</div>
<!-- REPLACE -->
<div class="stats-card">
    <h3>Yeni Baslik</h3>
    <p>Yeni icerik</p>
</div>
<!-- END_EDIT -->
```

### FORMAT 3: JS SERVISI DUZENLEME (EDIT:)
Mevcut serviste bir fonksiyonu degistirmek icin:
```javascript
// EDIT: js/services/reports-service.js
// FIND:
async getOrderStats() {{
    // eski kod
}}
// REPLACE:
async getOrderStats() {{
    // yeni kod
}}
// END_EDIT
```

### EDIT FORMATI KURALLARI:
- FIND kisminda degistirilecek kodun MEVCUT HALI olmali (dosyadaki ile AYNI)
- REPLACE kisminda YENI kod olmali
- Birden fazla EDIT blogu kullanabilirsin
- FIND bulunamazsa degisiklik UYGULANMAZ (guvenli)

### NE ZAMAN HANGISINI KULLAN:
- Kucuk HTML/JS degisikligi (1-2 bolum) → EDIT formatini kullan
- Yeni sayfa veya buyuk degisiklik → FILE formatini kullan (tam HTML yaz)

### KRITIK HATIRLATMALAR:
- Supabase CDN: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
- Supabase CDN'den SONRA supabase-client.js'i yukle""",
            temperature=0.5
        )
        
        self._add_message(frontend_dev, "development", frontend_code)
        yield {"type": "agent_response", "agent": frontend_dev.name, "emoji": frontend_dev.emoji, "content": frontend_code, "phase": "development"}

        # Frontend kodunu dosyalara kaydet
        frontend_files = self._save_generated_code(frontend_code, frontend_dev.name)
        if frontend_files:
            files_info = "\n".join([f"- {'✨ YENİ' if f['is_new'] else '📝 GÜNCELLEME'}: `{f['path']}`" for f in frontend_files])
            yield {"type": "files_saved", "files": frontend_files, "agent": frontend_dev.name}
            yield {"type": "agent_response", "agent": frontend_dev.name, "emoji": frontend_dev.emoji,
                   "content": f"## Dosyalar Kaydedildi\n{files_info}", "phase": "development"}

        yield {"type": "phase", "phase": "development", "status": "completed"}
        
        # ===== ADIM 4: TEST DOSYASI URETIMI =====
        yield {"type": "phase", "phase": "testing", "status": "started", "title": "🧪 Test"}

        yield {"type": "agent_start", "agent": qa.name, "emoji": qa.emoji, "title": qa.title, "phase": "testing"}

        # QA'den Vitest test dosyasi iste
        test_file_content = self.llm.generate_response(
            agent=qa,
            user_prompt=f"""Uretilen kod icin CALISIR Vitest test dosyasi yaz.

# PROJE YAPISI - ONEMLI!
Bu proje vanilla JavaScript kullanir. Servisler window global objelerine baglidir:
- window.supabaseClient
- window.ProductsService, window.CustomersService, vb.
- document.getElementById, querySelector, vb.

KAYNAK KODU IMPORT ETME! Export yok. Sadece mock'lar uzerinden test et.

# KRITIK - SADECE JAVASCRIPT!
- Test dosyasi SADECE JavaScript kodu icermeli
- Markdown yorum YAZMA (aciklama metni, "Kodu inceledim" gibi)
- Code fence (```) KULLANMA
- Dosya DIREKT `import {{ describe...` ile baslamali
- Turkce aciklama metni EKLEME
- SADECE gecerli JavaScript syntax'i kullan

# TEST EDILECEK KOD

### Kabul Kriterleri:
{analysis[:500]}

### Backend Kodu:
{backend_code[:2000]}

# VITEST TEST DOSYASI KURALLARI

1. DOSYA ADI: Ilk satirda comment olarak belirt:
   // FILE: tests/[servis-adi].test.js

2. IMPORT: Sadece vitest'ten import yap:
   import {{ describe, it, expect, vi, beforeEach }} from 'vitest'

3. MOCK PATTERN - Supabase chain mock:
```javascript
const mockSupabaseClient = {{
  from: vi.fn(() => ({{
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({{ data: null, error: null }}),
    maybeSingle: vi.fn().mockResolvedValue({{ data: null, error: null }})
  }}))
}}
global.supabaseClient = mockSupabaseClient
```

4. TEST YAPISI:
```javascript
// FILE: tests/example.test.js
import {{ describe, it, expect, vi, beforeEach }} from 'vitest'

describe('ServisAdi', () => {{
  let mockSupabaseClient

  beforeEach(() => {{
    vi.clearAllMocks()

    // Her test icin yeni mock
    mockSupabaseClient = {{
      from: vi.fn(() => ({{
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({{ data: [], error: null }})
      }}))
    }}
    global.supabaseClient = mockSupabaseClient
  }})

  describe('getAll', () => {{
    it('basarili durumda veri donmeli', async () => {{
      // Arrange - Mock'u ayarla
      mockSupabaseClient.from.mockReturnValue({{
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({{
          data: [{{ id: 1, name: 'Test' }}],
          error: null
        }})
      }})

      // Act - Fonksiyonu cagir
      const result = await supabaseClient.from('table')
        .select('*')
        .eq('is_active', true)
        .order('name')

      // Assert - Sonucu kontrol et
      expect(result.data).toHaveLength(1)
      expect(result.error).toBeNull()
    }})

    it('hata durumunda error donmeli', async () => {{
      mockSupabaseClient.from.mockReturnValue({{
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({{
          data: null,
          error: {{ message: 'Database error' }}
        }})
      }})

      const result = await supabaseClient.from('table')
        .select('*')
        .eq('is_active', true)
        .order('name')

      expect(result.error).toBeTruthy()
    }})

    it('bos liste donebilmeli', async () => {{
      mockSupabaseClient.from.mockReturnValue({{
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({{ data: [], error: null }})
      }})

      const result = await supabaseClient.from('table')
        .select('*')
        .eq('is_active', true)
        .order('name')

      expect(result.data).toEqual([])
    }})
  }})
}})
```

5. HER METOD ICIN 3 TEST:
   - Basarili senaryo (data doner)
   - Hata senaryosu (error doner)
   - Edge case (bos liste, null, vb.)

6. ONEMLI:
   - Kaynak kodu IMPORT ETME (export yok)
   - Sadece mock'lar uzerinden test et
   - async/await kullan
   - vi.clearAllMocks() her beforeEach'de cagir

Simdi yukaridaki kurallara UYGUN, `npm test` ile CALISACAK test dosyasi yaz:""",
            temperature=0.3
        )

        self._add_message(qa, "testing", test_file_content)
        yield {"type": "agent_response", "agent": qa.name, "emoji": qa.emoji, "content": test_file_content, "phase": "testing"}

        # Test dosyasini kaydet
        test_file_path = self._save_test_file(test_file_content)

        # Calistirma talimatlari
        if test_file_path:
            instructions = f"""
## Test Dosyasi Olusturuldu

**Dosya:** `{test_file_path}`

### Testleri Calistirmak Icin:

```bash
# Ilk kurulum (bir kere)
npm install

# Testleri calistir
npm test

# Watch modunda
npm run test:watch
```
"""
            yield {"type": "agent_response", "agent": qa.name, "emoji": qa.emoji, "content": instructions, "phase": "testing"}
            yield {"type": "test_file_created", "path": test_file_path}

        yield {"type": "phase", "phase": "testing", "status": "completed"}
        
        # ===== ADIM 5: SONUÇ =====
        yield {"type": "phase", "phase": "summary", "status": "started", "title": "📊 Sonuç"}
        
        yield {"type": "agent_start", "agent": po.name, "emoji": po.emoji, "title": po.title, "phase": "summary"}
        
        # Kaydedilen dosyalar bilgisi
        all_saved_files = backend_files + frontend_files
        if all_saved_files:
            saved_files_info = "\n".join([f"- {f['path']} ({'yeni' if f['is_new'] else 'güncellendi'})" for f in all_saved_files])
        else:
            saved_files_info = "Dosya kaydedilmedi (FILE: formatı bulunamadı)"

        test_info = f"Test dosyası: {test_file_path}" if test_file_path else "Test dosyası oluşturulamadı"

        final_summary = self.llm.generate_response(
            agent=po,
            user_prompt=f"""Sprint özeti hazırla:

Orijinal Talep: {user_question}

Kaydedilen Dosyalar:
{saved_files_info}

Test Durumu:
{test_info}

Kısa özet yaz:
1. Ne yapıldı?
2. Hangi dosyalar oluşturuldu/güncellendi?
3. Test dosyası oluşturuldu mu?
4. Sonraki adımlar""",
            temperature=0.7
        )
        
        self._add_message(po, "summary", final_summary)
        yield {"type": "agent_response", "agent": po.name, "emoji": po.emoji, "content": final_summary, "phase": "summary"}
        
        yield {"type": "phase", "phase": "summary", "status": "completed"}
        
        # ===== BİTİŞ =====
        stats = self.llm.get_usage_stats()
        yield {
            "type": "complete",
            "task_id": self.task_id,
            "stats": stats,
            "message_count": len(self.messages),
            "timestamp": datetime.now().isoformat()
        }
    
    def _apply_edits(self, code_content: str, agent_name: str) -> list:
        """
        EDIT formatındaki değişiklikleri mevcut dosyalara uygula.
        Agent'ların kısmi değişiklik yapmasını sağlar (benim Edit tool'um gibi).

        Format (JS/CSS):
        ```javascript
        // EDIT: js/services/reports-service.js
        // FIND:
        async getOrderStats() {
            // eski kod
        }
        // REPLACE:
        async getOrderStats() {
            // yeni kod
        }
        // END_EDIT
        ```

        Format (HTML):
        ```html
        <!-- EDIT: backoffice-raporlar.html -->
        <!-- FIND -->
        <div>eski</div>
        <!-- REPLACE -->
        <div>yeni</div>
        <!-- END_EDIT -->
        ```

        Returns: [{'path': str, 'success': bool, 'error': str, 'agent': str}, ...]
        """
        import re
        from difflib import SequenceMatcher

        results = []
        project_root = Path(__file__).parent.parent.parent

        # EDIT bloklarını bul - JS/CSS formatı
        js_edit_pattern = r'```(?:javascript|js|typescript|ts|css)\n// EDIT:\s*([^\n]+)\n// FIND:\n([\s\S]*?)\n// REPLACE:\n([\s\S]*?)\n// END_EDIT\n```'

        # EDIT bloklarını bul - HTML formatı
        html_edit_pattern = r'```(?:html)\n<!-- EDIT:\s*([^\n]+)\s*-->\n<!-- FIND -->\n([\s\S]*?)\n<!-- REPLACE -->\n([\s\S]*?)\n<!-- END_EDIT -->\n```'

        all_patterns = [
            (js_edit_pattern, 'js'),
            (html_edit_pattern, 'html'),
        ]

        for pattern, edit_type in all_patterns:
            matches = re.findall(pattern, code_content)

            for file_path, find_text, replace_text in matches:
                file_path = file_path.strip()
                find_text = find_text.strip()
                replace_text = replace_text.strip()

                result = {
                    'path': file_path,
                    'success': False,
                    'error': None,
                    'agent': agent_name,
                    'type': 'edit',
                    'is_new': False
                }

                # Güvenlik: Path traversal engelle
                if '..' in file_path or file_path.startswith('/'):
                    result['error'] = 'Geçersiz dosya yolu (güvenlik)'
                    results.append(result)
                    continue

                # Güvenlik: Sadece izin verilen dizinlere yaz
                allowed_dirs = ['js/', 'css/', 'pages/', 'components/', 'assets/']
                is_root_html = file_path.endswith('.html') and '/' not in file_path

                if not is_root_html and not any(file_path.startswith(d) for d in allowed_dirs):
                    result['error'] = f'İzin verilmeyen dizin: {file_path}'
                    results.append(result)
                    continue

                full_path = project_root / file_path

                # Dosya var mı kontrol et
                if not full_path.exists():
                    result['error'] = f'Dosya bulunamadı: {file_path}'
                    results.append(result)
                    continue

                try:
                    # Dosyayı oku
                    original_content = full_path.read_text(encoding='utf-8')

                    # FIND metnini dosyada ara
                    if find_text in original_content:
                        # Tam eşleşme bulundu
                        new_content = original_content.replace(find_text, replace_text, 1)
                    else:
                        # Fuzzy matching dene (whitespace farklılıkları için)
                        # Normalize edilmiş versiyonları karşılaştır
                        normalized_find = ' '.join(find_text.split())
                        normalized_content = original_content

                        # Satır satır ara
                        found = False
                        lines = original_content.split('\n')
                        find_lines = find_text.split('\n')

                        for i in range(len(lines) - len(find_lines) + 1):
                            chunk = '\n'.join(lines[i:i + len(find_lines)])
                            # Benzerlik skoru hesapla
                            similarity = SequenceMatcher(None, chunk.strip(), find_text.strip()).ratio()

                            if similarity > 0.85:  # %85 benzerlik yeterli
                                # Eşleşme bulundu, değiştir
                                new_lines = lines[:i] + replace_text.split('\n') + lines[i + len(find_lines):]
                                new_content = '\n'.join(new_lines)
                                found = True
                                print(f"[EDIT] Fuzzy match bulundu ({similarity:.0%}): {file_path}")
                                break

                        if not found:
                            result['error'] = f'FIND metni dosyada bulunamadı (fuzzy match de başarısız)'
                            results.append(result)
                            continue

                    # Yedek al
                    backup_path = full_path.with_suffix(full_path.suffix + '.bak')
                    try:
                        backup_path.write_text(original_content, encoding='utf-8')
                    except Exception:
                        pass  # Yedekleme başarısız olsa bile devam et

                    # Dosyayı güncelle
                    full_path.write_text(new_content, encoding='utf-8')

                    result['success'] = True
                    result['full_path'] = str(full_path)
                    print(f"[EDIT] Başarılı: {file_path}")

                except Exception as e:
                    result['error'] = f'Dosya işleme hatası: {str(e)}'

                results.append(result)

        return results

    def _save_generated_code(self, code_content: str, agent_name: str) -> list:
        """
        Üretilen koddan dosyaları çıkar ve kaydet.
        Önce EDIT formatını, sonra FILE formatını işler.
        Returns: [{'path': str, 'full_path': str, 'is_new': bool, 'agent': str}, ...]
        """
        import re

        saved_files = []

        # === ÖNCE EDIT FORMATINI İŞLE ===
        edit_results = self._apply_edits(code_content, agent_name)
        for result in edit_results:
            if result['success']:
                saved_files.append(result)
            else:
                print(f"[EDIT HATASI] {result['path']}: {result['error']}")

        # === SONRA FILE FORMATINI İŞLE ===
        project_root = Path(__file__).parent.parent.parent

        # Kod bloklarını bul: ```lang\n// FILE: path\n...```
        # HTML: <!-- FILE: path -->
        # CSS: /* FILE: path */
        # JS: // FILE: path

        patterns = [
            # JavaScript/TypeScript
            (r'```(?:javascript|js|typescript|ts)\n// FILE: ([^\n]+)\n([\s\S]*?)```', 'js'),
            # HTML
            (r'```(?:html)\n<!-- FILE: ([^\n]+) -->\n([\s\S]*?)```', 'html'),
            # CSS
            (r'```(?:css)\n/\* FILE: ([^\n]+) \*/\n([\s\S]*?)```', 'css'),
        ]

        for pattern, file_type in patterns:
            matches = re.findall(pattern, code_content)
            for file_path, code in matches:
                file_path = file_path.strip()
                code = code.strip()

                # Güvenlik: Path traversal engelle
                if '..' in file_path or file_path.startswith('/'):
                    continue

                # Güvenlik: Sadece izin verilen dizinlere veya root HTML dosyalarına yaz
                allowed_dirs = ['js/', 'css/', 'pages/', 'components/', 'assets/']
                is_root_html = file_path.endswith('.html') and '/' not in file_path

                if not is_root_html and not any(file_path.startswith(d) for d in allowed_dirs):
                    continue

                # === PARTIAL KOD KONTROLU ===
                # Talimat iceren kodu kaydetme
                partial_indicators = [
                    'dosyanın sonuna ekle',
                    'mevcut kodu koru',
                    'yukarıdaki koda ekle',
                    'aşağıdaki kodu ekle',
                    '// ekle:',
                    '// EKLE:',
                    '... mevcut kod ...',
                    '// ... existing code',
                ]
                is_partial = any(ind.lower() in code.lower() for ind in partial_indicators)
                if is_partial:
                    print(f"[UYARI] Partial kod tespit edildi, kaydedilmiyor: {file_path}")
                    continue

                # JS servisleri icin: cok kisa ise kaydetme
                if file_type == 'js' and 'service' in file_path.lower():
                    line_count = len(code.split('\n'))
                    if line_count < 15:
                        print(f"[UYARI] Servis dosyasi cok kisa ({line_count} satir), kaydedilmiyor: {file_path}")
                        continue
                    # Class tanımı kontrolu
                    if 'const ' not in code and 'class ' not in code:
                        print(f"[UYARI] Servis dosyasinda class/const tanimi yok, kaydedilmiyor: {file_path}")
                        continue

                # HTML dosyalari icin: DOCTYPE veya html tag yoksa kaydetme
                if file_type == 'html':
                    if '<!DOCTYPE' not in code and '<html' not in code:
                        print(f"[UYARI] HTML dosyasinda DOCTYPE/html yok, kaydedilmiyor: {file_path}")
                        continue

                full_path = project_root / file_path

                # Dizin yoksa oluştur
                full_path.parent.mkdir(parents=True, exist_ok=True)

                # Dosya var mı kontrol et
                is_new = not full_path.exists()

                # Yedek al (mevcut dosya ise)
                if not is_new:
                    backup_path = full_path.with_suffix(full_path.suffix + '.bak')
                    try:
                        backup_path.write_text(full_path.read_text(encoding='utf-8'), encoding='utf-8')
                    except Exception:
                        pass  # Yedekleme başarısız olsa bile devam et

                # Dosyaya yaz
                full_path.write_text(code, encoding='utf-8')

                saved_files.append({
                    'path': file_path,
                    'full_path': str(full_path),
                    'is_new': is_new,
                    'agent': agent_name,
                    'type': file_type
                })

        return saved_files

    def _save_test_file(self, test_content: str) -> Optional[str]:
        """Test dosyasını tests/ klasörüne kaydet"""
        import re

        # Dosya adını birden fazla pattern ile ara
        filename = None
        patterns = [
            r'//\s*FILE:\s*tests/([\w-]+\.test\.js)',  # // FILE: tests/xxx.test.js
            r'//\s*FILE:\s*([\w-]+\.test\.js)',         # // FILE: xxx.test.js
            r'tests/([\w-]+\.test\.js)',                # tests/xxx.test.js
        ]

        for pattern in patterns:
            match = re.search(pattern, test_content)
            if match:
                filename = match.group(1)
                break

        if not filename:
            # Varsayılan dosya adı
            filename = f"feature_{self.task_id}.test.js"

        # tests/ klasörünü oluştur (proje kök dizininde)
        tests_dir = Path(__file__).parent.parent.parent / "tests"
        tests_dir.mkdir(exist_ok=True)

        # Kod bloğunu çıkar (```javascript veya ```js içinden)
        code_match = re.search(r'```(?:javascript|js)?\n([\s\S]*?)```', test_content)
        if code_match:
            test_code = code_match.group(1).strip()
        else:
            # Kod bloğu yoksa tüm içeriği kullan
            test_code = test_content.strip()

        # İlk satırda // FILE: varsa kaldır (dosya içinde gereksiz)
        test_code = re.sub(r'^//\s*FILE:.*\n?', '', test_code).strip()

        # Dosyaya yaz
        test_file_path = tests_dir / filename
        test_file_path.write_text(test_code, encoding='utf-8')

        return str(test_file_path)

    def _run_tests(self, test_file_path: str) -> Dict[str, Any]:
        """
        Testleri gercekten calistir ve sonuclari dondur
        """
        import subprocess

        result = {
            "success": False,
            "output": "",
            "error": "",
            "passed": 0,
            "failed": 0
        }

        try:
            # npm test calistir
            proc = subprocess.run(
                ['npm', 'test', '--', test_file_path, '--reporter=verbose'],
                capture_output=True,
                text=True,
                timeout=60,
                cwd=str(Path(__file__).parent.parent.parent)  # proje root
            )

            result["output"] = proc.stdout
            result["error"] = proc.stderr
            result["success"] = proc.returncode == 0

            # Test sayilarini parse et (Vitest output'undan)
            import re
            passed_match = re.search(r'(\d+)\s+passed', proc.stdout)
            failed_match = re.search(r'(\d+)\s+failed', proc.stdout)

            if passed_match:
                result["passed"] = int(passed_match.group(1))
            if failed_match:
                result["failed"] = int(failed_match.group(1))

        except subprocess.TimeoutExpired:
            result["error"] = "Test zaman asimina ugradi (60s)"
        except FileNotFoundError:
            result["error"] = "npm bulunamadi - testler calistirilamadi"
        except Exception as e:
            result["error"] = f"Test calistirma hatasi: {str(e)}"

        return result

    def _validate_and_save_code(self, code: str, file_type: str, file_path: str, agent_name: str) -> Dict[str, Any]:
        """
        Kodu dogrula ve kaydet. Hata varsa kaydetme.
        """
        # Validation yap
        validation_result = validate_code(code, file_type, file_path)

        result = {
            "path": file_path,
            "is_valid": validation_result.is_valid,
            "errors": validation_result.errors,
            "warnings": validation_result.warnings,
            "saved": False
        }

        # Kritik hata yoksa kaydet (uyarilar kabul edilebilir)
        if validation_result.is_valid:
            project_root = Path(__file__).parent.parent.parent
            full_path = project_root / file_path

            # Dizin yoksa olustur
            full_path.parent.mkdir(parents=True, exist_ok=True)

            # Yedek al (mevcut dosya ise)
            is_new = not full_path.exists()
            if not is_new:
                backup_path = full_path.with_suffix(full_path.suffix + '.bak')
                try:
                    backup_path.write_text(full_path.read_text(encoding='utf-8'), encoding='utf-8')
                except Exception:
                    pass

            # Dosyaya yaz
            full_path.write_text(code, encoding='utf-8')
            result["saved"] = True
            result["is_new"] = is_new
            result["full_path"] = str(full_path)
            result["agent"] = agent_name

        return result

    def _add_message(self, agent: Agent, phase: str, content: str):
        """Mesaj kaydet"""
        self.messages.append({
            "agent_id": agent.id,
            "agent_name": agent.name,
            "agent_emoji": agent.emoji,
            "phase": phase,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
    
    def get_all_messages(self) -> list:
        """Tüm mesajları getir"""
        return self.messages
    
    def save_log(self, output_dir: str = "logs"):
        """Log'u dosyaya kaydet"""
        log_dir = Path(output_dir) / f"task_{self.task_id}"
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # JSON log
        with open(log_dir / "messages.json", "w", encoding="utf-8") as f:
            json.dump(self.messages, f, indent=2, ensure_ascii=False)
        
        # Markdown log
        md_content = f"# Task Log - {self.task_id}\n\n"
        current_phase = ""
        
        for msg in self.messages:
            if msg["phase"] != current_phase:
                current_phase = msg["phase"]
                md_content += f"\n## {current_phase.upper()}\n\n"
            
            md_content += f"### {msg['agent_emoji']} {msg['agent_name']}\n"
            md_content += f"_{msg['timestamp']}_\n\n"
            md_content += f"{msg['content']}\n\n---\n\n"
        
        with open(log_dir / "log.md", "w", encoding="utf-8") as f:
            f.write(md_content)
        
        return log_dir


# Test için
if __name__ == "__main__":
    runner = TaskRunner()
    
    for event in runner.run_task("Müşteri listesine arama filtresi ekle"):
        print(f"[{event['type']}]", event.get('agent', ''), event.get('phase', ''))
        if event['type'] == 'agent_response':
            print(event['content'][:200], "...\n")
