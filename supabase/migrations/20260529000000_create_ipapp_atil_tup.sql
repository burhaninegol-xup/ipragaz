-- Migration: İPApp Atıl (Boş) Tüp İade modülü
-- Date: 2026-05-29
-- Description: Bu modülü kullananlar İŞYERİM müşterileri veya bayiler DEĞİL; ayrı bir
--              uygulama olan "İPApp" kullanıcılarıdır. Bu nedenle giriş/kullanıcı
--              bilgileri ve form kayıtları AYRI tablolarda tutulur.

-- =====================================================================
-- 1) İPApp kullanıcıları (telefon + OTP ile giriş yapan ayrı kullanıcı kümesi)
-- =====================================================================
CREATE TABLE IF NOT EXISTS "public"."ipapp_users" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "phone" varchar(20) NOT NULL,
    "name" varchar(150),
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "ipapp_users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ipapp_users_phone_unique" UNIQUE ("phone")
);

ALTER TABLE "public"."ipapp_users" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON "public"."ipapp_users";
DROP POLICY IF EXISTS "Allow all for authenticated" ON "public"."ipapp_users";
CREATE POLICY "Allow all for anon" ON "public"."ipapp_users"
    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."ipapp_users"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE "public"."ipapp_users" TO anon;
GRANT ALL ON TABLE "public"."ipapp_users" TO authenticated;
GRANT ALL ON TABLE "public"."ipapp_users" TO service_role;

-- =====================================================================
-- 2) Boş (atıl) tüp iade bildirimleri (form kayıtları)
-- =====================================================================
CREATE TABLE IF NOT EXISTS "public"."atil_tup_bildirimleri" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "ipapp_user_id" uuid,
    "phone" varchar(20),
    "contact_name" varchar(150) NOT NULL,
    "city" varchar(100),
    "district" varchar(100),
    "dealer_id" uuid,
    "dealer_name" varchar(200),
    "return_address_1" text NOT NULL,
    "return_address_2" text,
    -- Tüp satırları: [{ brand, type, deposit, count }, ...]
    "tubes" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "description" text,
    "status" varchar(30) NOT NULL DEFAULT 'pending',
    "created_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "atil_tup_bildirimleri_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "atil_tup_bildirimleri_user_fk" FOREIGN KEY ("ipapp_user_id")
        REFERENCES "public"."ipapp_users" ("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "atil_tup_bildirimleri_user_idx"
    ON "public"."atil_tup_bildirimleri" ("ipapp_user_id");
CREATE INDEX IF NOT EXISTS "atil_tup_bildirimleri_created_idx"
    ON "public"."atil_tup_bildirimleri" ("created_at" DESC);

ALTER TABLE "public"."atil_tup_bildirimleri" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON "public"."atil_tup_bildirimleri";
DROP POLICY IF EXISTS "Allow all for authenticated" ON "public"."atil_tup_bildirimleri";
CREATE POLICY "Allow all for anon" ON "public"."atil_tup_bildirimleri"
    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."atil_tup_bildirimleri"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE "public"."atil_tup_bildirimleri" TO anon;
GRANT ALL ON TABLE "public"."atil_tup_bildirimleri" TO authenticated;
GRANT ALL ON TABLE "public"."atil_tup_bildirimleri" TO service_role;
