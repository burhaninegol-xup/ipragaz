-- =====================================================
-- DEALER DISTRICTS (MIKRO PAZAR) TABLOSU
-- Bayilerin hizmet verebileceği ilçeleri tanımlar
-- Many-to-Many ilişki: dealers <-> districts
-- =====================================================

CREATE TABLE IF NOT EXISTS "public"."dealer_districts" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "dealer_id" uuid NOT NULL,
    "district_id" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "dealer_districts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dealer_districts_dealer_id_fkey"
        FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE CASCADE,
    CONSTRAINT "dealer_districts_district_id_fkey"
        FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE CASCADE,
    CONSTRAINT "dealer_districts_unique" UNIQUE ("dealer_id", "district_id")
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS "dealer_districts_dealer_id_idx"
    ON "public"."dealer_districts" ("dealer_id");

CREATE INDEX IF NOT EXISTS "dealer_districts_district_id_idx"
    ON "public"."dealer_districts" ("district_id");

CREATE INDEX IF NOT EXISTS "dealer_districts_dealer_district_idx"
    ON "public"."dealer_districts" ("dealer_id", "district_id");

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE "public"."dealer_districts" ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
DROP POLICY IF EXISTS "dealer_districts_read_all" ON "public"."dealer_districts";
CREATE POLICY "dealer_districts_read_all" ON "public"."dealer_districts"
    FOR SELECT TO anon, authenticated
    USING (true);

-- Herkes yazabilir (basit yetkilendirme)
DROP POLICY IF EXISTS "dealer_districts_write_all" ON "public"."dealer_districts";
CREATE POLICY "dealer_districts_write_all" ON "public"."dealer_districts"
    FOR ALL TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Service role tam yetki
DROP POLICY IF EXISTS "dealer_districts_service_all" ON "public"."dealer_districts";
CREATE POLICY "dealer_districts_service_all" ON "public"."dealer_districts"
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- GRANTS
-- =====================================================
GRANT ALL ON TABLE "public"."dealer_districts" TO anon;
GRANT ALL ON TABLE "public"."dealer_districts" TO authenticated;
GRANT ALL ON TABLE "public"."dealer_districts" TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE "public"."dealer_districts" IS 'Bayilerin hizmet verebileceği ilçeler (Mikro Pazar)';
COMMENT ON COLUMN "public"."dealer_districts"."dealer_id" IS 'Bayi ID (dealers tablosuna FK)';
COMMENT ON COLUMN "public"."dealer_districts"."district_id" IS 'İlçe ID (districts tablosuna FK)';
