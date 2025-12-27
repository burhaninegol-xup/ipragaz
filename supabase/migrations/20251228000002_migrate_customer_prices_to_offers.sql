-- Migration: Migrate customer_prices data to offers
-- Date: 2025-12-28
-- Description: Mevcut customer_prices verilerini offers + offer_details tablolarina tasir

-- Step 1: customer_prices tablosundan benzersiz dealer-customer ciftleri icin offers olustur
INSERT INTO "public"."offers" (dealer_id, customer_id, status, notes, created_at, updated_at)
SELECT DISTINCT
    cp.dealer_id,
    cp.customer_id,
    'accepted' as status,
    'Mevcut fiyatlardan otomatik olarak olusturuldu' as notes,
    MIN(cp.created_at) as created_at,
    MAX(cp.updated_at) as updated_at
FROM "public"."customer_prices" cp
WHERE cp.is_active = true
  AND cp.dealer_id IS NOT NULL
  AND cp.customer_id IS NOT NULL
GROUP BY cp.dealer_id, cp.customer_id
ON CONFLICT DO NOTHING;

-- Step 2: customer_prices kayitlarini offer_details olarak ekle
INSERT INTO "public"."offer_details" (offer_id, product_id, unit_price, commitment_quantity, this_month_quantity, last_month_quantity, created_at)
SELECT
    o.id as offer_id,
    cp.product_id,
    cp.unit_price,
    COALESCE(cp.commitment_quantity, 0) as commitment_quantity,
    COALESCE(cp.this_month_quantity, 0) as this_month_quantity,
    COALESCE(cp.last_month_quantity, 0) as last_month_quantity,
    cp.created_at
FROM "public"."customer_prices" cp
INNER JOIN "public"."offers" o
    ON o.dealer_id = cp.dealer_id
    AND o.customer_id = cp.customer_id
    AND o.status = 'accepted'
WHERE cp.is_active = true
ON CONFLICT (offer_id, product_id) DO UPDATE SET
    unit_price = EXCLUDED.unit_price,
    commitment_quantity = EXCLUDED.commitment_quantity,
    this_month_quantity = EXCLUDED.this_month_quantity,
    last_month_quantity = EXCLUDED.last_month_quantity;

-- NOT: customer_prices tablosu simdilik yedek olarak kalacak
-- Ileride silinebilir: DROP TABLE IF EXISTS "public"."customer_prices";
