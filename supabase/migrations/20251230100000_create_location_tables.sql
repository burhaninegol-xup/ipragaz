-- =====================================================
-- TURKIYE LOKASYON TABLOLARI
-- Il / Ilce / Mahalle / Sokak hiyerarsisi
-- =====================================================

-- =====================================================
-- ILLER TABLOSU (81 il)
-- =====================================================
CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(2) NOT NULL UNIQUE,           -- Plaka kodu: "01", "34", vb.
    name VARCHAR(100) NOT NULL,                -- Turkce isim: "Istanbul", "Ankara"
    name_ascii VARCHAR(100) NOT NULL,          -- ASCII normalized: "istanbul", "ankara"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_cities_code ON cities(code);
CREATE INDEX IF NOT EXISTS idx_cities_name_ascii ON cities(name_ascii);
CREATE INDEX IF NOT EXISTS idx_cities_is_active ON cities(is_active);

-- =====================================================
-- ILCELER TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS districts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,                -- Turkce isim: "Kadikoy", "Cankaya"
    name_ascii VARCHAR(100) NOT NULL,          -- ASCII normalized: "kadikoy", "cankaya"
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(city_id, name)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_districts_city_id ON districts(city_id);
CREATE INDEX IF NOT EXISTS idx_districts_name_ascii ON districts(name_ascii);
CREATE INDEX IF NOT EXISTS idx_districts_is_active ON districts(is_active);

-- =====================================================
-- MAHALLELER TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,                -- Turkce isim: "Caferaga", "Kizilay"
    name_ascii VARCHAR(150) NOT NULL,          -- ASCII normalized
    postal_code VARCHAR(10),                   -- Posta kodu (opsiyonel)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(district_id, name)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_neighborhoods_district_id ON neighborhoods(district_id);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_name_ascii ON neighborhoods(name_ascii);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_postal_code ON neighborhoods(postal_code);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_is_active ON neighborhoods(is_active);

-- =====================================================
-- SOKAKLAR TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS streets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,                -- Turkce isim: "Moda Caddesi", "Ataturk Bulvari"
    name_ascii VARCHAR(200) NOT NULL,          -- ASCII normalized
    street_type VARCHAR(20),                   -- 'sokak', 'cadde', 'bulvar', 'yol'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(neighborhood_id, name)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_streets_neighborhood_id ON streets(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_streets_name_ascii ON streets(name_ascii);
CREATE INDEX IF NOT EXISTS idx_streets_street_type ON streets(street_type);
CREATE INDEX IF NOT EXISTS idx_streets_is_active ON streets(is_active);

-- =====================================================
-- GRANTS (Erisim Yetkileri)
-- =====================================================
GRANT SELECT ON cities TO anon, authenticated;
GRANT SELECT ON districts TO anon, authenticated;
GRANT SELECT ON neighborhoods TO anon, authenticated;
GRANT SELECT ON streets TO anon, authenticated;

GRANT ALL ON cities TO service_role;
GRANT ALL ON districts TO service_role;
GRANT ALL ON neighborhoods TO service_role;
GRANT ALL ON streets TO service_role;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Herkes okuyabilir, sadece service_role yazabilir
-- =====================================================

-- Cities RLS
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cities_read_all" ON cities;
CREATE POLICY "cities_read_all" ON cities
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "cities_service_all" ON cities;
CREATE POLICY "cities_service_all" ON cities
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Districts RLS
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "districts_read_all" ON districts;
CREATE POLICY "districts_read_all" ON districts
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "districts_service_all" ON districts;
CREATE POLICY "districts_service_all" ON districts
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Neighborhoods RLS
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "neighborhoods_read_all" ON neighborhoods;
CREATE POLICY "neighborhoods_read_all" ON neighborhoods
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "neighborhoods_service_all" ON neighborhoods;
CREATE POLICY "neighborhoods_service_all" ON neighborhoods
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Streets RLS
ALTER TABLE streets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "streets_read_all" ON streets;
CREATE POLICY "streets_read_all" ON streets
    FOR SELECT TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "streets_service_all" ON streets;
CREATE POLICY "streets_service_all" ON streets
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- YARDIMCI FONKSIYON: Turkce karakterleri ASCII'ye cevir
-- =====================================================
CREATE OR REPLACE FUNCTION normalize_turkish(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN lower(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(
        replace(input_text,
            'ç', 'c'),
            'Ç', 'c'),
            'ğ', 'g'),
            'Ğ', 'g'),
            'ı', 'i'),
            'I', 'i'),
            'İ', 'i'),
            'ö', 'o'),
            'Ö', 'o'),
            'ş', 's'),
            'Ş', 's'),
            'ü', 'u'),
            'Ü', 'u')
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION normalize_turkish IS 'Turkce karakterleri ASCII karakterlere donusturur. Ornek: Istanbul -> istanbul, Kadikoy -> kadikoy';
