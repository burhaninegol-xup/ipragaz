# /scrum Komutu

Bu komut Scrum Agent Takımını çalıştırır ve verilen talep için tam bir sprint döngüsü başlatır.

## Kullanım
```
/scrum [talep açıklaması]
```

## Ne Yapar
1. Product Owner (Ayşe) talebi analiz eder, user story oluşturur
2. Tech Lead (Mehmet) teknik plan hazırlar
3. Takım planı tartışır, itirazlar ve öneriler paylaşılır
4. Senior Dev (Ali) ve Frontend Dev (Zeynep) kod yazar
5. QA (Can) test senaryoları oluşturur ve test eder
6. Tüm süreç `scrum_agents/logs/` altına kaydedilir

## Örnek Kullanımlar
```
/scrum Sipariş takip modülü istiyorum
/scrum Müşteri dashboard'una grafik ekle
/scrum Teslimat durumu SMS bildirimi
```

## Çalıştırma Komutu
```bash
cd scrum_agents && python run_sprint.py "$ARGUMENTS"
```

## Çıktı
Sprint tamamlandığında:
- Tartışma logları: `scrum_agents/logs/session_*/main_log.md`
- Kararlar: `scrum_agents/logs/session_*/decisions.md`
- Kod önerileri: `scrum_agents/logs/session_*/task_*.md`
