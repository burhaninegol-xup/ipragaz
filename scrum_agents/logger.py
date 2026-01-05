"""
Şeffaf Loglama Sistemi
Tüm tartışmaların ve kararların kaydı
"""

import os
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path

from config import config


class TransparentLogger:
    """Şeffaf loglama - tüm süreç kaydedilir"""
    
    def __init__(self, log_dir: Optional[str] = None, session_name: Optional[str] = None):
        self.log_dir = Path(log_dir or config.log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # Session için unique isim
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.session_name = session_name or f"session_{timestamp}"
        self.session_dir = self.log_dir / self.session_name
        self.session_dir.mkdir(parents=True, exist_ok=True)
        
        # Log dosyaları
        self.main_log_path = self.session_dir / "main_log.md"
        self.decisions_path = self.session_dir / "decisions.md"
        self.timeline_path = self.session_dir / "timeline.json"
        
        # Timeline için event listesi
        self.timeline_events: List[Dict[str, Any]] = []
        
        # Session başlangıcını logla
        self._init_logs()
    
    def _init_logs(self):
        """Log dosyalarını başlat"""
        
        # Main log
        with open(self.main_log_path, 'w', encoding='utf-8') as f:
            f.write(f"""# 📋 Scrum Sprint Log
**Session:** {self.session_name}
**Başlangıç:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

---

""")
        
        # Decisions log
        with open(self.decisions_path, 'w', encoding='utf-8') as f:
            f.write(f"""# 🎯 Kararlar ve Sonuçlar
**Session:** {self.session_name}

---

""")
    
    def log_phase_start(self, phase_name: str, description: str):
        """Yeni bir aşamanın başlangıcını logla"""
        timestamp = datetime.now()
        
        entry = f"""
## 🚀 {phase_name}
_{timestamp.strftime("%H:%M:%S")}_

{description}

"""
        self._append_to_main_log(entry)
        self._add_timeline_event("phase_start", phase_name, {"description": description})
    
    def log_agent_message(
        self, 
        agent_name: str, 
        agent_title: str,
        agent_emoji: str,
        message_type: str, 
        content: str
    ):
        """Agent mesajını logla"""
        timestamp = datetime.now()
        
        type_emoji = {
            "proposal": "💡",
            "opinion": "💬",
            "question": "❓",
            "objection": "⚠️",
            "clarification": "🔍",
            "agreement": "✅",
            "suggestion": "💭",
            "summary": "📋"
        }.get(message_type, "💬")
        
        entry = f"""
### {agent_emoji} {agent_name} ({agent_title}) - {type_emoji} {message_type.title()}
_{timestamp.strftime("%H:%M:%S")}_

{content}

---
"""
        self._append_to_main_log(entry)
        self._add_timeline_event("agent_message", f"{agent_name}: {message_type}", {
            "agent": agent_name,
            "type": message_type,
            "content_preview": content[:200] + "..." if len(content) > 200 else content
        })
    
    def log_discussion_round(self, round_number: int, topic: str, summary: str):
        """Tartışma turunu logla"""
        timestamp = datetime.now()
        
        entry = f"""
### 🔄 Tartışma Turu {round_number}: {topic}
_{timestamp.strftime("%H:%M:%S")}_

**Özet:**
{summary}

---
"""
        self._append_to_main_log(entry)
        self._add_timeline_event("discussion_round", f"Tur {round_number}", {"topic": topic})
    
    def log_decision(self, decision_title: str, decision_content: str, participants: List[str]):
        """Karar logla"""
        timestamp = datetime.now()
        
        entry = f"""
## ✅ {decision_title}
_{timestamp.strftime("%Y-%m-%d %H:%M:%S")}_

**Katılımcılar:** {', '.join(participants)}

{decision_content}

---
"""
        self._append_to_decisions_log(entry)
        self._append_to_main_log(f"\n> 🎯 **KARAR:** {decision_title}\n\n")
        self._add_timeline_event("decision", decision_title, {"participants": participants})
    
    def log_task_output(self, task_name: str, agent_name: str, output: str):
        """Task çıktısını logla"""
        timestamp = datetime.now()
        
        entry = f"""
## 📦 Task Çıktısı: {task_name}
_{timestamp.strftime("%H:%M:%S")}_ - **Sorumlu:** {agent_name}

{output}

---
"""
        self._append_to_main_log(entry)
        
        # Ayrı dosyaya da kaydet
        task_file = self.session_dir / f"task_{task_name.lower().replace(' ', '_')}.md"
        with open(task_file, 'w', encoding='utf-8') as f:
            f.write(f"""# {task_name}
**Tarih:** {timestamp.strftime("%Y-%m-%d %H:%M:%S")}
**Sorumlu:** {agent_name}

---

{output}
""")
    
    def log_error(self, error_message: str, context: Optional[str] = None):
        """Hata logla"""
        timestamp = datetime.now()
        
        entry = f"""
### ❌ HATA
_{timestamp.strftime("%H:%M:%S")}_

{error_message}

"""
        if context:
            entry += f"**Bağlam:** {context}\n\n"
        
        entry += "---\n"
        self._append_to_main_log(entry)
        self._add_timeline_event("error", "Hata oluştu", {"message": error_message})
    
    def log_session_end(self, summary: str, stats: Dict[str, Any]):
        """Session sonunu logla"""
        timestamp = datetime.now()
        
        entry = f"""
---

# 🏁 Session Sonu
_{timestamp.strftime("%Y-%m-%d %H:%M:%S")}_

## Özet
{summary}

## İstatistikler
- **Toplam API Çağrısı:** {stats.get('total_calls', 'N/A')}
- **Input Token:** {stats.get('total_input_tokens', 'N/A')}
- **Output Token:** {stats.get('total_output_tokens', 'N/A')}
- **Tahmini Maliyet:** ${stats.get('estimated_cost_usd', 'N/A')}

---
"""
        self._append_to_main_log(entry)
        
        # Timeline'ı kaydet
        self._save_timeline()
    
    def _append_to_main_log(self, content: str):
        """Main log'a ekle"""
        with open(self.main_log_path, 'a', encoding='utf-8') as f:
            f.write(content)
    
    def _append_to_decisions_log(self, content: str):
        """Decisions log'a ekle"""
        with open(self.decisions_path, 'a', encoding='utf-8') as f:
            f.write(content)
    
    def _add_timeline_event(self, event_type: str, title: str, data: Dict[str, Any]):
        """Timeline'a event ekle"""
        self.timeline_events.append({
            "timestamp": datetime.now().isoformat(),
            "type": event_type,
            "title": title,
            "data": data
        })
    
    def _save_timeline(self):
        """Timeline'ı JSON olarak kaydet"""
        with open(self.timeline_path, 'w', encoding='utf-8') as f:
            json.dump(self.timeline_events, f, indent=2, ensure_ascii=False)
    
    def get_session_path(self) -> Path:
        """Session dizinini getir"""
        return self.session_dir
    
    def get_main_log_content(self) -> str:
        """Main log içeriğini getir"""
        with open(self.main_log_path, 'r', encoding='utf-8') as f:
            return f.read()
