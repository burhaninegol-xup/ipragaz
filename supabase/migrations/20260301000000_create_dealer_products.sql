-- Bayilerin sattığı ürünleri takip eden tablo
-- Kayıt yoksa ürün varsayılan olarak aktif sayılır
-- is_active = false ise bayi bu ürünü satmıyor

CREATE TABLE IF NOT EXISTS "public"."dealer_products" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "dealer_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    CONSTRAINT "dealer_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dealer_products_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE CASCADE,
    CONSTRAINT "dealer_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE,
    CONSTRAINT "dealer_products_unique" UNIQUE ("dealer_id", "product_id")
);

ALTER TABLE "public"."dealer_products" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dealer_products_all" ON "public"."dealer_products";
CREATE POLICY "dealer_products_all" ON "public"."dealer_products" FOR ALL USING (true) WITH CHECK (true);
