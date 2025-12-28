-- Mesaj bildirimi trigger fonksiyonu
-- Yeni mesaj geldiginde karsi tarafa bildirim olusturur

CREATE OR REPLACE FUNCTION create_notification_on_new_message()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offer RECORD;
    v_recipient_id UUID;
    v_recipient_type VARCHAR(20);
    v_sender_name VARCHAR(255);
BEGIN
    -- Offer + sender bilgilerini al
    SELECT
        o.dealer_id,
        o.customer_id,
        c.name as customer_name,
        c.company_name,
        d.name as dealer_name
    INTO v_offer
    FROM offers o
    LEFT JOIN customers c ON c.id = o.customer_id
    LEFT JOIN dealers d ON d.id = o.dealer_id
    WHERE o.id = NEW.offer_id;

    IF v_offer IS NULL THEN
        RETURN NEW;
    END IF;

    -- Aliciyi ve gonderen adini belirle
    IF NEW.sender_type = 'dealer' THEN
        v_recipient_id := v_offer.customer_id;
        v_recipient_type := 'customer';
        v_sender_name := COALESCE(v_offer.dealer_name, 'Bayi');
    ELSE
        v_recipient_id := v_offer.dealer_id;
        v_recipient_type := 'dealer';
        v_sender_name := COALESCE(v_offer.company_name, v_offer.customer_name, 'Musteri');
    END IF;

    -- Bildirim olustur
    INSERT INTO notifications (user_id, user_type, offer_id, action, title, message)
    VALUES (
        v_recipient_id,
        v_recipient_type,
        NEW.offer_id,
        'message',
        'Yeni Mesaj',
        v_sender_name || ': ' || LEFT(NEW.message, 80)
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger olustur
DROP TRIGGER IF EXISTS trigger_create_notification_on_message ON offer_messages;
CREATE TRIGGER trigger_create_notification_on_message
    AFTER INSERT ON offer_messages
    FOR EACH ROW
    EXECUTE FUNCTION create_notification_on_new_message();
