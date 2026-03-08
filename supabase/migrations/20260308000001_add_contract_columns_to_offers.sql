-- Migration: Add contract acceptance columns to offers table
-- Date: 2026-03-08
-- Description: Teklif sozlesme onay bilgilerini saklamak icin yeni kolonlar

ALTER TABLE "public"."offers"
    ADD COLUMN IF NOT EXISTS "contract_text_snapshot" text,
    ADD COLUMN IF NOT EXISTS "contract_accepted" boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS "contract_accepted_at" timestamp with time zone;
