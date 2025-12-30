-- =====================================================
-- TURKIYE MAHALLE VERISI (ORNEK/TEMSILI)
-- Tam veri seti icin harici kaynak veya API kullanilmalidir
-- =====================================================

-- ISTANBUL - KADIKOY MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Caferaga', 'caferaga', '34710'),
    ('Osmanaga', 'osmanaga', '34714'),
    ('Rasimpasa', 'rasimpasa', '34716'),
    ('Fenerbahce', 'fenerbahce', '34726'),
    ('Feneryolu', 'feneryolu', '34724'),
    ('Goztepe', 'goztepe', '34730'),
    ('Kozyatagi', 'kozyatagi', '34742'),
    ('Bostanci', 'bostanci', '34744'),
    ('Suadiye', 'suadiye', '34740'),
    ('Erenkoy', 'erenkoy', '34738'),
    ('Caddebostan', 'caddebostan', '34728'),
    ('Moda', 'moda', '34710'),
    ('Hasanpasa', 'hasanpasa', '34722'),
    ('Fikirtepe', 'fikirtepe', '34720'),
    ('Acibadem', 'acibadem', '34718')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Kadikoy'
ON CONFLICT (district_id, name) DO NOTHING;

-- ISTANBUL - BESIKTAS MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Bebek', 'bebek', '34342'),
    ('Etiler', 'etiler', '34337'),
    ('Levent', 'levent', '34330'),
    ('Ortakoy', 'ortakoy', '34347'),
    ('Arnavutkoy', 'arnavutkoy', '34345'),
    ('Kuruçesme', 'kurucesme', '34345'),
    ('Yildiz', 'yildiz', '34349'),
    ('Sinanpasa', 'sinanpasa', '34353'),
    ('Abbasaga', 'abbasaga', '34353'),
    ('Turkali', 'turkali', '34357'),
    ('Dikilitasi', 'dikilitasi', '34349'),
    ('Akatlar', 'akatlar', '34335'),
    ('Ulus', 'ulus', '34340'),
    ('Konaklar', 'konaklar', '34330')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Besiktas'
ON CONFLICT (district_id, name) DO NOTHING;

-- ISTANBUL - SISLI MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Nisantasi', 'nisantasi', '34365'),
    ('Osmanbey', 'osmanbey', '34360'),
    ('Harbiye', 'harbiye', '34367'),
    ('Mecidiyekoy', 'mecidiyekoy', '34387'),
    ('Gulbahar', 'gulbahar', '34394'),
    ('Halaskargazi', 'halaskargazi', '34371'),
    ('Fulya', 'fulya', '34394'),
    ('Esentepe', 'esentepe', '34394'),
    ('Bozkurt', 'bozkurt', '34375'),
    ('Kaptanpasa', 'kaptanpasa', '34384')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Sisli'
ON CONFLICT (district_id, name) DO NOTHING;

-- ISTANBUL - USKUDAR MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Cengelkoy', 'cengelkoy', '34684'),
    ('Kuzguncuk', 'kuzguncuk', '34674'),
    ('Beylerbeyi', 'beylerbeyi', '34676'),
    ('Altunizade', 'altunizade', '34662'),
    ('Kisikli', 'kisikli', '34662'),
    ('Icerenkoy', 'icerenkoy', '34752'),
    ('Camlica', 'camlica', '34696'),
    ('Selimiye', 'selimiye', '34668'),
    ('Ahmediye', 'ahmediye', '34672'),
    ('Sultantepe', 'sultantepe', '34672')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Uskudar'
ON CONFLICT (district_id, name) DO NOTHING;

-- ISTANBUL - FATIH MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Sultanahmet', 'sultanahmet', '34122'),
    ('Sirkeci', 'sirkeci', '34120'),
    ('Eminonu', 'eminonu', '34110'),
    ('Aksaray', 'aksaray', '34096'),
    ('Laleli', 'laleli', '34130'),
    ('Beyazit', 'beyazit', '34126'),
    ('Vefa', 'vefa', '34134'),
    ('Fener', 'fener', '34220'),
    ('Balat', 'balat', '34087'),
    ('Karagumruk', 'karagumruk', '34091')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Fatih'
ON CONFLICT (district_id, name) DO NOTHING;

-- ISTANBUL - BEYOGLU MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Taksim', 'taksim', '34435'),
    ('Cihangir', 'cihangir', '34433'),
    ('Galata', 'galata', '34421'),
    ('Karakoy', 'karakoy', '34425'),
    ('Tunel', 'tunel', '34430'),
    ('Asmalimescit', 'asmalimescit', '34430'),
    ('Firuzaga', 'firuzaga', '34425'),
    ('Kucukparmakkapi', 'kucukparmakkapi', '34437'),
    ('Gumussuyu', 'gumussuyu', '34437'),
    ('Tomtom', 'tomtom', '34433')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Beyoglu'
ON CONFLICT (district_id, name) DO NOTHING;

