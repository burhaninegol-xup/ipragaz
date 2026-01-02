-- Migration: Teklif genisletme talepleri tablosu
-- Musteri mevcut bir teklifi baska subesine de uygulatmak istediginde

-- UUID extension'i etkinlestir (yoksa)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS offer_extension_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Kaynak teklif
    original_offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,

    -- Talep edilen sube
    requested_branch_id UUID NOT NULL REFERENCES customer_branches(id) ON DELETE CASCADE,

    -- Talep eden kullanici
    requested_by_user_id UUID REFERENCES customer_users(id) ON DELETE SET NULL,

    -- Durum: pending, approved, rejected
    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    -- Bayi tarafindan red/onay notu
    dealer_notes TEXT,

    -- Onaylanan teklif (onaylandiginda olusturulan yeni offer)
    approved_offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,

    -- Bayi cevap zamani
    dealer_response_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ayni teklif icin ayni subeye birden fazla bekleyen talep olmasin
    CONSTRAINT unique_pending_request UNIQUE (original_offer_id, requested_branch_id, status)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_extension_requests_offer ON offer_extension_requests(original_offer_id);
CREATE INDEX IF NOT EXISTS idx_extension_requests_branch ON offer_extension_requests(requested_branch_id);
CREATE INDEX IF NOT EXISTS idx_extension_requests_status ON offer_extension_requests(status);

-- Yorumlar
COMMENT ON TABLE offer_extension_requests IS 'Musteri mevcut teklifi baska subeye genisletme talepleri';
COMMENT ON COLUMN offer_extension_requests.status IS 'pending: Bayi cevabi bekleniyor, approved: Onaylandi, rejected: Reddedildi';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_offer_extension_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_offer_extension_requests_updated_at
    BEFORE UPDATE ON offer_extension_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_offer_extension_requests_updated_at();

-- RLS
ALTER TABLE offer_extension_requests ENABLE ROW LEVEL SECURITY;

-- Politikalar
CREATE POLICY "Authenticated users can view extension requests"
    ON offer_extension_requests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can create extension requests"
    ON offer_extension_requests FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update extension requests"
    ON offer_extension_requests FOR UPDATE
    TO authenticated
    USING (true);
