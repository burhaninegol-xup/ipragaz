-- =====================================================
-- MEVCUT TABLOLARA LOKASYON FK KOLONLARI EKLE
-- customer_addresses ve dealers tablolarina city_id, district_id, vb.
-- Eski VARCHAR kolonlari gecis doneminde korunacak
-- =====================================================

-- =====================================================
-- CUSTOMER_ADDRESSES TABLOSUNA FK KOLONLARI EKLE
-- =====================================================
ALTER TABLE customer_addresses
    ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id),
    ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES districts(id),
    ADD COLUMN IF NOT EXISTS neighborhood_id UUID REFERENCES neighborhoods(id),
    ADD COLUMN IF NOT EXISTS street_id UUID REFERENCES streets(id);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_customer_addresses_city_id ON customer_addresses(city_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_district_id ON customer_addresses(district_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_neighborhood_id ON customer_addresses(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_street_id ON customer_addresses(street_id);

-- =====================================================
-- DEALERS TABLOSUNA FK KOLONLARI EKLE
-- =====================================================
ALTER TABLE dealers
    ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES cities(id),
    ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES districts(id);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_dealers_city_id ON dealers(city_id);
CREATE INDEX IF NOT EXISTS idx_dealers_district_id ON dealers(district_id);

-- =====================================================
-- ACIKLAMA
-- =====================================================
COMMENT ON COLUMN customer_addresses.city_id IS 'Sehir referansi (cities tablosu)';
COMMENT ON COLUMN customer_addresses.district_id IS 'Ilce referansi (districts tablosu)';
COMMENT ON COLUMN customer_addresses.neighborhood_id IS 'Mahalle referansi (neighborhoods tablosu)';
COMMENT ON COLUMN customer_addresses.street_id IS 'Sokak referansi (streets tablosu)';

COMMENT ON COLUMN dealers.city_id IS 'Bayi sehir referansi (cities tablosu)';
COMMENT ON COLUMN dealers.district_id IS 'Bayi ilce referansi (districts tablosu)';
