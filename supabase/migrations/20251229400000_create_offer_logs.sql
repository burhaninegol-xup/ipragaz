-- Offer Logs tablosu - Tekliflerdeki tum degisiklikleri takip eder

CREATE TABLE IF NOT EXISTS "public"."offer_logs" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" uuid NOT NULL,
    "action" varchar(50) NOT NULL,  -- 'created', 'price_updated', 'accepted', 'rejected', 'cancelled', 'passived', 'activated', 'requested'
    "actor_type" varchar(20) NOT NULL,  -- 'dealer' veya 'customer'
    "actor_id" uuid,  -- dealer_id veya customer_id
    "actor_name" varchar(255),  -- Goruntuleme icin isim
    "details" jsonb,  -- Ek bilgiler (eski/yeni degerler vs)
    "created_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "offer_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "offer_logs_offer_id_fkey" FOREIGN KEY ("offer_id")
        REFERENCES "public"."offers"("id") ON DELETE CASCADE
);

-- Indexler
CREATE INDEX IF NOT EXISTS "offer_logs_offer_id_idx" ON "public"."offer_logs" ("offer_id");
CREATE INDEX IF NOT EXISTS "offer_logs_created_at_idx" ON "public"."offer_logs" ("created_at" DESC);

-- RLS (Row Level Security) politikalari
ALTER TABLE "public"."offer_logs" ENABLE ROW LEVEL SECURITY;

-- Bayiler kendi tekliflerinin loglarini gorebilir
CREATE POLICY "Dealers can view their offer logs"
ON "public"."offer_logs"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."offers"
        WHERE "offers"."id" = "offer_logs"."offer_id"
        AND "offers"."dealer_id" = auth.uid()
    )
);

-- Musteriler kendi tekliflerinin loglarini gorebilir
CREATE POLICY "Customers can view their offer logs"
ON "public"."offer_logs"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."offers"
        WHERE "offers"."id" = "offer_logs"."offer_id"
        AND "offers"."customer_id" = auth.uid()
    )
);

-- Bayiler log ekleyebilir (kendi teklifleri icin)
CREATE POLICY "Dealers can insert offer logs"
ON "public"."offer_logs"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."offers"
        WHERE "offers"."id" = "offer_logs"."offer_id"
        AND "offers"."dealer_id" = auth.uid()
    )
);

-- Musteriler log ekleyebilir (kendi teklifleri icin)
CREATE POLICY "Customers can insert offer logs"
ON "public"."offer_logs"
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "public"."offers"
        WHERE "offers"."id" = "offer_logs"."offer_id"
        AND "offers"."customer_id" = auth.uid()
    )
);
