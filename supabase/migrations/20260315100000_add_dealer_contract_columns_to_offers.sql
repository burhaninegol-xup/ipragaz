-- Bayi teklif sözleşme onay bilgilerini saklamak için yeni kolonlar
ALTER TABLE "public"."offers"
    ADD COLUMN IF NOT EXISTS "dealer_contract_text_snapshot" text,
    ADD COLUMN IF NOT EXISTS "dealer_contract_accepted" boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS "dealer_contract_accepted_at" timestamp with time zone;

-- Bayi teklif sözleşme metni seed
INSERT INTO "public"."system_settings" ("setting_key", "setting_value")
VALUES (
    'dealer_offer_contract_text',
    'İşbu teklif ile belirtilen ürünler için müşteriye fiyat teklifi sunulmaktadır. Teklif edilen fiyatlar, geçerlilik süresi boyunca bağlayıcıdır. Teklif süresi dolduğunda veya müşteri tarafından kabul ya da red edildiğinde teklif sonlanır. Bayi olarak, sunulan fiyatların iPragaz perakende fiyat politikasına uygun olduğunu ve müşteriye doğru bilgi verildiğini taahhüt edersiniz. Bu teklif, iPragaz bayi sözleşmesi kapsamında değerlendirilecektir.'
)
ON CONFLICT ("setting_key") DO NOTHING;
