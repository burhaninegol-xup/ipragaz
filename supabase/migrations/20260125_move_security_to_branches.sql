-- Migration: Guvenlik sorularini customer_branches tablosuna tasi
-- Tarih: 2026-01-25
-- Aciklama: Guvenlik sorulari artik sube bazli cevaplanacak

-- customer_branches tablosuna guvenlik kolonlari ekle
ALTER TABLE customer_branches
ADD COLUMN IF NOT EXISTS security_q1 BOOLEAN,
ADD COLUMN IF NOT EXISTS security_q2 BOOLEAN,
ADD COLUMN IF NOT EXISTS security_q3 BOOLEAN,
ADD COLUMN IF NOT EXISTS security_q4 BOOLEAN,
ADD COLUMN IF NOT EXISTS security_accepted_at TIMESTAMPTZ;

-- customers tablosundan guvenlik kolonlarini kaldir
ALTER TABLE customers
DROP COLUMN IF EXISTS security_q1,
DROP COLUMN IF EXISTS security_q2,
DROP COLUMN IF EXISTS security_q3,
DROP COLUMN IF EXISTS security_q4,
DROP COLUMN IF EXISTS security_accepted_at;

-- ============================================================================
-- YARDIMCI SQL: Test Verisi Temizleme
-- ============================================================================
-- Asagidaki SQL'i Supabase Dashboard > SQL Editor'de calistirarak
-- belirli bir subenin guvenlik verilerini temizleyebilirsiniz.
-- Bu, "Hayir" cevabi verildikten sonra formun tekrar gelmesini saglar.
--
-- KULLANIM:
-- 1. SUBE_ID_BURAYA yerine gercek sube ID'sini yazin
-- 2. SQL Editor'de calistirin
--
-- UPDATE customer_branches
-- SET security_q1 = NULL,
--     security_q2 = NULL,
--     security_q3 = NULL,
--     security_q4 = NULL,
--     security_accepted_at = NULL
-- WHERE id = 'SUBE_ID_BURAYA';
--
-- TUM SUBELERIN GUVENLIK VERILERINI TEMIZLEMEK ICIN:
-- (DIKKAT: Sadece test ortaminda kullanin!)
--
-- UPDATE customer_branches
-- SET security_q1 = NULL,
--     security_q2 = NULL,
--     security_q3 = NULL,
--     security_q4 = NULL,
--     security_accepted_at = NULL;
-- ============================================================================
