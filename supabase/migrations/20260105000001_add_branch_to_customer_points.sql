-- customer_points tablosuna sube referansi ekle
-- NULL = ana musteri hesabinda, UUID = belirli subede

ALTER TABLE customer_points
ADD COLUMN IF NOT EXISTS customer_branch_id UUID REFERENCES customer_branches(id) ON DELETE SET NULL;

-- Sube bazli sorgular icin index
CREATE INDEX IF NOT EXISTS idx_customer_points_branch ON customer_points(customer_branch_id);

-- Eski unique constraint'i kaldir (varsa)
ALTER TABLE customer_points DROP CONSTRAINT IF EXISTS customer_points_customer_id_order_id_key;

-- Yeni constraint: Her siparis icin tek puan kaydı
ALTER TABLE customer_points ADD CONSTRAINT customer_points_order_id_unique UNIQUE(order_id);

COMMENT ON COLUMN customer_points.customer_branch_id IS 'Puanin toplandigi sube (NULL=ana musteri hesabi)';
