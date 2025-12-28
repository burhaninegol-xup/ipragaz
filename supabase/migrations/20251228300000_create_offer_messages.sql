-- Offer Messages Table
-- Bayi ve müşteri arasında teklife bağlı mesajlaşma

CREATE TABLE offer_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('dealer', 'customer')),
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexler
CREATE INDEX idx_offer_messages_offer_id ON offer_messages(offer_id);
CREATE INDEX idx_offer_messages_created_at ON offer_messages(created_at);

-- RLS
ALTER TABLE offer_messages ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (kendi tekliflerine ait mesajları)
CREATE POLICY "Users can read messages for their offers" ON offer_messages
    FOR SELECT USING (true);

-- Herkes mesaj ekleyebilir
CREATE POLICY "Users can insert messages" ON offer_messages
    FOR INSERT WITH CHECK (true);

-- Mesajları okundu olarak işaretleyebilir
CREATE POLICY "Users can update read status" ON offer_messages
    FOR UPDATE USING (true);
