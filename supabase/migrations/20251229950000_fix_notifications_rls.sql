-- notifications RLS politikalarini duzelt
-- auth.uid() yerine herkesin erisebilecegi politikalar

-- Mevcut politikalari kaldir
DROP POLICY IF EXISTS "Users can view their notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Users can update their notifications" ON "public"."notifications";
DROP POLICY IF EXISTS "Users can delete their notifications" ON "public"."notifications";

-- Yeni politikalar - diger tablolarla tutarli
CREATE POLICY "Allow all for anon" ON "public"."notifications"
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated" ON "public"."notifications"
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
