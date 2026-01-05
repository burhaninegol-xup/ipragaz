#!/usr/bin/env python3
"""
Scrum Agent Takımı - Ana Çalıştırma Dosyası

Kullanım:
    python main.py                          # İnteraktif mod
    python main.py "Kullanıcı talebi..."    # Direkt çalıştırma
    python main.py --demo                   # Demo mod
"""

import sys
import os
from pathlib import Path

# Proje kök dizinini path'e ekle
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator import ScrumOrchestrator, run_scrum_sprint


def interactive_mode():
    """İnteraktif mod - kullanıcıdan input al"""
    
    print("""
╔═══════════════════════════════════════════════════════════════╗
║           🏃 SCRUM AGENT TAKIMI - İnteraktif Mod 🏃           ║
╠═══════════════════════════════════════════════════════════════╣
║  Takım Üyeleri:                                               ║
║  👩‍💼 Ayşe (Product Owner)                                      ║
║  👨‍💻 Mehmet (Tech Lead)                                        ║
║  🧑‍💻 Ali (Senior Developer)                                    ║
║  👩‍🎨 Zeynep (Frontend Developer)                               ║
║  🔍 Can (QA Engineer)                                         ║
╚═══════════════════════════════════════════════════════════════╝
""")
    
    # API Key kontrolü
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("⚠️  ANTHROPIC_API_KEY environment variable tanımlı değil!")
        print("   export ANTHROPIC_API_KEY='your-api-key'")
        print()
        api_key = input("API Key'i girin (veya Enter ile çıkın): ").strip()
        if not api_key:
            return
        os.environ["ANTHROPIC_API_KEY"] = api_key
    
    print("\n📝 Kullanıcı talebinizi girin (çıkmak için 'exit'):")
    print("-" * 50)
    
    lines = []
    while True:
        line = input()
        if line.lower() == 'exit':
            return
        if line == '' and lines:
            break
        lines.append(line)
    
    user_request = '\n'.join(lines)
    
    if not user_request.strip():
        print("❌ Talep boş olamaz!")
        return
    
    print("\n📁 Proje bağlamı girin (opsiyonel, boş bırakabilirsiniz):")
    print("-" * 50)
    
    context_lines = []
    while True:
        line = input()
        if line == '':
            break
        context_lines.append(line)
    
    project_context = '\n'.join(context_lines) if context_lines else None
    
    # Sprint'i başlat
    print("\n🚀 Sprint başlatılıyor...\n")
    
    results = run_scrum_sprint(
        user_request=user_request,
        project_context=project_context
    )
    
    print("\n✅ Sprint tamamlandı! Log dosyalarını kontrol edin.")


def demo_mode():
    """Demo mod - örnek bir sprint çalıştır"""
    
    print("\n🎬 DEMO MOD - Örnek Sprint\n")
    
    demo_request = """
    İpragaz LPG Bayi Yönetim Sistemi için sipariş takip modülü istiyorum.
    Bayiler müşterilerinin siparişlerini görebilmeli, durumlarını güncelleyebilmeli
    ve teslimat planlaması yapabilmeli.
    """
    
    demo_context = """
    Tech Stack: Vanilla HTML/CSS/JS, Supabase backend, Vercel deploy
    Mevcut yapı: Dashboard, müşteri listesi, stok takibi mevcut
    Veritabanı: Supabase PostgreSQL
    Kullanıcılar: Bayi çalışanları, yöneticiler
    """
    
    results = run_scrum_sprint(
        user_request=demo_request,
        project_context=demo_context,
        project_name="İpragaz Demo"
    )
    
    return results


def direct_mode(user_request: str):
    """Direkt mod - komut satırından çalıştır"""
    
    results = run_scrum_sprint(user_request=user_request)
    return results


def main():
    """Ana fonksiyon"""
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--demo":
            demo_mode()
        elif sys.argv[1] == "--help":
            print(__doc__)
        else:
            # Direkt kullanıcı talebi
            user_request = ' '.join(sys.argv[1:])
            direct_mode(user_request)
    else:
        interactive_mode()


if __name__ == "__main__":
    main()
