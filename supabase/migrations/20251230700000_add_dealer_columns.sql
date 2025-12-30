-- Dealers tablosuna eksik kolonları ekle

ALTER TABLE dealers
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100),
ADD COLUMN IF NOT EXISTS tax_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Yorum ekle
COMMENT ON COLUMN dealers.owner_name IS 'Bayi yetkili adı';
COMMENT ON COLUMN dealers.tax_office IS 'Vergi dairesi';
COMMENT ON COLUMN dealers.tax_number IS 'Vergi numarası';
COMMENT ON COLUMN dealers.email IS 'E-posta adresi';
COMMENT ON COLUMN dealers.address IS 'Açık adres';
