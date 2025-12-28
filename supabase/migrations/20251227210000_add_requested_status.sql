-- Migration: Add 'requested' status to offers table
-- Date: 2025-12-27
-- Description: Musteri tarafindan teklif talebi icin yeni status ekleme

-- Mevcut CHECK constraint'i kaldir
ALTER TABLE "public"."offers"
DROP CONSTRAINT IF EXISTS "offers_status_check";

-- Yeni CHECK constraint olustur ('requested' eklendi)
ALTER TABLE "public"."offers"
ADD CONSTRAINT "offers_status_check"
CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'requested'));

-- Status index'ini guncelle (index zaten var, degisiklik gerekmiyor)
-- CREATE INDEX IF NOT EXISTS "offers_status_idx" ON "public"."offers" ("status");
