-- Migration: customer_phone_unique_and_new_columns
-- Description: Telefon numarasını UNIQUE yap ve yeni kolonlar ekle

-- 1. Telefon numarasını NOT NULL yap (eğer değilse)
DO $$
BEGIN
    ALTER TABLE customers ALTER COLUMN phone SET NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. Telefon için UNIQUE constraint ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'customers_phone_unique'
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT customers_phone_unique UNIQUE (phone);
    END IF;
END $$;

-- 3. VKN'yi nullable yap
DO $$
BEGIN
    ALTER TABLE customers ALTER COLUMN vkn DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 4. Yeni kolonları ekle
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sector VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tabela_unvani VARCHAR(255);
