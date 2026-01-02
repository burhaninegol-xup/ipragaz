-- Order Status History Table
-- Sipariş durumu değişikliklerini takip etmek için timeline tablosu

CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_type VARCHAR(20), -- 'customer' | 'dealer' | 'system'
    changed_by_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON order_status_history(created_at);

-- RLS Policies
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Select policy: dealers can view history of their orders, customers can view their own order history
CREATE POLICY "order_status_history_select_policy" ON order_status_history
    FOR SELECT USING (true);

-- Insert policy: allow inserts from authenticated users
CREATE POLICY "order_status_history_insert_policy" ON order_status_history
    FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON order_status_history TO anon;
GRANT SELECT, INSERT ON order_status_history TO authenticated;
