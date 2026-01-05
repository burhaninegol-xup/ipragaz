"""
Tartışma Mekanizması
Agent'ların birbirleriyle konuşması, itiraz etmesi ve konsensüse ulaşması
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable
from datetime import datetime
from enum import Enum
import json

from agents import Agent, get_agent, get_all_agents


class MessageType(Enum):
    """Mesaj türleri"""
    PROPOSAL = "proposal"           # Öneri sunma
    OPINION = "opinion"             # Görüş bildirme
    QUESTION = "question"           # Soru sorma
    OBJECTION = "objection"         # İtiraz
    CLARIFICATION = "clarification" # Açıklama isteme
    AGREEMENT = "agreement"         # Onaylama
    SUGGESTION = "suggestion"       # Alternatif önerme
    SUMMARY = "summary"             # Özet


class DiscussionPhase(Enum):
    """Tartışma aşamaları"""
    INITIAL_PROPOSAL = "initial_proposal"
    TEAM_REVIEW = "team_review"
    DISCUSSION = "discussion"
    REFINEMENT = "refinement"
    CONSENSUS = "consensus"
    FINAL_DECISION = "final_decision"


@dataclass
class Message:
    """Tek bir mesaj"""
    id: str
    agent_id: str
    agent_name: str
    agent_title: str
    agent_emoji: str
    message_type: MessageType
    content: str
    timestamp: datetime
    in_reply_to: Optional[str] = None  # Yanıt verilen mesaj ID'si
    mentions: List[str] = field(default_factory=list)  # Mention edilen agent'lar
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "agent_title": self.agent_title,
            "type": self.message_type.value,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "in_reply_to": self.in_reply_to,
            "mentions": self.mentions
        }
    
    def to_markdown(self) -> str:
        """Markdown formatında mesaj"""
        type_badges = {
            MessageType.PROPOSAL: "💡 Öneri",
            MessageType.OPINION: "💬 Görüş",
            MessageType.QUESTION: "❓ Soru",
            MessageType.OBJECTION: "⚠️ İtiraz",
            MessageType.CLARIFICATION: "🔍 Açıklama",
            MessageType.AGREEMENT: "✅ Onay",
            MessageType.SUGGESTION: "💭 Alternatif",
            MessageType.SUMMARY: "📋 Özet"
        }
        
        badge = type_badges.get(self.message_type, "💬")
        time_str = self.timestamp.strftime("%H:%M")
        
        reply_info = ""
        if self.in_reply_to:
            reply_info = f" _(yanıt)_"
        
        return f"""### {self.agent_emoji} {self.agent_name} ({self.agent_title}) - {badge}{reply_info}
_{time_str}_

{self.content}

---
"""


@dataclass
class DiscussionThread:
    """Bir tartışma thread'i"""
    id: str
    topic: str
    phase: DiscussionPhase
    messages: List[Message] = field(default_factory=list)
    participants: List[str] = field(default_factory=list)  # Agent ID'leri
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_resolved: bool = False
    resolution: Optional[str] = None
    
    _message_counter: int = field(default=0, repr=False)
    
    def add_message(
        self, 
        agent: Agent, 
        content: str, 
        message_type: MessageType,
        in_reply_to: Optional[str] = None,
        mentions: List[str] = None
    ) -> Message:
        """Thread'e yeni mesaj ekle"""
        self._message_counter += 1
        
        message = Message(
            id=f"{self.id}-msg-{self._message_counter}",
            agent_id=agent.id,
            agent_name=agent.name,
            agent_title=agent.title,
            agent_emoji=agent.emoji,
            message_type=message_type,
            content=content,
            timestamp=datetime.now(),
            in_reply_to=in_reply_to,
            mentions=mentions or []
        )
        
        self.messages.append(message)
        self.updated_at = datetime.now()
        
        if agent.id not in self.participants:
            self.participants.append(agent.id)
        
        return message
    
    def get_context_for_agent(self, agent: Agent, last_n: int = 10) -> str:
        """Bir agent için tartışma context'i oluştur"""
        recent_messages = self.messages[-last_n:] if len(self.messages) > last_n else self.messages
        
        context = f"""## Tartışma Konusu
{self.topic}

## Mevcut Aşama
{self.phase.value}

## Tartışma Geçmişi
"""
        for msg in recent_messages:
            if msg.agent_id == agent.id:
                context += f"\n**[SEN - {msg.agent_name}]** ({msg.message_type.value}):\n{msg.content}\n"
            else:
                context += f"\n**[{msg.agent_name} - {msg.agent_title}]** ({msg.message_type.value}):\n{msg.content}\n"
        
        return context
    
    def get_full_transcript(self) -> str:
        """Tam tartışma transcript'i"""
        transcript = f"""# 📋 Tartışma Kaydı: {self.topic}

**Oluşturulma:** {self.created_at.strftime("%Y-%m-%d %H:%M")}
**Son Güncelleme:** {self.updated_at.strftime("%Y-%m-%d %H:%M")}
**Katılımcılar:** {', '.join(self.participants)}
**Durum:** {'✅ Çözüldü' if self.is_resolved else '🔄 Devam Ediyor'}

---

"""
        for msg in self.messages:
            transcript += msg.to_markdown()
        
        if self.resolution:
            transcript += f"""
## 🎯 Sonuç / Karar

{self.resolution}
"""
        
        return transcript
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "topic": self.topic,
            "phase": self.phase.value,
            "messages": [m.to_dict() for m in self.messages],
            "participants": self.participants,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "is_resolved": self.is_resolved,
            "resolution": self.resolution
        }


