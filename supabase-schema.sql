-- =============================================
-- İPRAGAZ BAYİ - SUPABASE SCHEMA
-- =============================================
-- Bu SQL dosyasını Supabase Console > SQL Editor'de çalıştırın

-- =============================================
-- 1. DEALERS (Bayiler)
-- =============================================
CREATE TABLE IF NOT EXISTS dealers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. PRODUCTS (Ürünler)
-- =============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    weight_kg DECIMAL(5, 2),
    category VARCHAR(50),
    image_url VARCHAR(500),
    base_price DECIMAL(10, 2) NOT NULL,
    points_per_unit INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. CUSTOMERS (Müşteriler)
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vkn VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    dealer_id UUID REFERENCES dealers(id),
    is_active BOOLEAN DEFAULT true,
    is_new_user BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster VKN lookups
CREATE INDEX IF NOT EXISTS idx_customers_vkn ON customers(vkn);
CREATE INDEX IF NOT EXISTS idx_customers_dealer ON customers(dealer_id);

-- =============================================
-- 4. CUSTOMER_PRICES (Müşteri Özel Fiyatları)
-- =============================================
CREATE TABLE IF NOT EXISTS customer_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    dealer_id UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
    unit_price DECIMAL(10, 2) NOT NULL,
    commitment_quantity INTEGER DEFAULT 0,
    this_month_quantity INTEGER DEFAULT 0,
    last_month_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, product_id, dealer_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_prices_customer ON customer_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_dealer ON customer_prices(dealer_id);

