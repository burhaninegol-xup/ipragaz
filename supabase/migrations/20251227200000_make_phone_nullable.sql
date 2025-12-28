-- Phone alanini nullable yap ve unique constraint'i kaldir
ALTER TABLE customers
ALTER COLUMN phone DROP NOT NULL;

-- Unique constraint varsa kaldir
ALTER TABLE customers
DROP CONSTRAINT IF EXISTS customers_phone_unique;

-- Bos string olan phone degerlerini NULL yap
UPDATE customers
SET phone = NULL
WHERE phone = '' OR phone IS NULL;
