-- customers tablosuna guvenlik sorulari kolonlari ekle
-- Her soru icin EVET = true, HAYIR = false

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS security_q1 BOOLEAN,
ADD COLUMN IF NOT EXISTS security_q2 BOOLEAN,
ADD COLUMN IF NOT EXISTS security_q3 BOOLEAN,
ADD COLUMN IF NOT EXISTS security_q4 BOOLEAN,
ADD COLUMN IF NOT EXISTS security_accepted_at TIMESTAMPTZ;

-- Yorum:
-- security_q1: Tüpgaz dışında tehlikeli madde depolamıyor musunuz?
-- security_q2: Tüpgazın kullanılacağı yerde havalandırma var mı?
-- security_q3: Tüpgazı kapalı alanda depolamıyor musunuz?
-- security_q4: Yangın söndürme cihazınız var mı?
-- security_accepted_at: Kullanıcının beyanları kabul ettiği tarih/saat