-- =============================================
-- 5. ORDERS (Siparişler)
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id),
    dealer_id UUID NOT NULL REFERENCES dealers(id),
    status VARCHAR(50) DEFAULT 'pending',
    total_amount DECIMAL(12, 2) NOT NULL,
    total_points INTEGER DEFAULT 0,
    delivery_address TEXT,
    delivery_date DATE,
    delivery_time VARCHAR(50),
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_dealer ON orders(dealer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(created_at);

-- =============================================
-- 6. ORDER_ITEMS (Sipariş Kalemleri)
-- =============================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- =============================================
-- 7. TRIGGERS - updated_at otomatik güncelleme
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger'ları oluştur
DROP TRIGGER IF EXISTS update_dealers_updated_at ON dealers;
CREATE TRIGGER update_dealers_updated_at BEFORE UPDATE ON dealers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_prices_updated_at ON customer_prices;
CREATE TRIGGER update_customer_prices_updated_at BEFORE UPDATE ON customer_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 8. SIPARIŞ NUMARASI OTOMATIK OLUŞTURMA
-- =============================================
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- =============================================
-- 9. ÖRNEK VERİLER
-- =============================================

-- Bayiler
INSERT INTO dealers (code, name, city, district, phone) VALUES
('IPR-ATASEHIR', 'İpragaz Ataşehir Bayi', 'İstanbul', 'Ataşehir', '0216 555 0001'),
('IPR-KADIKOY', 'İpragaz Kadıköy Bayi', 'İstanbul', 'Kadıköy', '0216 555 0002'),
('IPR-USKUDAR', 'İpragaz Üsküdar Bayi', 'İstanbul', 'Üsküdar', '0216 555 0003')
ON CONFLICT (code) DO NOTHING;

-- Ürünler
INSERT INTO products (code, name, weight_kg, category, base_price, points_per_unit, image_url) VALUES
('IPR-12-UZUN', '12 KG – Uzun İşYerim Tüpü', 12.00, 'isyerim', 2060.00, 12, 'İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png'),
('IPR-12-SISMAN', '12 KG – Şişman İşYerim Tüpü', 12.00, 'isyerim', 2100.00, 12, 'İpragaz Bayi_files/IPR-BAYI-12-kg-ipr-uzun.png'),
('IPR-12-IZO', '12 KG – İzopro Tüpü', 12.00, 'isyerim', 2100.00, 12, 'İpragaz Bayi_files/IPR-BAYI-12kg-izo-pro.png'),
('IPR-24-SAN', '24 KG – Sanayi Tüpü', 24.00, 'sanayi', 2251.00, 15, 'İpragaz Bayi_files/IPR-BAYI-24kg-sanayi.png'),
('IPR-45-SAN', '45 KG – Sanayi Tüpü', 45.00, 'sanayi', 17530.00, 100, 'İpragaz Bayi_files/IPR-BAYI-45kg-sanayi.png'),
('IPR-IS-SILIND', 'İş Silindirleri', 45.00, 'sanayi', 17530.00, 100, 'İpragaz Bayi_files/IPR-BAYI-45kg-sanayi.png')
ON CONFLICT (code) DO NOTHING;

-- Örnek Müşteriler (Ataşehir Bayisine bağlı)
INSERT INTO customers (vkn, name, company_name, phone, dealer_id, is_active)
SELECT
    '1234567890',
    'Ahmet Yılmaz',
    'Yılmaz Sanayi Ltd. Şti.',
    '0532 111 2233',
    d.id,
    false
FROM dealers d WHERE d.code = 'IPR-ATASEHIR'
ON CONFLICT (vkn) DO NOTHING;

INSERT INTO customers (vkn, name, company_name, phone, dealer_id, is_active)
SELECT
    '9876543210',
    'Mehmet Demir',
    'Demir Ticaret A.Ş.',
    '0533 222 3344',
    d.id,
    true
FROM dealers d WHERE d.code = 'IPR-ATASEHIR'
ON CONFLICT (vkn) DO NOTHING;

INSERT INTO customers (vkn, name, company_name, phone, dealer_id, is_active)
SELECT
    '1111111111',
    'Ayşe Kaya',
    'Kaya Gıda Ltd. Şti.',
    '0534 333 4455',
    d.id,
    true
FROM dealers d WHERE d.code = 'IPR-ATASEHIR'
ON CONFLICT (vkn) DO NOTHING;

INSERT INTO customers (vkn, name, company_name, phone, dealer_id, is_active)
SELECT
    '2222222222',
    'Fatma Çelik',
    'Çelik Restoran',
    '0535 444 5566',
    d.id,
    true
FROM dealers d WHERE d.code = 'IPR-KADIKOY'
ON CONFLICT (vkn) DO NOTHING;

-- Örnek Müşteri Fiyatları
INSERT INTO customer_prices (customer_id, product_id, dealer_id, unit_price, commitment_quantity, this_month_quantity, last_month_quantity)
SELECT
    c.id,
    p.id,
    c.dealer_id,
    CASE
        WHEN p.code = 'IPR-12-UZUN' THEN 850.00
        WHEN p.code = 'IPR-12-IZO' THEN 900.00
        WHEN p.code = 'IPR-24-SAN' THEN 1600.00
        WHEN p.code = 'IPR-45-SAN' THEN 2500.00
    END,
    CASE
        WHEN p.code = 'IPR-12-UZUN' THEN 10
        WHEN p.code = 'IPR-12-IZO' THEN 5
        WHEN p.code = 'IPR-24-SAN' THEN 8
        WHEN p.code = 'IPR-45-SAN' THEN 5
    END,
    CASE
        WHEN p.code = 'IPR-12-UZUN' THEN 2
        WHEN p.code = 'IPR-12-IZO' THEN 0
        WHEN p.code = 'IPR-24-SAN' THEN 3
        WHEN p.code = 'IPR-45-SAN' THEN 1
    END,
    CASE
        WHEN p.code = 'IPR-12-UZUN' THEN 3
        WHEN p.code = 'IPR-12-IZO' THEN 1
        WHEN p.code = 'IPR-24-SAN' THEN 4
        WHEN p.code = 'IPR-45-SAN' THEN 2
    END
FROM customers c
CROSS JOIN products p
WHERE c.vkn = '1234567890'
AND p.code IN ('IPR-12-UZUN', 'IPR-12-IZO', 'IPR-24-SAN', 'IPR-45-SAN')
ON CONFLICT (customer_id, product_id, dealer_id) DO NOTHING;

-- =============================================
-- KURULUM TAMAMLANDI!
-- =============================================
