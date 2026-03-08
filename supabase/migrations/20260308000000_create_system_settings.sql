-- Migration: Create system_settings table
-- Date: 2026-03-08
-- Description: Sistem ayarlarini key-value olarak saklayan tablo

-- Tablo olustur
CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "setting_key" varchar(100) NOT NULL,
    "setting_value" text,
    "updated_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "system_settings_key_unique" UNIQUE ("setting_key")
);

-- RLS (Row Level Security)
ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all for anon" ON "public"."system_settings"
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON "public"."system_settings"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON TABLE "public"."system_settings" TO anon;
GRANT ALL ON TABLE "public"."system_settings" TO authenticated;
GRANT ALL ON TABLE "public"."system_settings" TO service_role;

-- Seed: Teklif sozlesme metni
INSERT INTO "public"."system_settings" ("setting_key", "setting_value")
VALUES (
    'offer_contract_text',
    'Bu teklif talebi ile belirtilen urunler icin fiyat teklifi talep etmektesiniz. Teklif, bayiniz tarafindan degerlendirilecek olup baglayici bir siparis niteliginde degildir. Fiyatlar ve kosullar bayiniz tarafindan ayrica bildirilecektir.'
);
