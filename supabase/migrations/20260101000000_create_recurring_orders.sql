-- =============================================
-- Rutin (Tekrarlayan) Sipariş Tabloları
-- =============================================

-- Rutin siparişler ana tablosu
CREATE TABLE IF NOT EXISTS recurring_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    dealer_id UUID REFERENCES dealers(id) ON DELETE SET NULL,
    customer_branch_id UUID REFERENCES customer_branches(id) ON DELETE SET NULL,

    -- Zamanlama bilgileri
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Pazar, 1=Pazartesi, ... 6=Cumartesi
    delivery_time VARCHAR(20), -- Örn: "09:00-12:00", "12:00-15:00"

    -- Sipariş detayları
    payment_method VARCHAR(50) DEFAULT 'cash',
    notes TEXT,

    -- Durum yönetimi
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),

    -- Takip ve istatistik
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    next_order_date DATE, -- Bir sonraki otomatik sipariş tarihi
    last_order_date DATE, -- En son sipariş verilme tarihi
    total_orders_created INTEGER DEFAULT 0 -- Toplam oluşturulan sipariş sayısı
);

-- Rutin sipariş kalemleri
CREATE TABLE IF NOT EXISTS recurring_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recurring_order_id UUID NOT NULL REFERENCES recurring_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_recurring_orders_customer ON recurring_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_status ON recurring_orders(status);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_next_date ON recurring_orders(next_order_date);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_dealer ON recurring_orders(dealer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_orders_branch ON recurring_orders(customer_branch_id);
CREATE INDEX IF NOT EXISTS idx_recurring_items_order ON recurring_order_items(recurring_order_id);

-- RLS (Row Level Security) Politikaları
ALTER TABLE recurring_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_order_items ENABLE ROW LEVEL SECURITY;

-- Tüm kullanıcılar okuyabilir (geliştirme aşaması için)
CREATE POLICY "recurring_orders_select" ON recurring_orders FOR SELECT USING (true);
CREATE POLICY "recurring_orders_insert" ON recurring_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "recurring_orders_update" ON recurring_orders FOR UPDATE USING (true);
CREATE POLICY "recurring_orders_delete" ON recurring_orders FOR DELETE USING (true);

CREATE POLICY "recurring_order_items_select" ON recurring_order_items FOR SELECT USING (true);
CREATE POLICY "recurring_order_items_insert" ON recurring_order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "recurring_order_items_update" ON recurring_order_items FOR UPDATE USING (true);
CREATE POLICY "recurring_order_items_delete" ON recurring_order_items FOR DELETE USING (true);

-- Yorum
COMMENT ON TABLE recurring_orders IS 'Müşterilerin haftalık tekrarlayan siparişleri';
COMMENT ON TABLE recurring_order_items IS 'Rutin siparişlerin ürün kalemleri';
COMMENT ON COLUMN recurring_orders.day_of_week IS '0=Pazar, 1=Pazartesi, 2=Salı, 3=Çarşamba, 4=Perşembe, 5=Cuma, 6=Cumartesi';
COMMENT ON COLUMN recurring_orders.status IS 'active: Aktif, paused: Duraklatılmış, cancelled: İptal edilmiş';
