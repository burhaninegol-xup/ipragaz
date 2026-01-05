#!/usr/bin/env python3
"""
Scrum Agent Dashboard Başlatıcı
"""

import os
import sys
from pathlib import Path

# Web klasörünü path'e ekle
web_dir = Path(__file__).parent / "web"
sys.path.insert(0, str(web_dir))
sys.path.insert(0, str(Path(__file__).parent))

# dotenv yükle
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

def main():
    # API key kontrolü
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("❌ ANTHROPIC_API_KEY bulunamadı!")
        print("   .env dosyasına ekleyin veya:")
        print("   export ANTHROPIC_API_KEY='your-key'")
        sys.exit(1)
    
    print("""
╔═══════════════════════════════════════════════════════════════╗
║           🏭 SCRUM AGENT DASHBOARD 🏭                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Takım Üyeleri:                                               ║
║  👩‍💼 Ayşe (PO) · 👨‍💻 Mehmet (Tech) · 🧑‍💻 Ali (Dev)              ║
║  👩‍🎨 Zeynep (Frontend) · 🔍 Can (QA)                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Dashboard: http://localhost:8080                             ║
║  Durdurmak için: Ctrl+C                                       ║
╚═══════════════════════════════════════════════════════════════╝
""")
    
    # Server'ı başlat
    import uvicorn
    from web.server import app
    
    uvicorn.run(app, host="127.0.0.1", port=8080)


if __name__ == "__main__":
    main()