-- ANKARA - CANKAYA MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Kizilay', 'kizilay', '06420'),
    ('Bahcelievler', 'bahcelievler', '06500'),
    ('Cankaya', 'cankaya', '06690'),
    ('Kavaklidere', 'kavaklidere', '06680'),
    ('Gaziosmanpasa', 'gaziosmanpasa', '06700'),
    ('Emek', 'emek', '06510'),
    ('Balgat', 'balgat', '06520'),
    ('Oran', 'oran', '06450'),
    ('Yukari Dikmen', 'yukari dikmen', '06450'),
    ('Asagi Dikmen', 'asagi dikmen', '06460'),
    ('Cukurambar', 'cukurambar', '06520'),
    ('Mustafa Kemal', 'mustafa kemal', '06520'),
    ('Ilkadim', 'ilkadim', '06430'),
    ('Ayranci', 'ayranci', '06540')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Cankaya'
  AND d.city_id = (SELECT id FROM cities WHERE name = 'Ankara')
ON CONFLICT (district_id, name) DO NOTHING;

-- ANKARA - KECIOREN MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Etlik', 'etlik', '06010'),
    ('Kecioren', 'kecioren', '06280'),
    ('Ovacik', 'ovacik', '06300'),
    ('Kalaba', 'kalaba', '06010'),
    ('Baglarici', 'baglarici', '06010'),
    ('Pinarbaşi', 'pinarbasi', '06280'),
    ('Kuşcagiz', 'kuscagiz', '06020'),
    ('Subayevleri', 'subayevleri', '06020')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Kecioren'
  AND d.city_id = (SELECT id FROM cities WHERE name = 'Ankara')
ON CONFLICT (district_id, name) DO NOTHING;

-- IZMIR - KONAK MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Alsancak', 'alsancak', '35220'),
    ('Basmane', 'basmane', '35240'),
    ('Konak', 'konak', '35250'),
    ('Goztepe', 'goztepe', '35290'),
    ('Karantina', 'karantina', '35260'),
    ('Hatay', 'hatay', '35230'),
    ('Kucukyali', 'kucukyali', '35270'),
    ('Umurbey', 'umurbey', '35250'),
    ('Guzelyali', 'guzelyali', '35290')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Konak'
  AND d.city_id = (SELECT id FROM cities WHERE name = 'Izmir')
ON CONFLICT (district_id, name) DO NOTHING;

-- IZMIR - KARSIYAKA MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Bostanli', 'bostanli', '35540'),
    ('Mavibahce', 'mavibahce', '35540'),
    ('Atakent', 'atakent', '35560'),
    ('Tersane', 'tersane', '35550'),
    ('Donanmaci', 'donanmaci', '35550'),
    ('Alaybey', 'alaybey', '35520'),
    ('Yali', 'yali', '35530'),
    ('Cigli', 'cigli', '35580')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Karsiyaka'
  AND d.city_id = (SELECT id FROM cities WHERE name = 'Izmir')
ON CONFLICT (district_id, name) DO NOTHING;

-- IZMIR - BORNOVA MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Bornova', 'bornova', '35040'),
    ('Evka 3', 'evka 3', '35050'),
    ('Mevlana', 'mevlana', '35040'),
    ('Erzene', 'erzene', '35040'),
    ('Kazimdirik', 'kazimdirik', '35040'),
    ('Naldoken', 'naldoken', '35030'),
    ('Yesilova', 'yesilova', '35070')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Bornova'
  AND d.city_id = (SELECT id FROM cities WHERE name = 'Izmir')
ON CONFLICT (district_id, name) DO NOTHING;

-- BURSA - OSMANGAZI MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Cekirge', 'cekirge', '16070'),
    ('Muradiye', 'muradiye', '16040'),
    ('Santral', 'santral', '16010'),
    ('Demirtas', 'demirtas', '16245'),
    ('Emek', 'emek', '16110'),
    ('Hamitler', 'hamitler', '16210'),
    ('Panayir', 'panayir', '16240'),
    ('Soganli', 'soganli', '16190')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Osmangazi'
  AND d.city_id = (SELECT id FROM cities WHERE name = 'Bursa')
ON CONFLICT (district_id, name) DO NOTHING;

-- ANTALYA - MURATPASA MAHALLELERI
INSERT INTO neighborhoods (district_id, name, name_ascii, postal_code)
SELECT d.id, n.name, n.name_ascii, n.postal_code
FROM districts d
CROSS JOIN (VALUES
    ('Konyaalti', 'konyaalti', '07070'),
    ('Lara', 'lara', '07230'),
    ('Sirinyal', 'sirinyal', '07160'),
    ('Meltem', 'meltem', '07030'),
    ('Fener', 'fener', '07160'),
    ('Guzeloba', 'guzeloba', '07230'),
    ('Ermenek', 'ermenek', '07040'),
    ('Balbey', 'balbey', '07040')
) AS n(name, name_ascii, postal_code)
WHERE d.name = 'Muratpasa'
  AND d.city_id = (SELECT id FROM cities WHERE name = 'Antalya')
ON CONFLICT (district_id, name) DO NOTHING;
