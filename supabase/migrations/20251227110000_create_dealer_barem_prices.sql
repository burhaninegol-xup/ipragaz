-- Migration: Create dealer_barem_prices table
-- Date: 2025-12-27
-- Description: Bayilerin urun bazinda baremli fiyatlarini saklar

-- Tablo olustur
CREATE TABLE IF NOT EXISTS "public"."dealer_barem_prices" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "dealer_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "min_quantity" integer NOT NULL,
    "max_quantity" integer NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "dealer_barem_prices_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dealer_barem_prices_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE CASCADE,
    CONSTRAINT "dealer_barem_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE,
    CONSTRAINT "dealer_barem_prices_unique" UNIQUE ("dealer_id", "product_id", "min_quantity", "max_quantity")
);

-- Indexler
CREATE INDEX IF NOT EXISTS "dealer_barem_prices_dealer_id_idx" ON "public"."dealer_barem_prices" ("dealer_id");
CREATE INDEX IF NOT EXISTS "dealer_barem_prices_product_id_idx" ON "public"."dealer_barem_prices" ("product_id");
CREATE INDEX IF NOT EXISTS "dealer_barem_prices_dealer_product_idx" ON "public"."dealer_barem_prices" ("dealer_id", "product_id");

-- RLS (Row Level Security)
ALTER TABLE "public"."dealer_barem_prices" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all for anon" ON "public"."dealer_barem_prices"
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON "public"."dealer_barem_prices"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE "public"."dealer_barem_prices" TO anon;
GRANT ALL ON TABLE "public"."dealer_barem_prices" TO authenticated;
GRANT ALL ON TABLE "public"."dealer_barem_prices" TO service_role;
