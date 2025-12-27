-- Migration: Update order statuses to new values
-- Date: 2025-12-27

-- 1. Mevcut status degerlerini yeni degerlere donustur
UPDATE orders SET status = 'waiting_for_assignment' WHERE status = 'pending';
UPDATE orders SET status = 'on_the_way' WHERE status = 'confirmed';
UPDATE orders SET status = 'completed' WHERE status = 'delivered';
-- cancelled zaten ayni kaliyor

-- 2. Default degeri guncelle
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'waiting_for_assignment';

-- 3. Mevcut kayitlara rastgele status ata (test icin)
UPDATE orders SET status = (
    CASE (floor(random() * 4)::int)
        WHEN 0 THEN 'waiting_for_assignment'
        WHEN 1 THEN 'on_the_way'
        WHEN 2 THEN 'completed'
        ELSE 'cancelled'
    END
);
