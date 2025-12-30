-- =====================================================
-- MEVCUT VARCHAR VERILERINI FK'YE DONUSTUR
-- Bu migration mevcut text bazli lokasyon verilerini
-- yeni UUID foreign key'lere ceviriyor
-- =====================================================

-- 1. CUSTOMER_ADDRESSES TABLOSU ICIN MIGRATION

-- Il migrationu (city -> city_id)
UPDATE customer_addresses ca
SET city_id = c.id
FROM cities c
WHERE ca.city IS NOT NULL
  AND ca.city_id IS NULL
  AND (
    LOWER(ca.city) = LOWER(c.name)
    OR LOWER(ca.city) = c.name_ascii
    OR normalize_turkish(ca.city) = c.name_ascii
  );

-- Ilce migrationu (district -> district_id)
UPDATE customer_addresses ca
SET district_id = d.id
FROM districts d
WHERE ca.district IS NOT NULL
  AND ca.district_id IS NULL
  AND ca.city_id = d.city_id
  AND (
    LOWER(ca.district) = LOWER(d.name)
    OR LOWER(ca.district) = d.name_ascii
    OR normalize_turkish(ca.district) = d.name_ascii
  );

-- Mahalle migrationu (neighborhood -> neighborhood_id)
UPDATE customer_addresses ca
SET neighborhood_id = n.id
FROM neighborhoods n
WHERE ca.neighborhood IS NOT NULL
  AND ca.neighborhood_id IS NULL
  AND ca.district_id = n.district_id
  AND (
    LOWER(ca.neighborhood) = LOWER(n.name)
    OR LOWER(ca.neighborhood) = n.name_ascii
    OR normalize_turkish(ca.neighborhood) = n.name_ascii
  );

-- Sokak migrationu (street -> street_id)
UPDATE customer_addresses ca
SET street_id = s.id
FROM streets s
WHERE ca.street IS NOT NULL
  AND ca.street_id IS NULL
  AND ca.neighborhood_id = s.neighborhood_id
  AND (
    LOWER(ca.street) = LOWER(s.name)
    OR LOWER(ca.street) = s.name_ascii
    OR normalize_turkish(ca.street) = s.name_ascii
  );

-- 2. DEALERS TABLOSU ICIN MIGRATION

-- Il migrationu (city -> city_id)
UPDATE dealers dl
SET city_id = c.id
FROM cities c
WHERE dl.city IS NOT NULL
  AND dl.city_id IS NULL
  AND (
    LOWER(dl.city) = LOWER(c.name)
    OR LOWER(dl.city) = c.name_ascii
    OR normalize_turkish(dl.city) = c.name_ascii
  );

-- Ilce migrationu (district -> district_id)
UPDATE dealers dl
SET district_id = d.id
FROM districts d
WHERE dl.district IS NOT NULL
  AND dl.district_id IS NULL
  AND dl.city_id = d.city_id
  AND (
    LOWER(dl.district) = LOWER(d.name)
    OR LOWER(dl.district) = d.name_ascii
    OR normalize_turkish(dl.district) = d.name_ascii
  );

-- 3. MIGRATION SONUCLARINI RAPORLA (Opsiyonel debug icin)
-- Bu kısım comment olarak birakildi, ihtiyac halinde calistirabilirsiniz

/*
-- Migrate edilemeyen customer_addresses kayitlari
SELECT 'customer_addresses' as tablo,
       COUNT(*) as toplam,
       COUNT(city_id) as city_ok,
       COUNT(district_id) as district_ok,
       COUNT(neighborhood_id) as neighborhood_ok,
       COUNT(street_id) as street_ok
FROM customer_addresses
WHERE city IS NOT NULL OR district IS NOT NULL;

-- Migrate edilemeyen dealers kayitlari
SELECT 'dealers' as tablo,
       COUNT(*) as toplam,
       COUNT(city_id) as city_ok,
       COUNT(district_id) as district_ok
FROM dealers
WHERE city IS NOT NULL OR district IS NOT NULL;

-- Eslesmeyen sehir isimleri
SELECT DISTINCT city
FROM customer_addresses
WHERE city IS NOT NULL AND city_id IS NULL;

SELECT DISTINCT city
FROM dealers
WHERE city IS NOT NULL AND city_id IS NULL;
*/
