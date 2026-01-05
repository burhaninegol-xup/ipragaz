#!/usr/bin/env python3
"""
İpragaz Test Sistemi - Hızlı Başlatıcı
"""

import subprocess
import sys
import os
from pathlib import Path

def check_dependencies():
    """Bağımlılıkları kontrol et"""
    print("🔍 Bağımlılıklar kontrol ediliyor...")
    
    try:
        import playwright
        print("  ✅ Playwright kurulu")
    except ImportError:
        print("  ❌ Playwright kurulu değil")
        print("  Kurmak için: pip3 install playwright && playwright install chromium")
        return False
    
    try:
        import fastapi
        import uvicorn
        print("  ✅ FastAPI kurulu")
    except ImportError:
        print("  ❌ FastAPI kurulu değil")
        print("  Kurmak için: pip3 install fastapi uvicorn")
        return False
    
    return True

def main():
    print("""
╔═══════════════════════════════════════════════════════════════╗
║           🧪 İPRAGAZ TEST SİSTEMİ 🧪                          ║
╠═══════════════════════════════════════════════════════════════╣
║  1. Dashboard başlat (Web arayüzü)                            ║
║  2. Tüm testleri çalıştır (CLI)                              ║
║  3. Sadece critical testleri çalıştır                        ║
║  4. Bağımlılıkları kur                                       ║
║  0. Çıkış                                                    ║
╚═══════════════════════════════════════════════════════════════╝
""")
    
    choice = input("Seçiminiz: ").strip()
    
    if choice == "1":
        if check_dependencies():
            print("\n🚀 Dashboard başlatılıyor...")
            print("   http://localhost:8081 adresinden erişebilirsiniz\n")
            os.system("python3 dashboard.py")
    
    elif choice == "2":
        if check_dependencies():
            print("\n🚀 Testler başlatılıyor...")
            os.system("python3 test_runner.py scenarios/test_scenarios.json")
    
    elif choice == "3":
        if check_dependencies():
            print("\n🚀 Critical testler başlatılıyor...")
            os.system("python3 test_runner.py scenarios/test_scenarios.json -t critical")
    
    elif choice == "4":
        print("\n📦 Bağımlılıklar kuruluyor...")
        os.system("pip3 install -r requirements.txt")
        os.system("playwright install chromium")
        print("\n✅ Kurulum tamamlandı!")
    
    elif choice == "0":
        print("👋 Görüşürüz!")
    
    else:
        print("❌ Geçersiz seçim")

if __name__ == "__main__":
    main()
