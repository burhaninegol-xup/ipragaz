-- =====================================================
-- RLS STANDARDIZASYONU
-- Tum tablolarda tutarli RLS politikalari
-- Proje Supabase Auth kullanmadigi icin genis politikalar
-- =====================================================

-- 1. CART_ITEMS
ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON "public"."cart_items" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."cart_items" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. CUSTOMER_ADDRESSES
ALTER TABLE "public"."customer_addresses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON "public"."customer_addresses" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."customer_addresses" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. CUSTOMER_PRICES
ALTER TABLE "public"."customer_prices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON "public"."customer_prices" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."customer_prices" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. CUSTOMERS
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON "public"."customers" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."customers" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. DEALERS
ALTER TABLE "public"."dealers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON "public"."dealers" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."dealers" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. ORDER_ITEMS
ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON "public"."order_items" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."order_items" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. ORDERS
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON "public"."orders" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."orders" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. PRODUCTS
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON "public"."products" FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON "public"."products" FOR ALL TO authenticated USING (true) WITH CHECK (true);
