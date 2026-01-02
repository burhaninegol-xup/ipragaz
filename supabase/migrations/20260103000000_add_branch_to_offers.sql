-- Migration: Sube bazli teklif sistemi
-- offers tablosuna customer_branch_id ve parent_offer_id ekleme

-- 1. Yeni kolonlar ekle
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS customer_branch_id UUID REFERENCES customer_branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS parent_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL;

-- 2. Yorum ekle
COMMENT ON COLUMN offers.customer_branch_id IS 'Teklifin verildiği şube. NULL ise tüm şubeler için geçerli (geriye uyumluluk)';
COMMENT ON COLUMN offers.parent_offer_id IS 'Genişletme ile oluşturulan tekliflerin kaynak teklifi';

-- 3. Performans için index'ler
CREATE INDEX IF NOT EXISTS idx_offers_branch ON offers(dealer_id, customer_branch_id, status);
CREATE INDEX IF NOT EXISTS idx_offers_parent ON offers(parent_offer_id);
CREATE INDEX IF NOT EXISTS idx_offers_customer_branch ON offers(customer_id, customer_branch_id);

-- 4. RLS politikası güncelle (şube bazlı erişim)
-- Mevcut politikalar korunuyor, branch_id filtreleme uygulama seviyesinde yapılacak
