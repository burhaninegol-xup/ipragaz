# Proje Kuralları

## KRİTİK: Background Server Koruması
- Port 8080'de çalışan local development server'ı ASLA kapatma, kill etme veya durdurma
- `kill`, `pkill`, `lsof -t ... | xargs kill` gibi komutlarla port 8080'i hedef alma
- Port 8080 meşgulse farklı port kullan veya kullanıcıya sor
