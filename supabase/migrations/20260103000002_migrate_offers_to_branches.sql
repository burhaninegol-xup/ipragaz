-- Migration: Mevcut teklifleri varsayilan subeye atama
-- Geriye donuk uyumluluk icin customer_branch_id bos olan teklifleri
-- musterinin varsayilan subesine bagla

-- Mevcut teklifleri varsayilan subeye ata
UPDATE offers o
SET customer_branch_id = (
    SELECT cb.id
    FROM customer_branches cb
    WHERE cb.customer_id = o.customer_id
    AND cb.is_default = true
    AND cb.is_active = true
    LIMIT 1
)
WHERE o.customer_branch_id IS NULL;

-- Eger varsayilan sube yoksa, ilk aktif subeyi ata
UPDATE offers o
SET customer_branch_id = (
    SELECT cb.id
    FROM customer_branches cb
    WHERE cb.customer_id = o.customer_id
    AND cb.is_active = true
    ORDER BY cb.created_at ASC
    LIMIT 1
)
WHERE o.customer_branch_id IS NULL;

-- Log: Kac teklif guncellendi
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM offers WHERE customer_branch_id IS NOT NULL;
    RAISE NOTICE 'Toplam % teklif sube ile iliskilendirildi', updated_count;
END $$;
