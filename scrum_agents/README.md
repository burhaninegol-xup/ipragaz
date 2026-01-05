# 🏃 Scrum Agent Takımı

Multi-agent Scrum sistemi - Claude API ile çalışan, şeffaf tartışma ve karar mekanizmalı yapay zeka takımı.

## 🌟 Özellikler

- **5 Uzman Agent:** Her biri kendi kişiliği, uzmanlığı ve iletişim stiliyle
- **Şeffaf Tartışmalar:** Agent'lar birbirleriyle tartışır, itiraz eder, konsensüs arar
- **Detaylı Loglama:** Tüm süreç markdown formatında kaydedilir
- **Tam Sprint Döngüsü:** Backlog → Planning → Development → Review → Testing → Sprint Review

## 👥 Takım Üyeleri

| Agent | İsim | Uzmanlık |
|-------|------|----------|
| 👩‍💼 Product Owner | Ayşe | İş analizi, user story, önceliklendirme |
| 👨‍💻 Tech Lead | Mehmet | Mimari, kod kalitesi, teknik kararlar |
| 🧑‍💻 Senior Dev | Ali | Full-stack development, API, veritabanı |
| 👩‍🎨 Frontend Dev | Zeynep | UI/UX, responsive tasarım, erişilebilirlik |
| 🔍 QA Engineer | Can | Test stratejisi, bug hunting, otomasyon |

## 🚀 Kurulum

```bash
# Projeyi klonla/kopyala
cd scrum_agents

# Bağımlılıkları yükle
pip install -r requirements.txt

# API key'i ayarla
export ANTHROPIC_API_KEY='sk-ant-...'

# veya .env dosyası oluştur
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

## 📖 Kullanım

### İnteraktif Mod
```bash
python main.py
```

### Direkt Çalıştırma
```bash
python main.py "Sipariş takip modülü istiyorum"
```

### Demo Mod
```bash
python main.py --demo
```

### Python'dan Kullanım
```python
from orchestrator import run_scrum_sprint

results = run_scrum_sprint(
    user_request="Müşteri dashboard'u istiyorum",
    project_context="Tech: React, Supabase",
    project_name="Müşteri Projesi"
)
```

## 📁 Proje Yapısı

```
scrum_agents/
├── main.py           # Ana çalıştırma dosyası
├── config.py         # Konfigürasyon
├── agents.py         # Agent tanımları
├── discussion.py     # Tartışma mekanizması
├── orchestrator.py   # Sprint yönetimi
├── llm_engine.py     # Anthropic API entegrasyonu
├── logger.py         # Şeffaf loglama
├── requirements.txt  # Bağımlılıklar
└── logs/             # Oluşturulan loglar
    └── session_xxx/
        ├── main_log.md      # Tam tartışma kaydı
        ├── decisions.md     # Kararlar
        ├── timeline.json    # Timeline (JSON)
        └── task_*.md        # Task çıktıları
```

## 🔄 Sprint Akışı

```
┌─────────────────────────────────────────────────────────────┐
│                    1. BACKLOG REFINEMENT                    │
│  👩‍💼 PO → User Story oluşturur                                │
│  👨‍💻 Tech Lead → Teknik fizibilite yorumu                     │
│  🔍 QA → Test edilebilirlik yorumu                          │
│  👩‍💼 PO → Final user story                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    2. SPRINT PLANNING                       │
│  👨‍💻 Tech Lead → Teknik plan hazırlar                         │
│  🧑‍💻 Senior Dev → Implementation perspektifi                  │
│  👩‍🎨 Frontend Dev → UI/UX perspektifi                         │
│  👨‍💻 Tech Lead → Final plan                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      3. DEVELOPMENT                         │
│  🧑‍💻 Senior Dev → Backend implementation                      │
│  👩‍🎨 Frontend Dev → Frontend implementation                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      4. CODE REVIEW                         │
│  👨‍💻 Tech Lead → Kod kalitesi, güvenlik, performans           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        5. TESTING                           │
│  🔍 QA → Test senaryoları, bug raporu, Go/No-Go             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     6. SPRINT REVIEW                        │
│  👩‍💼 PO → Acceptance criteria değerlendirmesi                 │
│  Tüm Takım → Sprint retrospektifi                           │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Log Örneği

```markdown
# 📋 Scrum Sprint Log
**Session:** session_20250104_143022

---

## 🚀 Backlog Refinement
_14:30:25_

Product Owner talebi analiz ediyor...

### 👩‍💼 Ayşe (Product Owner) - 💡 Öneri
_14:30:28_

## User Story
**As a** bayi yöneticisi,
**I want** müşteri siparişlerini takip edebilmek,
**So that** teslimat planlamasını verimli yapabileyim.

## Acceptance Criteria
- **Given** kullanıcı dashboard'a giriş yaptığında
- **When** sipariş listesi sayfasını açtığında
- **Then** tüm aktif siparişleri tarih sırasına göre görmeli

...
```

## ⚙️ Konfigürasyon

`config.py` dosyasından ayarları değiştirebilirsiniz:

```python
@dataclass
class Config:
    model: str = "claude-sonnet-4-20250514"  # Kullanılacak model
    max_tokens: int = 4096
    max_discussion_rounds: int = 3    # Tartışma turu limiti
    require_consensus: bool = True     # Konsensüs zorunlu mu
    log_format: str = "markdown"       # markdown veya json
```

## 🔧 Özelleştirme

### Yeni Agent Ekleme

`agents.py` dosyasında `TEAM_MEMBERS` dict'ine yeni agent ekleyin:

```python
"devops": Agent(
    id="devops",
    name="Emre",
    role=AgentRole.DEVOPS,
    title="DevOps Engineer",
    emoji="🔧",
    personality="...",
    expertise=["CI/CD", "Docker", "Kubernetes"],
    # ...
)
```

### Tartışma Akışını Değiştirme

`orchestrator.py` dosyasındaki `_run_*` metodlarını özelleştirin.

## 📝 Claude Code Entegrasyonu

VSCode + Claude Code ile kullanmak için:

```bash
# Claude Code'dan çağır
claude "python /path/to/scrum_agents/main.py 'Yeni özellik talebi'"
```

## 💡 İpuçları

1. **İlk seferde demo mod'u deneyin** - Sistemi anlamak için
2. **Detaylı talep yazın** - Ne kadar detaylı, o kadar iyi sonuç
3. **Proje bağlamı verin** - Tech stack, mevcut yapı bilgisi
4. **Log'ları inceleyin** - Tartışma süreci çok öğretici

## 📄 Lisans

MIT License

## 🤝 Katkıda Bulunma

Pull request'ler memnuniyetle karşılanır!
