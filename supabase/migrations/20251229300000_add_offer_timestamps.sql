-- Teklif zaman damgalari kolonlari
-- price_updated_at: Bayi fiyat guncellediginde
-- accepted_at: Musteri teklifi kabul ettiginde
-- passived_at: Bayi teklifi pasife aldiginda
-- cancelled_at: Teklif iptal edildiginde

ALTER TABLE "public"."offers"
ADD COLUMN IF NOT EXISTS "price_updated_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "accepted_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "passived_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;

-- Kabul tarihi uzerinden sorgulama icin index
CREATE INDEX IF NOT EXISTS "offers_accepted_at_idx" ON "public"."offers" ("accepted_at");
