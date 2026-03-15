# Proje Kuralları

## KRİTİK: Background Server Koruması (Port 8080)
- Port 8080'de `npx http-server . -p 8080` ile local development server çalışıyor
- Bu server'ı ASLA kapatma, kill etme veya durdurma
- `kill`, `pkill`, `lsof -t ... | xargs kill` gibi komutlarla port 8080'i hedef alma
- Port 8080 meşgulse farklı port kullan veya kullanıcıya sor
- Her Bash komutu sonrası port 8080'in çalışıp çalışmadığını kontrol et
- Çalışmıyorsa background'da yeniden başlat: `nohup npx http-server . -p 8080 -s > /dev/null 2>&1 &`
- Kontrol komutu: `lsof -iTCP:8080 -sTCP:LISTEN`

## KRİTİK: Türkçe Karakter Kullanımı
- Bu proje Türkçe bir projedir
- Tüm kullanıcıya görünen metinlerde düzgün Türkçe karakterler kullanılmalıdır: ü, ö, ş, ç, ğ, ı, İ
- ASCII karşılıkları (u, o, s, c, g, i) ASLA kullanılmamalıdır
- Placeholder, alert, confirm, modal metinleri, buton yazıları, açıklama metinleri — hepsi Türkçe olmalıdır

 ## Oturum Başlangıç Görevi
  - Her konuşmanın başında port 8080'i kontrol et
  - Çalışmıyorsa `nohup npx http-server . -p 8080 -s > /dev/null 2>&1 &` ile başlat