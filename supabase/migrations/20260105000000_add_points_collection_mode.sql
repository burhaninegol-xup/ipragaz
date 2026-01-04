-- customer_branches tablosuna puan toplama tercihi ekle
-- customer: puanlar ana musteri hesabinda toplanir (varsayilan)
-- branch: puanlar bu subede toplanir

ALTER TABLE customer_branches
ADD COLUMN IF NOT EXISTS points_collection_mode VARCHAR(20) DEFAULT 'customer';

COMMENT ON COLUMN customer_branches.points_collection_mode IS 'Puan toplama tercihi: customer=ana hesapta, branch=subede';