@dataclass 
class DiscussionRoom:
    """Tüm tartışmaların yönetildiği oda"""
    
    threads: Dict[str, DiscussionThread] = field(default_factory=dict)
    _thread_counter: int = field(default=0, repr=False)
    
    def create_thread(self, topic: str, initial_phase: DiscussionPhase = DiscussionPhase.INITIAL_PROPOSAL) -> DiscussionThread:
        """Yeni tartışma thread'i oluştur"""
        self._thread_counter += 1
        thread_id = f"thread-{self._thread_counter}"
        
        thread = DiscussionThread(
            id=thread_id,
            topic=topic,
            phase=initial_phase
        )
        
        self.threads[thread_id] = thread
        return thread
    
    def get_thread(self, thread_id: str) -> Optional[DiscussionThread]:
        return self.threads.get(thread_id)
    
    def get_active_threads(self) -> List[DiscussionThread]:
        return [t for t in self.threads.values() if not t.is_resolved]
    
    def export_all_transcripts(self) -> str:
        """Tüm tartışmaların transcript'ini export et"""
        full_export = "# 📚 Tüm Tartışma Kayıtları\n\n"
        full_export += f"**Export Tarihi:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n"
        full_export += "---\n\n"
        
        for thread in self.threads.values():
            full_export += thread.get_full_transcript()
            full_export += "\n\n---\n\n"
        
        return full_export


# ============================================
# TARTIŞMA PROMPTLARI
# ============================================

DISCUSSION_PROMPTS = {
    "review_proposal": """Aşağıdaki öneriyi kendi uzmanlık alanın açısından değerlendir.

{proposal}

## Görevin
1. Öneriyi anladığını kısaca belirt
2. Kendi uzmanlık alanın açısından güçlü yönlerini belirt
3. Endişelerini veya sorularını paylaş
4. Varsa alternatif önerilerin sun

Kısa ve öz ol. Gereksiz övgüden kaçın, yapıcı ol.""",

    "respond_to_objection": """Bir takım arkadaşın itirazda bulundu:

{objection}

## Tartışma Bağlamı
{context}

## Görevin
1. İtirazı anladığını göster
2. Katılıyorsan kabul et ve önerini revize et
3. Katılmıyorsan nedenini açıkla
4. Orta yol önerisi varsa sun

Savunmacı olma, çözüm odaklı ol.""",

    "ask_clarification": """Bir konuda netlik gerekiyor:

{unclear_point}

## Tartışma Bağlamı
{context}

## Görevin
Kendi uzmanlık alanın açısından açıklığa kavuşması gereken soruları sor.
En fazla 2-3 soru sor, odaklı ol.""",

    "build_consensus": """Tartışma özeti:

{discussion_summary}

## Görevin
1. Üzerinde uzlaşılan noktaları listele
2. Hâlâ tartışmalı olan noktaları belirt
3. Kendi önerini sun: nasıl ilerlemeliyiz?

Pratik ve uygulanabilir ol.""",

    "final_review": """Final önerisi:

{final_proposal}

## Görevin
1. Bu öneriyi onaylıyor musun? (Evet/Hayır/Koşullu)
2. Koşullu ise, koşulların neler?
3. Son notların varsa ekle

Kısa ol, karar ver."""
}
