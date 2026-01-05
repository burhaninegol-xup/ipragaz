#!/usr/bin/env python3
"""
İpragaz Scrum Runner
VSCode'dan kolayca çalıştırmak için

Kullanım:
    python run_sprint.py "Sipariş takip modülü istiyorum"
    python run_sprint.py --interactive
"""

import sys
import os
from pathlib import Path

# Proje kökünü bul
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent  # ipragaz/ dizini

# scrum_agents'ı path'e ekle
sys.path.insert(0, str(SCRIPT_DIR))

from ipragaz_config import PROJECT_NAME, PROJECT_CONTEXT
from orchestrator import ScrumOrchestrator


def print_banner():
    print("""
╔═══════════════════════════════════════════════════════════════╗
║        🏭 İPRAGAZ - Scrum Agent Takımı 🏭                     ║
╠═══════════════════════════════════════════════════════════════╣
║  👩‍💼 Ayşe (PO)      → Gereksinim analizi                       ║
║  👨‍💻 Mehmet (Tech)  → Teknik planlama                          ║
║  🧑‍💻 Ali (Dev)      → Backend geliştirme                       ║
║  👩‍🎨 Zeynep (Front) → Frontend geliştirme                      ║
║  🔍 Can (QA)       → Test ve kalite                           ║
╚═══════════════════════════════════════════════════════════════╝
""")


def interactive_mode():
    """İnteraktif mod"""
    print_banner()
    
    print("📝 Talebinizi yazın (bitirmek için boş satır + Enter):")
    print("-" * 50)
    
    lines = []
    while True:
        try:
            line = input()
            if line == '' and lines:
                break
            lines.append(line)
        except EOFError:
            break
    
    user_request = '\n'.join(lines)
    
    if not user_request.strip():
        print("❌ Talep boş olamaz!")
        return
    
    run_sprint(user_request)


def run_sprint(user_request: str):
    """Sprint çalıştır"""
    print(f"\n🚀 Sprint başlatılıyor...")
    print(f"📋 Talep: {user_request[:100]}...")
    print()
    
    orchestrator = ScrumOrchestrator(project_name=PROJECT_NAME)
    
    results = orchestrator.run_sprint(
        user_request=user_request,
        project_context=PROJECT_CONTEXT
    )
    
    # Sonuçları göster
    print("\n" + "="*60)
    print("✅ SPRINT TAMAMLANDI!")
    print("="*60)
    
    log_path = orchestrator.logger.get_session_path()
    print(f"\n📁 Log dosyaları: {log_path}")
    print(f"   - main_log.md     → Tam tartışma kaydı")
    print(f"   - decisions.md    → Alınan kararlar")
    print(f"   - task_*.md       → Task çıktıları")
    
    return results


def quick_request(request_type: str, details: str = ""):
    """Hızlı talep şablonları"""
    from ipragaz_config import COMMON_REQUESTS
    
    templates = {
        "crud": f"Yeni bir CRUD modülü istiyorum: {details}",
        "rapor": f"Raporlama özelliği istiyorum: {details}",
        "ui": f"UI/UX iyileştirmesi istiyorum: {details}",
        "bug": f"Bug düzeltmesi gerekiyor: {details}",
    }
    
    request = templates.get(request_type, details)
    run_sprint(request)


def main():
    # API Key kontrolü
    if not os.getenv("ANTHROPIC_API_KEY"):
        env_file = SCRIPT_DIR / ".env"
        if env_file.exists():
            from dotenv import load_dotenv
            load_dotenv(env_file)
        else:
            print("⚠️  ANTHROPIC_API_KEY bulunamadı!")
            print(f"   .env dosyası oluşturun: {env_file}")
            return
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--interactive" or sys.argv[1] == "-i":
            interactive_mode()
        elif sys.argv[1] == "--help" or sys.argv[1] == "-h":
            print(__doc__)
        elif sys.argv[1].startswith("--"):
            # Hızlı şablon: --crud "Teslimat modülü"
            request_type = sys.argv[1][2:]
            details = ' '.join(sys.argv[2:]) if len(sys.argv) > 2 else ""
            quick_request(request_type, details)
        else:
            # Direkt talep
            user_request = ' '.join(sys.argv[1:])
            run_sprint(user_request)
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
