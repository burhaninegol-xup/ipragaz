"""
Scrum Agent Takımı - Konfigürasyon
"""

import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class Config:
    """Sistem konfigürasyonu"""
    
    # API Ayarları
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    model: str = "claude-sonnet-4-20250514"
    max_tokens: int = 4096
    
    # Tartışma Ayarları
    max_discussion_rounds: int = 3  # Maksimum tartışma turu
    require_consensus: bool = True   # Konsensüs gerekli mi?
    
    # Loglama
    log_dir: str = "logs"
    log_format: str = "markdown"  # markdown veya json
    
    # Proje Bilgileri
    project_name: str = "İpragaz LPG Bayi Yönetim Sistemi"
    tech_stack: str = "Vanilla HTML/CSS/JS, Supabase, Vercel"


# Varsayılan konfigürasyon
config = Config()
