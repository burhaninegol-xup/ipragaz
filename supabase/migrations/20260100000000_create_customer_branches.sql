-- =============================================
-- Müşteri Şubeleri Tablosu
-- =============================================

CREATE TABLE IF NOT EXISTS customer_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city_id UUID REFERENCES cities(id),
    district_id UUID REFERENCES districts(id),
    neighborhood_id UUID REFERENCES neighborhoods(id),
    phone VARCHAR(20),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_customer_branches_customer ON customer_branches(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_branches_city ON customer_branches(city_id);
CREATE INDEX IF NOT EXISTS idx_customer_branches_district ON customer_branches(district_id);

-- RLS
ALTER TABLE customer_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_branches_select" ON customer_branches FOR SELECT USING (true);
CREATE POLICY "customer_branches_insert" ON customer_branches FOR INSERT WITH CHECK (true);
CREATE POLICY "customer_branches_update" ON customer_branches FOR UPDATE USING (true);
CREATE POLICY "customer_branches_delete" ON customer_branches FOR DELETE USING (true);

COMMENT ON TABLE customer_branches IS 'Müşteri şubeleri/lokasyonları';
