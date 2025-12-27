-- Bayi Login Sistemi için username ve password_hash kolonları

-- Dealers tablosuna username ve password_hash kolonları ekle
ALTER TABLE dealers
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(64);

-- Mevcut bayilere default username/password ata
-- SHA-256 hash of '123456' = 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
UPDATE dealers
SET username = code,
    password_hash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
WHERE username IS NULL;

-- NOT NULL constraint ekle (mevcut veriler güncellendikten sonra)
ALTER TABLE dealers
ALTER COLUMN username SET NOT NULL,
ALTER COLUMN password_hash SET NOT NULL;

-- Test bayisi ekle (şifre: 123456)
INSERT INTO dealers (name, code, city, district, phone, username, password_hash, is_active)
VALUES (
    'Ankara Merkez Bayi',
    'ANK001',
    'Ankara',
    'Çankaya',
    '5551112233',
    'ankarabayi',
    '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    true
)
ON CONFLICT (code) DO NOTHING;
