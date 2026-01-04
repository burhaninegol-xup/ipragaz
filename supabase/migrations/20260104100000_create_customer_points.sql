-- Customer Points Table
-- Musteri puan gecmisi ve detayli puan kayitlari

CREATE TABLE IF NOT EXISTS customer_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
    points INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Bir siparis icin tek kayit olabilir
    UNIQUE(customer_id, order_id)
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_customer_points_customer ON customer_points(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_points_order ON customer_points(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_points_dealer ON customer_points(dealer_id);
CREATE INDEX IF NOT EXISTS idx_customer_points_created ON customer_points(created_at DESC);

-- RLS Politikalari
ALTER TABLE customer_points ENABLE ROW LEVEL SECURITY;

-- Okuma: Herkes gorebilir
CREATE POLICY "customer_points_select_policy" ON customer_points
    FOR SELECT USING (true);

-- Yazma: Insert yapilabilir
CREATE POLICY "customer_points_insert_policy" ON customer_points
    FOR INSERT WITH CHECK (true);

-- Guncelleme: Yapilabilir
CREATE POLICY "customer_points_update_policy" ON customer_points
    FOR UPDATE USING (true);

-- Silme: Yapilabilir
CREATE POLICY "customer_points_delete_policy" ON customer_points
    FOR DELETE USING (true);

COMMENT ON TABLE customer_points IS 'Musteri puan kazanim gecmisi';
COMMENT ON COLUMN customer_points.customer_id IS 'Puan kazanan musteri';
COMMENT ON COLUMN customer_points.order_id IS 'Puanin kazanildigi siparis';
COMMENT ON COLUMN customer_points.dealer_id IS 'Siparisi teslim eden bayi';
COMMENT ON COLUMN customer_points.points IS 'Kazanilan puan miktari';
COMMENT ON COLUMN customer_points.description IS 'Puan aciklamasi';
