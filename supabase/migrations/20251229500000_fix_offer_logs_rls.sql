-- offer_logs RLS politikalarini duzelt
-- Mevcut politikalari kaldir
DROP POLICY IF EXISTS "Dealers can view their offer logs" ON "public"."offer_logs";
DROP POLICY IF EXISTS "Customers can view their offer logs" ON "public"."offer_logs";
DROP POLICY IF EXISTS "Dealers can insert offer logs" ON "public"."offer_logs";
DROP POLICY IF EXISTS "Customers can insert offer logs" ON "public"."offer_logs";

-- Daha esnek okuma politikasi - authenticated kullanicilar okuyabilir
CREATE POLICY "Authenticated users can view offer logs"
ON "public"."offer_logs"
FOR SELECT
TO authenticated
USING (true);

-- Daha esnek ekleme politikasi - authenticated kullanicilar ekleyebilir
CREATE POLICY "Authenticated users can insert offer logs"
ON "public"."offer_logs"
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Anon kullanicilar icin de politika (eger auth kullanilmiyorsa)
CREATE POLICY "Anon users can view offer logs"
ON "public"."offer_logs"
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon users can insert offer logs"
ON "public"."offer_logs"
FOR INSERT
TO anon
WITH CHECK (true);
