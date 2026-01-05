"""
LLM Entegrasyonu
Anthropic Claude API kullanarak agent yanıtları üretme
"""

import os
from typing import Optional, Dict, Any
from anthropic import Anthropic

from config import config
from agents import Agent


class LLMEngine:
    """LLM motorsu - agent yanıtlarını üretir"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY gerekli! .env dosyasına ekleyin veya parametre olarak verin.")
        
        self.client = Anthropic(api_key=self.api_key)
        self.model = config.model
        self.max_tokens = config.max_tokens
        
        # Kullanım istatistikleri
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.call_count = 0
    
    def generate_response(
        self,
        agent: Agent,
        user_prompt: str,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        """Agent için yanıt üret"""
        
        system_prompt = agent.get_system_prompt()
        
        if context:
            full_prompt = f"""## Bağlam
{context}

## Şimdi Yapman Gereken
{user_prompt}"""
        else:
            full_prompt = user_prompt
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": full_prompt}
                ]
            )
            
            # İstatistikleri güncelle
            self.call_count += 1
            self.total_input_tokens += response.usage.input_tokens
            self.total_output_tokens += response.usage.output_tokens
            
            return response.content[0].text
            
        except Exception as e:
            return f"[HATA] Agent yanıtı üretilemedi: {str(e)}"
    
    def generate_discussion_response(
        self,
        agent: Agent,
        discussion_context: str,
        prompt_template: str,
        template_vars: Dict[str, str],
        temperature: float = 0.7
    ) -> str:
        """Tartışma bağlamında yanıt üret"""
        
        # Template'i doldur
        prompt = prompt_template.format(**template_vars)
        
        return self.generate_response(
            agent=agent,
            user_prompt=prompt,
            context=discussion_context,
            temperature=temperature
        )
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Kullanım istatistiklerini getir"""
        return {
            "total_calls": self.call_count,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "total_tokens": self.total_input_tokens + self.total_output_tokens,
            "estimated_cost_usd": self._estimate_cost()
        }
    
    def _estimate_cost(self) -> float:
        """Tahmini maliyeti hesapla (Claude Sonnet fiyatları)"""
        # Claude Sonnet: $3/1M input, $15/1M output (yaklaşık)
        input_cost = (self.total_input_tokens / 1_000_000) * 3
        output_cost = (self.total_output_tokens / 1_000_000) * 15
        return round(input_cost + output_cost, 4)


# Singleton instance
_llm_engine: Optional[LLMEngine] = None

def get_llm_engine() -> LLMEngine:
    """Singleton LLM engine getir"""
    global _llm_engine
    if _llm_engine is None:
        _llm_engine = LLMEngine()
    return _llm_engine
