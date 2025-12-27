-- Fiyatlandirma turu ve indirim degeri kolonlari
-- pricing_type degerleri:
--   'fixed_discount' = Sabit Fiyat Indirimi (base_price - discount_value)
--   'fixed_price' = Sabit Fiyat (unit_price direkt kullanilir)
--   'percentage_discount' = Yuzdesel Indirim (base_price * (1 - discount_value/100))

ALTER TABLE offer_details
ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) DEFAULT 'fixed_price',
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(10,2) DEFAULT 0;

-- Mevcut verileri fixed_price olarak isaretle
UPDATE offer_details
SET pricing_type = 'fixed_price',
    discount_value = 0
WHERE pricing_type IS NULL;
