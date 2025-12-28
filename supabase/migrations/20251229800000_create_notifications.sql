-- Notifications tablosu - Real-time bildirimler icin

CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL,
    "user_type" varchar(20) NOT NULL,  -- 'dealer' veya 'customer'
    "offer_id" uuid,
    "action" varchar(50) NOT NULL,  -- created, accepted, rejected, etc.
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now(),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_offer_id_fkey" FOREIGN KEY ("offer_id")
        REFERENCES "public"."offers"("id") ON DELETE CASCADE
);

-- Indexler
CREATE INDEX IF NOT EXISTS "idx_notifications_user" ON "public"."notifications" ("user_id", "user_type", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "public"."notifications" ("created_at" DESC);

-- RLS (Row Level Security) politikalari
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;

-- Kullanicilar kendi bildirimlerini gorebilir
CREATE POLICY "Users can view their notifications"
ON "public"."notifications"
FOR SELECT
USING (user_id = auth.uid());

-- Kullanicilar kendi bildirimlerini guncelleyebilir (okundu isaretlemek icin)
CREATE POLICY "Users can update their notifications"
ON "public"."notifications"
FOR UPDATE
USING (user_id = auth.uid());

-- Kullanicilar kendi bildirimlerini silebilir
CREATE POLICY "Users can delete their notifications"
ON "public"."notifications"
FOR DELETE
USING (user_id = auth.uid());

-- Sistem (trigger) tarafindan bildirim ekleme icin - service_role kullanilacak
-- INSERT icin ayri bir policy gerekmiyor cunku trigger SECURITY DEFINER ile calisacak


-- offer_logs INSERT -> notifications INSERT trigger fonksiyonu
CREATE OR REPLACE FUNCTION create_notification_on_offer_log()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offer RECORD;
    v_title VARCHAR(255);
    v_message TEXT;
    v_customer_title VARCHAR(255);
    v_customer_message TEXT;
    v_dealer_title VARCHAR(255);
    v_dealer_message TEXT;
BEGIN
    -- Offer bilgilerini al (dealer_id ve customer_id icin)
    SELECT o.dealer_id, o.customer_id, c.name as customer_name, c.company_name, d.name as dealer_name
    INTO v_offer
    FROM offers o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN dealers d ON d.id = o.dealer_id
    WHERE o.id = NEW.offer_id;

    -- Eger offer bulunamazsa cik
    IF v_offer IS NULL THEN
        RETURN NEW;
    END IF;

    -- Action'a gore mesajlari belirle
    CASE NEW.action
        WHEN 'created', 'requested' THEN
            v_dealer_title := 'Yeni Teklif Talebi';
            v_dealer_message := COALESCE(v_offer.company_name, v_offer.customer_name, 'Bir musteri') || ' yeni teklif talebinde bulundu.';
            v_customer_title := 'Talebiniz Alindi';
            v_customer_message := 'Teklif talebiniz bayiye iletildi.';
        WHEN 'pending' THEN
            v_dealer_title := 'Teklif Gonderildi';
            v_dealer_message := COALESCE(v_offer.company_name, v_offer.customer_name, 'Musteriye') || ' teklif gonderildi.';
            v_customer_title := 'Teklifiniz Hazir!';
            v_customer_message := COALESCE(v_offer.dealer_name, 'Bayi') || ' size teklif gonderdi.';
        WHEN 'accepted' THEN
            v_dealer_title := 'Teklif Kabul Edildi!';
            v_dealer_message := COALESCE(v_offer.company_name, v_offer.customer_name, 'Musteri') || ' teklifinizi kabul etti.';
            v_customer_title := 'Teklif Onaylandi';
            v_customer_message := 'Teklifi kabul ettiniz.';
        WHEN 'rejected' THEN
            v_dealer_title := 'Teklif Reddedildi';
            v_dealer_message := COALESCE(v_offer.company_name, v_offer.customer_name, 'Musteri') || ' teklifinizi reddetti.';
            v_customer_title := 'Teklif Reddedildi';
            v_customer_message := 'Teklifi reddettiniz.';
        WHEN 'cancelled' THEN
            v_dealer_title := 'Teklif Iptal Edildi';
            v_dealer_message := 'Teklif iptal edildi.';
            v_customer_title := 'Teklif Iptal Edildi';
            v_customer_message := 'Teklif iptal edildi.';
        WHEN 'price_updated' THEN
            v_dealer_title := 'Fiyat Guncellendi';
            v_dealer_message := 'Teklif fiyatlari guncellendi.';
            v_customer_title := 'Fiyat Guncellendi';
            v_customer_message := COALESCE(v_offer.dealer_name, 'Bayi') || ' teklif fiyatlarini guncelledi.';
        WHEN 'passived' THEN
            v_dealer_title := 'Teklif Pasife Alindi';
            v_dealer_message := 'Teklif pasif duruma alindi.';
            v_customer_title := 'Teklif Pasif';
            v_customer_message := 'Teklifiniz pasif duruma alindi.';
        WHEN 'activated' THEN
            v_dealer_title := 'Teklif Aktif Edildi';
            v_dealer_message := 'Teklif tekrar aktif edildi.';
            v_customer_title := 'Teklif Aktif';
            v_customer_message := 'Teklifiniz tekrar aktif edildi.';
        ELSE
            v_dealer_title := 'Teklif Guncellendi';
            v_dealer_message := 'Teklifte degisiklik yapildi.';
            v_customer_title := 'Teklif Guncellendi';
            v_customer_message := 'Teklifinizde degisiklik yapildi.';
    END CASE;

    -- Bayi icin bildirim (musteri aksiyonlarinda)
    IF NEW.actor_type = 'customer' AND v_offer.dealer_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, user_type, offer_id, action, title, message)
        VALUES (v_offer.dealer_id, 'dealer', NEW.offer_id, NEW.action, v_dealer_title, v_dealer_message);
    END IF;

    -- Musteri icin bildirim (bayi aksiyonlarinda)
    IF NEW.actor_type = 'dealer' AND v_offer.customer_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, user_type, offer_id, action, title, message)
        VALUES (v_offer.customer_id, 'customer', NEW.offer_id, NEW.action, v_customer_title, v_customer_message);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger olustur
DROP TRIGGER IF EXISTS trigger_create_notification_on_offer_log ON offer_logs;
CREATE TRIGGER trigger_create_notification_on_offer_log
    AFTER INSERT ON offer_logs
    FOR EACH ROW
    EXECUTE FUNCTION create_notification_on_offer_log();

-- Realtime icin notifications tablosunu etkinlestir
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
