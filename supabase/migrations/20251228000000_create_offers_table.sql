-- Migration: Create offers table
-- Date: 2025-12-28
-- Description: Bayi-musteri teklif iliskisini yoneten tablo

-- Tablo olustur
CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "dealer_id" uuid NOT NULL,
    "customer_id" uuid NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "offers_dealer_id_fkey" FOREIGN KEY ("dealer_id")
        REFERENCES "public"."dealers"("id") ON DELETE CASCADE,
    CONSTRAINT "offers_customer_id_fkey" FOREIGN KEY ("customer_id")
        REFERENCES "public"."customers"("id") ON DELETE CASCADE,
    CONSTRAINT "offers_status_check" CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled'))
);

-- Indexler
CREATE INDEX IF NOT EXISTS "offers_dealer_id_idx" ON "public"."offers" ("dealer_id");
CREATE INDEX IF NOT EXISTS "offers_customer_id_idx" ON "public"."offers" ("customer_id");
CREATE INDEX IF NOT EXISTS "offers_status_idx" ON "public"."offers" ("status");
CREATE INDEX IF NOT EXISTS "offers_dealer_status_idx" ON "public"."offers" ("dealer_id", "status");

-- RLS (Row Level Security)
ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all for anon" ON "public"."offers"
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON "public"."offers"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE "public"."offers" TO anon;
GRANT ALL ON TABLE "public"."offers" TO authenticated;
GRANT ALL ON TABLE "public"."offers" TO service_role;
