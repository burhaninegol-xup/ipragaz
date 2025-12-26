-- Müşteri doğum tarihi kolonu
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;
