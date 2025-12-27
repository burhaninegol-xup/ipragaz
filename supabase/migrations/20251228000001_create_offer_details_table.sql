-- Migration: Create offer_details table
-- Date: 2025-12-28
-- Description: Teklif detaylarini (urun fiyatlari) saklayan tablo

-- Tablo olustur
CREATE TABLE IF NOT EXISTS "public"."offer_details" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "commitment_quantity" integer DEFAULT 0,
    "this_month_quantity" integer DEFAULT 0,
    "last_month_quantity" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "offer_details_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "offer_details_offer_id_fkey" FOREIGN KEY ("offer_id")
        REFERENCES "public"."offers"("id") ON DELETE CASCADE,
    CONSTRAINT "offer_details_product_id_fkey" FOREIGN KEY ("product_id")
        REFERENCES "public"."products"("id") ON DELETE CASCADE,
    CONSTRAINT "offer_details_unique" UNIQUE ("offer_id", "product_id")
);

-- Indexler
CREATE INDEX IF NOT EXISTS "offer_details_offer_id_idx" ON "public"."offer_details" ("offer_id");
CREATE INDEX IF NOT EXISTS "offer_details_product_id_idx" ON "public"."offer_details" ("product_id");

-- RLS (Row Level Security)
ALTER TABLE "public"."offer_details" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all for anon" ON "public"."offer_details"
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON "public"."offer_details"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE "public"."offer_details" TO anon;
GRANT ALL ON TABLE "public"."offer_details" TO authenticated;
GRANT ALL ON TABLE "public"."offer_details" TO service_role;
