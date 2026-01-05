"""
Scrum Orchestrator
Tüm workflow'u yöneten ana sistem
"""

from typing import List, Dict, Optional, Callable
from datetime import datetime
from enum import Enum

from config import config
from agents import Agent, get_agent, get_all_agents, TEAM_MEMBERS
from discussion import (
    DiscussionRoom, DiscussionThread, DiscussionPhase,
    MessageType, DISCUSSION_PROMPTS
)
from llm_engine import get_llm_engine, LLMEngine
from logger import TransparentLogger


class SprintPhase(Enum):
    """Sprint aşamaları (5 aşama)"""
    TASK_DETAYLAMA = "task_detaylama"
    TEKNIK_OLGUNLASTIRMA = "teknik_olgunlastirma"
    GELISTIRME = "gelistirme"
    TEST = "test"
    ONAY = "onay"


class ScrumOrchestrator:
    """Scrum sürecini orkestra eden ana sınıf"""
    
    def __init__(
        self, 
        project_name: Optional[str] = None,
        session_name: Optional[str] = None
    ):
        self.project_name = project_name or config.project_name
        self.llm = get_llm_engine()
        self.logger = TransparentLogger(session_name=session_name)
        self.discussion_room = DiscussionRoom()
        
        # Aktif sprint bilgileri
        self.current_phase: Optional[SprintPhase] = None
        self.current_task: Optional[str] = None
        self.task_outputs: Dict[str, str] = {}
        
        print(f"🚀 Scrum Orchestrator başlatıldı")
        print(f"📁 Log dizini: {self.logger.get_session_path()}")
    
    def run_sprint(self, user_request: str, project_context: Optional[str] = None) -> Dict:
        """Tam bir sprint döngüsü çalıştır (5 aşama)"""

        print("\n" + "="*60)
        print("🏃 SPRINT BAŞLIYOR")
        print("="*60)

        self.logger.log_phase_start(
            "Sprint Başlangıcı",
            f"**Kullanıcı Talebi:**\n{user_request}\n\n**Proje:** {self.project_name}"
        )

        results = {}

        try:
            # 1. Task Detaylama - PO + Tech Lead + Tester tartışır
            print("\n📋 AŞAMA 1: Task Detaylama")
            results["task"] = self._run_task_detaylama(user_request)

            # 2. Teknik Olgunlaştırma - Tech Lead + Developer + Tester tartışır
            print("\n📐 AŞAMA 2: Teknik Olgunlaştırma")
            results["technical_plan"] = self._run_teknik_olgunlastirma(
                results["task"],
                project_context
            )

            # 3. Geliştirme - Developer kodlar
            print("\n💻 AŞAMA 3: Geliştirme")
            results["implementation"] = self._run_gelistirme(
                results["technical_plan"],
                project_context
            )

            # 4. Test - Tester test eder
            print("\n🧪 AŞAMA 4: Test")
            results["test_results"] = self._run_test(
                results["task"],
                results["implementation"]
            )

            # 5. Onay - PO final onay verir
            print("\n✅ AŞAMA 5: Onay")
            results["approval"] = self._run_onay(
                results["task"],
                results["implementation"],
                results["test_results"]
            )

        except Exception as e:
            self.logger.log_error(str(e), "Sprint execution")
            raise

        finally:
            # Session'ı kapat ve istatistikleri kaydet
            stats = self.llm.get_usage_stats()
            self.logger.log_session_end(
                "Sprint tamamlandı" if results else "Sprint hata ile sonlandı",
                stats
            )

            print("\n" + "="*60)
            print("📊 SPRINT İSTATİSTİKLERİ")
            print("="*60)
            print(f"API Çağrıları: {stats['total_calls']}")
            print(f"Toplam Token: {stats['total_tokens']}")
            print(f"Tahmini Maliyet: ${stats['estimated_cost_usd']}")
            print(f"Log Dizini: {self.logger.get_session_path()}")

        return results
    
    def _run_task_detaylama(self, user_request: str) -> str:
        """Task Detaylama aşaması - PO + Tech Lead + Tester tartışır"""
        self.current_phase = SprintPhase.TASK_DETAYLAMA
        self.logger.log_phase_start("Task Detaylama", "Product Owner talebi TASK'a dönüştürüyor...")

        po = get_agent("po")
        tech_lead = get_agent("tech_lead")
        qa = get_agent("qa")

        # 1. PO ilk TASK taslağını oluşturur
        print(f"  → {po.emoji} {po.name} TASK oluşturuyor...")

        initial_task = self.llm.generate_response(
            agent=po,
            user_prompt=f"""Aşağıdaki kullanıcı talebini analiz et ve detaylı bir TASK'a dönüştür:

{user_request}

## Çıktı Formatı
## TASK: [Kısa ve açıklayıcı başlık]

### Açıklama
[Talebin detaylı açıklaması - ne yapılacak, neden yapılacak]

### Kabul Kriterleri
1. [ ] Kriter 1
2. [ ] Kriter 2
3. [ ] Kriter 3
(en az 3, en fazla 5 kriter)

### Beklenen Çıktı
[Bu task tamamlandığında ne üretilmiş olacak]

### Etkilenen Alanlar
- [Modül/Sayfa 1]
- [Modül/Sayfa 2]

NOT: Önceliklendirme YAPMA, sadece task tanımına odaklan.
"""
        )

        self.logger.log_agent_message(
            po.name, po.title, po.emoji, "proposal", initial_task
        )

        # 2. Tartışma thread'i oluştur
        thread = self.discussion_room.create_thread(
            topic=f"Task Review: {user_request[:50]}...",
            initial_phase=DiscussionPhase.TEAM_REVIEW
        )
        thread.add_message(po, initial_task, MessageType.PROPOSAL)

        # 3. Tech Lead teknik fizibilite yorumu
        print(f"  → {tech_lead.emoji} {tech_lead.name} teknik fizibilite değerlendiriyor...")

        tech_review = self.llm.generate_response(
            agent=tech_lead,
            user_prompt=f"""Aşağıdaki TASK'ı teknik fizibilite açısından değerlendir:

{initial_task}

Değerlendir:
1. Teknik olarak uygulanabilir mi?
2. Mevcut mimari ile uyumlu mu?
3. Eksik veya belirsiz noktalar var mı?
4. Potansiyel teknik riskler neler?
5. Kabul kriterleri yeterli ve ölçülebilir mi?

Kısa ve öz yorumunu yaz.""",
            context=thread.get_context_for_agent(tech_lead)
        )

        thread.add_message(tech_lead, tech_review, MessageType.OPINION)
        self.logger.log_agent_message(
            tech_lead.name, tech_lead.title, tech_lead.emoji, "opinion", tech_review
        )

        # 4. Tester test edilebilirlik yorumu
        print(f"  → {qa.emoji} {qa.name} test edilebilirliği değerlendiriyor...")

        tester_review = self.llm.generate_response(
            agent=qa,
            user_prompt=f"""Aşağıdaki TASK'ı test edilebilirlik açısından değerlendir:

{initial_task}

Değerlendir:
1. Kabul kriterleri test edilebilir mi?
2. Happy path ve edge case'ler düşünülmüş mü?
3. Test için gerekli ön koşullar neler?
4. Hangi test türleri uygulanmalı?
5. Eksik veya belirsiz test senaryoları var mı?

Kısa ve öz yorumunu yaz.""",
            context=thread.get_context_for_agent(qa)
        )

        thread.add_message(qa, tester_review, MessageType.OPINION)
        self.logger.log_agent_message(
            qa.name, qa.title, qa.emoji, "opinion", tester_review
        )

        # 5. PO feedback'lere göre finalize eder
        print(f"  → {po.emoji} {po.name} TASK'ı finalize ediyor...")

        final_task = self.llm.generate_response(
            agent=po,
            user_prompt=f"""Takımın feedback'lerini değerlendir ve TASK'ı finalize et.

## Orijinal TASK
{initial_task}

## Tech Lead Yorumu
{tech_review}

## Tester Yorumu
{tester_review}

## Görev
Feedback'leri dikkate alarak TASK'ı revize et.
- Kabul kriterlerini netleştir
- Eksik noktaları tamamla
- Test edilebilirliği artır

Final TASK versiyonunu yaz.""",
            context=thread.get_context_for_agent(po)
        )

        thread.add_message(po, final_task, MessageType.SUMMARY)
        thread.is_resolved = True
        thread.resolution = final_task

        self.logger.log_decision(
            "TASK Onaylandı",
            final_task,
            [po.name, tech_lead.name, qa.name]
        )

        self.task_outputs["task"] = final_task
        return final_task
    
    def _run_teknik_olgunlastirma(self, task: str, project_context: Optional[str]) -> str:
        """Teknik Olgunlaştırma aşaması - Tech Lead + Developer + Tester tartışır"""
        self.current_phase = SprintPhase.TEKNIK_OLGUNLASTIRMA
        self.logger.log_phase_start("Teknik Olgunlaştırma", "Tech Lead teknik plan ve alt görevler oluşturuyor...")

        tech_lead = get_agent("tech_lead")
        senior_dev = get_agent("senior_dev")
        qa = get_agent("qa")

        context_info = f"\n\n**Proje Bağlamı:**\n{project_context}" if project_context else ""

        # 1. Tech Lead teknik plan + alt görevler oluşturur
        print(f"  → {tech_lead.emoji} {tech_lead.name} teknik plan hazırlıyor...")

        initial_plan = self.llm.generate_response(
            agent=tech_lead,
            user_prompt=f"""Aşağıdaki TASK için teknik plan ve alt görevler oluştur:

## TASK
{task}
{context_info}

## Çıktı Formatı
## TEKNIK PLAN

### Mimari Yaklaşım
[Nasıl bir yaklaşımla çözülecek]

### Kullanılacak Teknolojiler
- [Teknoloji 1]
- [Teknoloji 2]

### Developer Görevleri
1. [ ] Görev 1 - [Dosya adı] - [Kısa açıklama]
2. [ ] Görev 2 - [Dosya adı] - [Kısa açıklama]
(Her görev max 4 saat)

### Tester Gereksinimleri
1. [ ] Test senaryosu 1 - [Açıklama]
2. [ ] Test senaryosu 2 - [Açıklama]
(Happy path + edge case'ler)

### Değişecek Dosyalar
- [dosya1.js] - Yeni/Güncelleme
- [dosya2.html] - Yeni/Güncelleme

### Riskler
- [Risk 1 ve çözümü]
"""
        )

        self.logger.log_agent_message(
            tech_lead.name, tech_lead.title, tech_lead.emoji, "proposal", initial_plan
        )

        # 2. Tartışma thread'i
        thread = self.discussion_room.create_thread(
            topic="Teknik Plan Review",
            initial_phase=DiscussionPhase.TEAM_REVIEW
        )
        thread.add_message(tech_lead, initial_plan, MessageType.PROPOSAL)

        # 3. Developer implementation perspektifi
        print(f"  → {senior_dev.emoji} {senior_dev.name} implementation perspektifi veriyor...")

        dev_review = self.llm.generate_response(
            agent=senior_dev,
            user_prompt=f"""Tech Lead'in teknik planını incele:

{initial_plan}

Değerlendir:
1. Görevler implementation için yeterli detayda mı?
2. Task breakdown mantıklı mı?
3. Eksik gördüğün noktalar var mı?
4. Alternatif yaklaşım önerir misin?
5. Tahmini zorluk ve dikkat edilmesi gerekenler neler?

Kısa ve öz yorumunu yaz.""",
            context=thread.get_context_for_agent(senior_dev)
        )

        thread.add_message(senior_dev, dev_review, MessageType.OPINION)
        self.logger.log_agent_message(
            senior_dev.name, senior_dev.title, senior_dev.emoji, "opinion", dev_review
        )

        # 4. Tester test gereksinimleri yorumu
        print(f"  → {qa.emoji} {qa.name} test gereksinimlerini değerlendiriyor...")

        tester_review = self.llm.generate_response(
            agent=qa,
            user_prompt=f"""Tech Lead'in teknik planındaki test gereksinimlerini incele:

{initial_plan}

Değerlendir:
1. Test senaryoları yeterli mi?
2. Edge case'ler düşünülmüş mü?
3. Eksik test senaryoları var mı?
4. Test için gerekli ön koşullar neler?
5. Otomasyona uygun mu?

Kısa ve öz yorumunu yaz.""",
            context=thread.get_context_for_agent(qa)
        )

        thread.add_message(qa, tester_review, MessageType.OPINION)
        self.logger.log_agent_message(
            qa.name, qa.title, qa.emoji, "opinion", tester_review
        )

        # 5. Tech Lead feedback'lere göre finalize eder
        print(f"  → {tech_lead.emoji} {tech_lead.name} planı finalize ediyor...")

        final_plan = self.llm.generate_response(
            agent=tech_lead,
            user_prompt=f"""Takımın yorumlarını değerlendir ve teknik planı finalize et:

## Orijinal Plan
{initial_plan}

## Developer Yorumu
{dev_review}

## Tester Yorumu
{tester_review}

## Görev
Yorumları dikkate alarak planı revize et:
- Developer görevlerini netleştir
- Test gereksinimlerini tamamla
- Eksik noktaları ekle

Final teknik planı yaz.""",
            context=thread.get_context_for_agent(tech_lead)
        )

        thread.add_message(tech_lead, final_plan, MessageType.SUMMARY)
        thread.is_resolved = True
        thread.resolution = final_plan

        self.logger.log_decision(
            "Teknik Plan Onaylandı",
            final_plan,
            [tech_lead.name, senior_dev.name, qa.name]
        )

        self.task_outputs["technical_plan"] = final_plan
        return final_plan
    
    def _run_gelistirme(self, technical_plan: str, project_context: Optional[str]) -> str:
        """Geliştirme aşaması - Developer kodlar"""
        self.current_phase = SprintPhase.GELISTIRME
        self.logger.log_phase_start("Geliştirme", "Developer implementation yapıyor...")

        senior_dev = get_agent("senior_dev")
        frontend_dev = get_agent("frontend_dev")

        context_info = f"\n\n**Proje Bağlamı:**\n{project_context}" if project_context else ""

        # 1. Senior Dev backend/core implementation
        print(f"  → {senior_dev.emoji} {senior_dev.name} backend kodluyor...")

        backend_code = self.llm.generate_response(
            agent=senior_dev,
            user_prompt=f"""Teknik plandaki Developer Görevlerine göre backend/core implementation yap:

## Teknik Plan
{technical_plan}
{context_info}

## Görev
1. Teknik plandaki developer görevlerini uygula
2. Gerekli fonksiyonları/modülleri yaz
3. API endpoint'lerini implement et
4. Veritabanı işlemlerini kodla
5. Error handling ekle
6. Temel validasyonları yap

Her dosya için dosya adı ve içeriğini belirt.
Kod yorumları ekle."""
        )

        self.logger.log_agent_message(
            senior_dev.name, senior_dev.title, senior_dev.emoji, "proposal", backend_code
        )

        # 2. Frontend Dev UI implementation
        print(f"  → {frontend_dev.emoji} {frontend_dev.name} frontend kodluyor...")

        frontend_code = self.llm.generate_response(
            agent=frontend_dev,
            user_prompt=f"""Teknik plandaki Developer Görevlerine göre frontend implementation yap:

## Teknik Plan
{technical_plan}
{context_info}

## Backend Implementasyonu (referans)
{backend_code[:2000]}...

## Görev
1. HTML yapısını oluştur
2. CSS/stil dosyalarını yaz
3. JavaScript etkileşimlerini kodla
4. Backend API'lerle entegrasyonu yap
5. Loading/error state'lerini ekle
6. Responsive tasarımı uygula

Her dosya için dosya adı ve içeriğini belirt."""
        )

        self.logger.log_agent_message(
            frontend_dev.name, frontend_dev.title, frontend_dev.emoji, "proposal", frontend_code
        )

        # 3. Birleşik implementation
        full_implementation = f"""# Backend Implementation
**Sorumlu:** {senior_dev.name}

{backend_code}

---

# Frontend Implementation
**Sorumlu:** {frontend_dev.name}

{frontend_code}
"""

        self.logger.log_task_output("Implementation", f"{senior_dev.name} & {frontend_dev.name}", full_implementation)
        self.task_outputs["implementation"] = full_implementation

        return full_implementation
    
    def _run_test(self, task: str, implementation: str) -> str:
        """Test aşaması - Tester test eder"""
        self.current_phase = SprintPhase.TEST
        self.logger.log_phase_start("Test", "Tester test ediyor...")

        qa = get_agent("qa")

        print(f"  → {qa.emoji} {qa.name} test ediyor...")

        test_results = self.llm.generate_response(
            agent=qa,
            user_prompt=f"""Aşağıdaki implementasyonu TASK'taki kabul kriterlerine göre test et:

## TASK & Kabul Kriterleri
{task}

## Implementation
{implementation[:6000]}

## Görev
1. **Kabul Kriterleri Testi**
   - Her kabul kriteri için test et
   - Karşılandı mı, karşılanmadı mı belirt

2. **Ek Test Senaryoları**
   - Happy path testleri
   - Edge case testleri

3. **Her Senaryo İçin**
   - Test adı
   - Beklenen sonuç
   - Durum: ✅ PASS / ❌ FAIL

4. **Bug Raporu** (varsa)
   - Bug ID
   - Açıklama
   - Severity: Critical/High/Medium/Low

5. **Sonuç**
   - ✅ PASS - Tüm testler geçti
   - ⚠️ PASS WITH ISSUES - Kritik olmayan sorunlar var
   - ❌ FAIL - Kritik sorunlar var

## Çıktı
Yapılandırılmış test raporu"""
        )

        self.logger.log_agent_message(
            qa.name, qa.title, qa.emoji, "summary", test_results
        )

        self.logger.log_task_output("Test Results", qa.name, test_results)
        self.task_outputs["test_results"] = test_results

        return test_results

    def _run_onay(self, task: str, implementation: str, test_results: str) -> str:
        """Onay aşaması - PO final onay verir"""
        self.current_phase = SprintPhase.ONAY
        self.logger.log_phase_start("Onay", "Product Owner final onay veriyor...")

        po = get_agent("po")

        print(f"  → {po.emoji} {po.name} onay değerlendirmesi yapıyor...")

        approval = self.llm.generate_response(
            agent=po,
            user_prompt=f"""TASK'ın tamamlanıp tamamlanmadığını değerlendir:

## TASK
{task}

## Implementation Özeti
{implementation[:3000]}...

## Test Sonuçları
{test_results}

## Görev
1. **Kabul Kriterleri Değerlendirmesi**
   - Her kriter için: KARŞILANDI / KARŞILANMADI

2. **Genel Değerlendirme**
   - TASK başarıyla tamamlandı mı?
   - Eksik kalan noktalar var mı?

3. **Sonuç** (birini seç)
   - ✅ ONAYLANDI - Tüm kriterler karşılandı, production'a hazır
   - 🔄 REVİZYON GEREKLİ - Küçük düzeltmeler gerekli
   - ❌ REDDEDİLDİ - Önemli eksiklikler var, yeniden yapılmalı

4. **Notlar**
   - Varsa ek yorumlar

## Çıktı Formatı
## PO ONAY

### Kabul Kriterleri
1. [x/] Kriter 1 - KARŞILANDI/KARŞILANMADI
...

### Sonuç: [ONAYLANDI/REVİZYON GEREKLİ/REDDEDİLDİ]

### Notlar
[Ek yorumlar]"""
        )

        self.logger.log_agent_message(
            po.name, po.title, po.emoji, "summary", approval
        )

        self.logger.log_decision(
            "PO Onayı Tamamlandı",
            approval,
            [po.name]
        )

        self.task_outputs["approval"] = approval
        return approval


# ============================================
# KOLAYLIK FONKSİYONLARI
# ============================================

def run_scrum_sprint(
    user_request: str,
    project_context: Optional[str] = None,
    project_name: Optional[str] = None
) -> Dict:
    """Hızlı sprint başlatma fonksiyonu"""
    orchestrator = ScrumOrchestrator(project_name=project_name)
    return orchestrator.run_sprint(user_request, project_context)
