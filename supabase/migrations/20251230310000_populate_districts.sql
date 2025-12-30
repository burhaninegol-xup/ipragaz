-- =====================================================
-- TURKIYE ILCE VERILERI
-- Tum 81 ilin ilceleri
-- =====================================================

-- =====================================================
-- ISTANBUL ILCELERI (39 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Adalar', 'adalar'),
    ('Arnavutkoy', 'arnavutkoy'),
    ('Atasehir', 'atasehir'),
    ('Avcilar', 'avcilar'),
    ('Bagcilar', 'bagcilar'),
    ('Bahcelievler', 'bahcelievler'),
    ('Bakirkoy', 'bakirkoy'),
    ('Basaksehir', 'basaksehir'),
    ('Bayrampasa', 'bayrampasa'),
    ('Besiktas', 'besiktas'),
    ('Beykoz', 'beykoz'),
    ('Beylikduzu', 'beylikduzu'),
    ('Beyoglu', 'beyoglu'),
    ('Buyukcekmece', 'buyukcekmece'),
    ('Catalca', 'catalca'),
    ('Cekmekoy', 'cekmekoy'),
    ('Esenler', 'esenler'),
    ('Esenyurt', 'esenyurt'),
    ('Eyupsultan', 'eyupsultan'),
    ('Fatih', 'fatih'),
    ('Gaziosmanpasa', 'gaziosmanpasa'),
    ('Gungoren', 'gungoren'),
    ('Kadikoy', 'kadikoy'),
    ('Kagithane', 'kagithane'),
    ('Kartal', 'kartal'),
    ('Kucukcekmece', 'kucukcekmece'),
    ('Maltepe', 'maltepe'),
    ('Pendik', 'pendik'),
    ('Sancaktepe', 'sancaktepe'),
    ('Sariyer', 'sariyer'),
    ('Silivri', 'silivri'),
    ('Sultanbeyli', 'sultanbeyli'),
    ('Sultangazi', 'sultangazi'),
    ('Sile', 'sile'),
    ('Sisli', 'sisli'),
    ('Tuzla', 'tuzla'),
    ('Umraniye', 'umraniye'),
    ('Uskudar', 'uskudar'),
    ('Zeytinburnu', 'zeytinburnu')
) AS d(name, name_ascii)
WHERE c.code = '34'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- ANKARA ILCELERI (25 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Akyurt', 'akyurt'),
    ('Altindag', 'altindag'),
    ('Ayas', 'ayas'),
    ('Bala', 'bala'),
    ('Beypazari', 'beypazari'),
    ('Cankaya', 'cankaya'),
    ('Cubuk', 'cubuk'),
    ('Elmadag', 'elmadag'),
    ('Etimesgut', 'etimesgut'),
    ('Evren', 'evren'),
    ('Golbasi', 'golbasi'),
    ('Gudul', 'gudul'),
    ('Haymana', 'haymana'),
    ('Kahramankazan', 'kahramankazan'),
    ('Kalecik', 'kalecik'),
    ('Kecioren', 'kecioren'),
    ('Kizilcahamam', 'kizilcahamam'),
    ('Mamak', 'mamak'),
    ('Nallihan', 'nallihan'),
    ('Polatli', 'polatli'),
    ('Pursaklar', 'pursaklar'),
    ('Sereflikochisar', 'sereflikochisar'),
    ('Sincan', 'sincan'),
    ('Yenimahalle', 'yenimahalle'),
    ('Camlidere', 'camlidere')
) AS d(name, name_ascii)
WHERE c.code = '06'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- IZMIR ILCELERI (30 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Aliaga', 'aliaga'),
    ('Balcova', 'balcova'),
    ('Bayindir', 'bayindir'),
    ('Bayrakli', 'bayrakli'),
    ('Bergama', 'bergama'),
    ('Beydag', 'beydag'),
    ('Bornova', 'bornova'),
    ('Buca', 'buca'),
    ('Cesme', 'cesme'),
    ('Cigli', 'cigli'),
    ('Dikili', 'dikili'),
    ('Foca', 'foca'),
    ('Gaziemir', 'gaziemir'),
    ('Guzelbahce', 'guzelbahce'),
    ('Karabaglar', 'karabaglar'),
    ('Karaburun', 'karaburun'),
    ('Karsiyaka', 'karsiyaka'),
    ('Kemalpasa', 'kemalpasa'),
    ('Kinik', 'kinik'),
    ('Kiraz', 'kiraz'),
    ('Konak', 'konak'),
    ('Menderes', 'menderes'),
    ('Menemen', 'menemen'),
    ('Narlidere', 'narlidere'),
    ('Odemis', 'odemis'),
    ('Seferihisar', 'seferihisar'),
    ('Selcuk', 'selcuk'),
    ('Tire', 'tire'),
    ('Torbali', 'torbali'),
    ('Urla', 'urla')
) AS d(name, name_ascii)
WHERE c.code = '35'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- BURSA ILCELERI (17 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Buyukorhan', 'buyukorhan'),
    ('Gemlik', 'gemlik'),
    ('Gursu', 'gursu'),
    ('Harmancik', 'harmancik'),
    ('Inegol', 'inegol'),
    ('Iznik', 'iznik'),
    ('Karacabey', 'karacabey'),
    ('Keles', 'keles'),
    ('Kestel', 'kestel'),
    ('Mudanya', 'mudanya'),
    ('Mustafakemalpasa', 'mustafakemalpasa'),
    ('Nilufer', 'nilufer'),
    ('Orhaneli', 'orhaneli'),
    ('Orhangazi', 'orhangazi'),
    ('Osmangazi', 'osmangazi'),
    ('Yenisehir', 'yenisehir'),
    ('Yildirim', 'yildirim')
) AS d(name, name_ascii)
WHERE c.code = '16'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- ANTALYA ILCELERI (19 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Akseki', 'akseki'),
    ('Aksu', 'aksu'),
    ('Alanya', 'alanya'),
    ('Demre', 'demre'),
    ('Dosemealti', 'dosemealti'),
    ('Elmali', 'elmali'),
    ('Finike', 'finike'),
    ('Gazipasa', 'gazipasa'),
    ('Gundogmus', 'gundogmus'),
    ('Ibradi', 'ibradi'),
    ('Kas', 'kas'),
    ('Kemer', 'kemer'),
    ('Kepez', 'kepez'),
    ('Konyaalti', 'konyaalti'),
    ('Korkuteli', 'korkuteli'),
    ('Kumluca', 'kumluca'),
    ('Manavgat', 'manavgat'),
    ('Muratpasa', 'muratpasa'),
    ('Serik', 'serik')
) AS d(name, name_ascii)
WHERE c.code = '07'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- ADANA ILCELERI (15 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Aladag', 'aladag'),
    ('Ceyhan', 'ceyhan'),
    ('Cukurova', 'cukurova'),
    ('Feke', 'feke'),
    ('Imamoglu', 'imamoglu'),
    ('Karaisali', 'karaisali'),
    ('Karatas', 'karatas'),
    ('Kozan', 'kozan'),
    ('Pozanti', 'pozanti'),
    ('Saimbeyli', 'saimbeyli'),
    ('Saricam', 'saricam'),
    ('Seyhan', 'seyhan'),
    ('Tufanbeyli', 'tufanbeyli'),
    ('Yumurtalik', 'yumurtalik'),
    ('Yuregir', 'yuregir')
) AS d(name, name_ascii)
WHERE c.code = '01'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- KONYA ILCELERI (31 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Ahirli', 'ahirli'),
    ('Akoren', 'akoren'),
    ('Aksehir', 'aksehir'),
    ('Altinekin', 'altinekin'),
    ('Beysehir', 'beysehir'),
    ('Bozkir', 'bozkir'),
    ('Cihanbeyli', 'cihanbeyli'),
    ('Cumra', 'cumra'),
    ('Derbent', 'derbent'),
    ('Derebucak', 'derebucak'),
    ('Doganhisar', 'doganhisar'),
    ('Emirgazi', 'emirgazi'),
    ('Eregli', 'eregli'),
    ('Guneysinir', 'guneysinir'),
    ('Hadim', 'hadim'),
    ('Halkapinar', 'halkapinar'),
    ('Huyuk', 'huyuk'),
    ('Ilgin', 'ilgin'),
    ('Kadinhani', 'kadinhani'),
    ('Karapinar', 'karapinar'),
    ('Karatay', 'karatay'),
    ('Kulu', 'kulu'),
    ('Meram', 'meram'),
    ('Sarayonu', 'sarayonu'),
    ('Selcuklu', 'selcuklu'),
    ('Seydisehir', 'seydisehir'),
    ('Taskent', 'taskent'),
    ('Tuzlukcu', 'tuzlukcu'),
    ('Yalihuyuk', 'yalihuyuk'),
    ('Yunak', 'yunak'),
    ('Sarayonu', 'sarayonu')
) AS d(name, name_ascii)
WHERE c.code = '42'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- GAZIANTEP ILCELERI (9 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Araban', 'araban'),
    ('Islahiye', 'islahiye'),
    ('Karkamis', 'karkamis'),
    ('Nizip', 'nizip'),
    ('Nurdagi', 'nurdagi'),
    ('Oguzeli', 'oguzeli'),
    ('Sahinbey', 'sahinbey'),
    ('Sehitkamil', 'sehitkamil'),
    ('Yavuzeli', 'yavuzeli')
) AS d(name, name_ascii)
WHERE c.code = '27'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- KAYSERI ILCELERI (16 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Akkisla', 'akkisla'),
    ('Bunyan', 'bunyan'),
    ('Develi', 'develi'),
    ('Felahiye', 'felahiye'),
    ('Hacilar', 'hacilar'),
    ('Incesu', 'incesu'),
    ('Kocasinan', 'kocasinan'),
    ('Melikgazi', 'melikgazi'),
    ('Ozvatan', 'ozvatan'),
    ('Pinarbasi', 'pinarbasi'),
    ('Sarioglan', 'sarioglan'),
    ('Sariz', 'sariz'),
    ('Talas', 'talas'),
    ('Tomarza', 'tomarza'),
    ('Yahyali', 'yahyali'),
    ('Yesilhisar', 'yesilhisar')
) AS d(name, name_ascii)
WHERE c.code = '38'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- MERSIN ILCELERI (13 ilce)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Akdeniz', 'akdeniz'),
    ('Anamur', 'anamur'),
    ('Aydincik', 'aydincik'),
    ('Bozyazi', 'bozyazi'),
    ('Camliyayla', 'camliyayla'),
    ('Erdemli', 'erdemli'),
    ('Gulnar', 'gulnar'),
    ('Mezitli', 'mezitli'),
    ('Mut', 'mut'),
    ('Silifke', 'silifke'),
    ('Tarsus', 'tarsus'),
    ('Toroslar', 'toroslar'),
    ('Yenisehir', 'yenisehir')
) AS d(name, name_ascii)
WHERE c.code = '33'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- DIGER ILLERIN MERKEZ ILCELERI
-- (Kalan 71 ilin en azindan merkez ilcesi)
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Merkez', 'merkez')
) AS d(name, name_ascii)
WHERE c.code NOT IN ('34', '06', '35', '16', '07', '01', '42', '27', '38', '33')
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- ADIYAMAN ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Besni', 'besni'),
    ('Celikhan', 'celikhan'),
    ('Gerger', 'gerger'),
    ('Golbasi', 'golbasi'),
    ('Kahta', 'kahta'),
    ('Samsat', 'samsat'),
    ('Sincik', 'sincik'),
    ('Tut', 'tut')
) AS d(name, name_ascii)
WHERE c.code = '02'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- DENIZLI ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Acipayam', 'acipayam'),
    ('Babadagi', 'babadagi'),
    ('Baklan', 'baklan'),
    ('Bekilli', 'bekilli'),
    ('Beyagac', 'beyagac'),
    ('Bozkurt', 'bozkurt'),
    ('Buldan', 'buldan'),
    ('Cal', 'cal'),
    ('Cameli', 'cameli'),
    ('Cardak', 'cardak'),
    ('Civril', 'civril'),
    ('Guney', 'guney'),
    ('Honaz', 'honaz'),
    ('Kale', 'kale'),
    ('Merkezefendi', 'merkezefendi'),
    ('Pamukkale', 'pamukkale'),
    ('Saraykoy', 'saraykoy'),
    ('Serinhisar', 'serinhisar'),
    ('Tavas', 'tavas')
) AS d(name, name_ascii)
WHERE c.code = '20'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- DIYARBAKIR ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Baglar', 'baglar'),
    ('Bismil', 'bismil'),
    ('Cermik', 'cermik'),
    ('Cinar', 'cinar'),
    ('Cungus', 'cungus'),
    ('Dicle', 'dicle'),
    ('Egil', 'egil'),
    ('Ergani', 'ergani'),
    ('Hani', 'hani'),
    ('Hazro', 'hazro'),
    ('Kayapinar', 'kayapinar'),
    ('Kocakoy', 'kocakoy'),
    ('Kulp', 'kulp'),
    ('Lice', 'lice'),
    ('Silvan', 'silvan'),
    ('Sur', 'sur'),
    ('Yenisehir', 'yenisehir')
) AS d(name, name_ascii)
WHERE c.code = '21'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- ERZURUM ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Askim', 'askim'),
    ('Aziziye', 'aziziye'),
    ('Cat', 'cat'),
    ('Hinis', 'hinis'),
    ('Horasan', 'horasan'),
    ('Ispir', 'ispir'),
    ('Karacoban', 'karacoban'),
    ('Karayazi', 'karayazi'),
    ('Koprukoy', 'koprukoy'),
    ('Narman', 'narman'),
    ('Oltu', 'oltu'),
    ('Olur', 'olur'),
    ('Palandoken', 'palandoken'),
    ('Pasinler', 'pasinler'),
    ('Pazaryolu', 'pazaryolu'),
    ('Senkaya', 'senkaya'),
    ('Tekman', 'tekman'),
    ('Tortum', 'tortum'),
    ('Uzundere', 'uzundere'),
    ('Yakutiye', 'yakutiye')
) AS d(name, name_ascii)
WHERE c.code = '25'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- ESKISEHIR ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Alpu', 'alpu'),
    ('Beylikova', 'beylikova'),
    ('Cifteler', 'cifteler'),
    ('Gunyuzu', 'gunyuzu'),
    ('Han', 'han'),
    ('Inonu', 'inonu'),
    ('Mahmudiye', 'mahmudiye'),
    ('Mihalgazi', 'mihalgazi'),
    ('Mihaliccik', 'mihaliccik'),
    ('Odunpazari', 'odunpazari'),
    ('Saricakaya', 'saricakaya'),
    ('Seyitgazi', 'seyitgazi'),
    ('Sivrihisar', 'sivrihisar'),
    ('Tepebasi', 'tepebasi')
) AS d(name, name_ascii)
WHERE c.code = '26'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- HATAY ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Altinozu', 'altinozu'),
    ('Antakya', 'antakya'),
    ('Arsuz', 'arsuz'),
    ('Belen', 'belen'),
    ('Defne', 'defne'),
    ('Dortyol', 'dortyol'),
    ('Erzin', 'erzin'),
    ('Hassa', 'hassa'),
    ('Iskenderun', 'iskenderun'),
    ('Kirikhan', 'kirikhan'),
    ('Kumlu', 'kumlu'),
    ('Payas', 'payas'),
    ('Reyhanli', 'reyhanli'),
    ('Samandag', 'samandag'),
    ('Yayladagi', 'yayladagi')
) AS d(name, name_ascii)
WHERE c.code = '31'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- KOCAELI ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Basiskele', 'basiskele'),
    ('Cayirova', 'cayirova'),
    ('Darica', 'darica'),
    ('Derince', 'derince'),
    ('Dilovasi', 'dilovasi'),
    ('Gebze', 'gebze'),
    ('Golcuk', 'golcuk'),
    ('Izmit', 'izmit'),
    ('Kandira', 'kandira'),
    ('Karamursel', 'karamursel'),
    ('Kartepe', 'kartepe'),
    ('Korfez', 'korfez')
) AS d(name, name_ascii)
WHERE c.code = '41'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- MANISA ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Ahmetli', 'ahmetli'),
    ('Akhisar', 'akhisar'),
    ('Alasehir', 'alasehir'),
    ('Demirci', 'demirci'),
    ('Golmarmara', 'golmarmara'),
    ('Gordes', 'gordes'),
    ('Kirkagac', 'kirkagac'),
    ('Koprubasi', 'koprubasi'),
    ('Kula', 'kula'),
    ('Salihli', 'salihli'),
    ('Sarigol', 'sarigol'),
    ('Saruhanli', 'saruhanli'),
    ('Selendi', 'selendi'),
    ('Sehzadeler', 'sehzadeler'),
    ('Soma', 'soma'),
    ('Turgutlu', 'turgutlu'),
    ('Yunusemre', 'yunusemre')
) AS d(name, name_ascii)
WHERE c.code = '45'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- MUGLA ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Bodrum', 'bodrum'),
    ('Dalaman', 'dalaman'),
    ('Datca', 'datca'),
    ('Fethiye', 'fethiye'),
    ('Kavaklidere', 'kavaklidere'),
    ('Koycegiz', 'koycegiz'),
    ('Marmaris', 'marmaris'),
    ('Mentese', 'mentese'),
    ('Milas', 'milas'),
    ('Ortaca', 'ortaca'),
    ('Seydikemer', 'seydikemer'),
    ('Ula', 'ula'),
    ('Yatagan', 'yatagan')
) AS d(name, name_ascii)
WHERE c.code = '48'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- SAKARYA ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Adapazari', 'adapazari'),
    ('Akyazi', 'akyazi'),
    ('Arifiye', 'arifiye'),
    ('Erenler', 'erenler'),
    ('Ferizli', 'ferizli'),
    ('Geyve', 'geyve'),
    ('Hendek', 'hendek'),
    ('Karapurcek', 'karapurcek'),
    ('Karasu', 'karasu'),
    ('Kaynarca', 'kaynarca'),
    ('Kocaali', 'kocaali'),
    ('Pamukova', 'pamukova'),
    ('Sapanca', 'sapanca'),
    ('Serdivan', 'serdivan'),
    ('Sogutlu', 'sogutlu'),
    ('Tarakli', 'tarakli')
) AS d(name, name_ascii)
WHERE c.code = '54'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- SAMSUN ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Alacam', 'alacam'),
    ('Asarcik', 'asarcik'),
    ('Atakum', 'atakum'),
    ('Ayvacik', 'ayvacik'),
    ('Bafra', 'bafra'),
    ('Canik', 'canik'),
    ('Carsamba', 'carsamba'),
    ('Havza', 'havza'),
    ('Ilkadim', 'ilkadim'),
    ('Kavak', 'kavak'),
    ('Ladik', 'ladik'),
    ('Ondokuzmayis', 'ondokuzmayis'),
    ('Salipazari', 'salipazari'),
    ('Tekkeköy', 'tekkekoy'),
    ('Terme', 'terme'),
    ('Vezirkopru', 'vezirkopru'),
    ('Yakakent', 'yakakent')
) AS d(name, name_ascii)
WHERE c.code = '55'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- TEKIRDAG ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Cerkezkoy', 'cerkezkoy'),
    ('Corlu', 'corlu'),
    ('Ergene', 'ergene'),
    ('Hayrabolu', 'hayrabolu'),
    ('Kapakli', 'kapakli'),
    ('Malkara', 'malkara'),
    ('Marmaraereglisi', 'marmaraereglisi'),
    ('Muratli', 'muratli'),
    ('Saray', 'saray'),
    ('Suleymanpasa', 'suleymanpasa'),
    ('Sarkoy', 'sarkoy')
) AS d(name, name_ascii)
WHERE c.code = '59'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- TRABZON ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Akcaabat', 'akcaabat'),
    ('Arakli', 'arakli'),
    ('Arsin', 'arsin'),
    ('Besikduzu', 'besikduzu'),
    ('Carsibasi', 'carsibasi'),
    ('Caykara', 'caykara'),
    ('Dernekpazari', 'dernekpazari'),
    ('Duzkoy', 'duzkoy'),
    ('Hayrat', 'hayrat'),
    ('Koprubasi', 'koprubasi'),
    ('Macka', 'macka'),
    ('Of', 'of'),
    ('Ortahisar', 'ortahisar'),
    ('Surmene', 'surmene'),
    ('Salpazari', 'salpazari'),
    ('Tonya', 'tonya'),
    ('Vakfikebir', 'vakfikebir'),
    ('Yomra', 'yomra')
) AS d(name, name_ascii)
WHERE c.code = '61'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- SANLIURFA ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Akcakale', 'akcakale'),
    ('Birecik', 'birecik'),
    ('Bozova', 'bozova'),
    ('Ceylanpinar', 'ceylanpinar'),
    ('Eyyubiye', 'eyyubiye'),
    ('Halfeti', 'halfeti'),
    ('Haliliye', 'haliliye'),
    ('Harran', 'harran'),
    ('Hilvan', 'hilvan'),
    ('Karakopru', 'karakopru'),
    ('Siverek', 'siverek'),
    ('Suruc', 'suruc'),
    ('Viransehir', 'viransehir')
) AS d(name, name_ascii)
WHERE c.code = '63'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- VAN ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Bahcesaray', 'bahcesaray'),
    ('Baskale', 'baskale'),
    ('Caldiran', 'caldiran'),
    ('Edremit', 'edremit'),
    ('Ercis', 'ercis'),
    ('Gevas', 'gevas'),
    ('Gurpinar', 'gurpinar'),
    ('Ipekyolu', 'ipekyolu'),
    ('Muradiye', 'muradiye'),
    ('Ozalp', 'ozalp'),
    ('Saray', 'saray'),
    ('Tusba', 'tusba')
) AS d(name, name_ascii)
WHERE c.code = '65'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- BALIKESIR ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Altieylul', 'altieylul'),
    ('Ayvalik', 'ayvalik'),
    ('Balya', 'balya'),
    ('Bandirma', 'bandirma'),
    ('Bigadic', 'bigadic'),
    ('Burhaniye', 'burhaniye'),
    ('Dursunbey', 'dursunbey'),
    ('Edremit', 'edremit'),
    ('Erdek', 'erdek'),
    ('Gomec', 'gomec'),
    ('Gonen', 'gonen'),
    ('Havran', 'havran'),
    ('Ivrindi', 'ivrindi'),
    ('Karesi', 'karesi'),
    ('Kepsut', 'kepsut'),
    ('Manyas', 'manyas'),
    ('Marmara', 'marmara'),
    ('Savastepe', 'savastepe'),
    ('Sindirgi', 'sindirgi'),
    ('Susurluk', 'susurluk')
) AS d(name, name_ascii)
WHERE c.code = '10'
ON CONFLICT (city_id, name) DO NOTHING;

-- =====================================================
-- AYDIN ILCELERI
-- =====================================================
INSERT INTO districts (city_id, name, name_ascii)
SELECT c.id, d.name, d.name_ascii
FROM cities c
CROSS JOIN (VALUES
    ('Bozdogan', 'bozdogan'),
    ('Buharkent', 'buharkent'),
    ('Cine', 'cine'),
    ('Didim', 'didim'),
    ('Efeler', 'efeler'),
    ('Germencik', 'germencik'),
    ('Incirliova', 'incirliova'),
    ('Karacasu', 'karacasu'),
    ('Karpuzlu', 'karpuzlu'),
    ('Kocarli', 'kocarli'),
    ('Kosk', 'kosk'),
    ('Kusadasi', 'kusadasi'),
    ('Kuyucak', 'kuyucak'),
    ('Nazilli', 'nazilli'),
    ('Soke', 'soke'),
    ('Sultanhisar', 'sultanhisar'),
    ('Yenipazar', 'yenipazar')
) AS d(name, name_ascii)
WHERE c.code = '09'
ON CONFLICT (city_id, name) DO NOTHING;
