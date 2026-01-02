-- =============================================
-- Alt Kullanici (Sub-User) Sistemi
-- =============================================

-- 1. customer_users tablosu
CREATE TABLE IF NOT EXISTS customer_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'staff',  -- 'owner' | 'staff'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_customer_users_customer_id ON customer_users(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_users_phone ON customer_users(phone);
CREATE INDEX IF NOT EXISTS idx_customer_users_role ON customer_users(role);

-- 2. customer_user_branches tablosu (kullanici sube yetkileri)
CREATE TABLE IF NOT EXISTS customer_user_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES customer_branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_user_id, branch_id)
);

-- Indeksler
CREATE INDEX IF NOT EXISTS idx_cub_user_id ON customer_user_branches(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_cub_branch_id ON customer_user_branches(branch_id);

-- 3. RLS Politikalari
ALTER TABLE customer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_user_branches ENABLE ROW LEVEL SECURITY;

-- customer_users icin RLS
CREATE POLICY "customer_users_select_policy" ON customer_users
    FOR SELECT USING (true);

CREATE POLICY "customer_users_insert_policy" ON customer_users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "customer_users_update_policy" ON customer_users
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "customer_users_delete_policy" ON customer_users
    FOR DELETE USING (true);

-- customer_user_branches icin RLS
CREATE POLICY "cub_select_policy" ON customer_user_branches
    FOR SELECT USING (true);

CREATE POLICY "cub_insert_policy" ON customer_user_branches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "cub_delete_policy" ON customer_user_branches
    FOR DELETE USING (true);

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_users TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON customer_users TO authenticated;
GRANT SELECT, INSERT, DELETE ON customer_user_branches TO anon;
GRANT SELECT, INSERT, DELETE ON customer_user_branches TO authenticated;

-- 5. Mevcut musteriler icin otomatik owner kullanici olustur
INSERT INTO customer_users (customer_id, name, phone, role)
SELECT id, name, phone, 'owner'
FROM customers
WHERE phone IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM customer_users cu
    WHERE cu.customer_id = customers.id AND cu.role = 'owner'
  )
ON CONFLICT (phone) DO NOTHING;

-- 6. updated_at trigger
CREATE OR REPLACE FUNCTION update_customer_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_customer_users_updated_at ON customer_users;
CREATE TRIGGER trigger_customer_users_updated_at
    BEFORE UPDATE ON customer_users
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_users_updated_at();
