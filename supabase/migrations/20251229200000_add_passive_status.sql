-- Offer status'e 'passive' ekle

-- Mevcut constraint'i kaldir
ALTER TABLE "public"."offers" DROP CONSTRAINT IF EXISTS "offers_status_check";

-- Yeni constraint ekle ('passive' dahil)
ALTER TABLE "public"."offers"
ADD CONSTRAINT "offers_status_check"
CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'requested', 'passive'));
