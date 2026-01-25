-- Migration: Create retail_prices_by_city table
-- Date: 2026-01-25
-- Description: Il bazinda perakende fiyatlarini saklar

-- Tablo olustur
CREATE TABLE IF NOT EXISTS "public"."retail_prices_by_city" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "product_id" uuid NOT NULL,
    "city_id" uuid NOT NULL,
    "retail_price" numeric(10,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "retail_prices_by_city_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "retail_prices_by_city_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE,
    CONSTRAINT "retail_prices_by_city_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE CASCADE,
    CONSTRAINT "retail_prices_by_city_unique" UNIQUE ("product_id", "city_id")
);

-- Indexler
CREATE INDEX IF NOT EXISTS "retail_prices_by_city_product_id_idx" ON "public"."retail_prices_by_city" ("product_id");
CREATE INDEX IF NOT EXISTS "retail_prices_by_city_city_id_idx" ON "public"."retail_prices_by_city" ("city_id");
CREATE INDEX IF NOT EXISTS "retail_prices_by_city_product_city_idx" ON "public"."retail_prices_by_city" ("product_id", "city_id");

-- RLS (Row Level Security)
ALTER TABLE "public"."retail_prices_by_city" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all for anon" ON "public"."retail_prices_by_city"
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON "public"."retail_prices_by_city"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE "public"."retail_prices_by_city" TO anon;
GRANT ALL ON TABLE "public"."retail_prices_by_city" TO authenticated;
GRANT ALL ON TABLE "public"."retail_prices_by_city" TO service_role;

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_retail_prices_by_city_updated_at ON "public"."retail_prices_by_city";
CREATE TRIGGER update_retail_prices_by_city_updated_at
    BEFORE UPDATE ON "public"."retail_prices_by_city"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
