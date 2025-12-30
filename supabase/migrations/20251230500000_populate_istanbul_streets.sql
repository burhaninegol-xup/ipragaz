-- =====================================================
-- ISTANBUL SOKAK/CADDE VERISI
-- Kaynak: NVI Adres Kayit Sistemi
-- (github.com/emreuenal/turkiye-il-ilce-sokak-mahalle-veri-tabani)
-- Toplam: 3067 sokak/cadde
-- =====================================================

-- KADIKOY - ACIBADEM SOKAK/CADDELERI
INSERT INTO streets (neighborhood_id, name, name_ascii, street_type)
SELECT n.id, s.name, normalize_turkish(s.name), s.street_type
FROM neighborhoods n
JOIN districts d ON n.district_id = d.id
JOIN cities c ON d.city_id = c.id
CROSS JOIN (VALUES
('ACIBADEM (Cadde)', 'cadde'),
('ADIVAR (Sokak)', 'sokak'),
('ALİDEDE (Sokak)', 'sokak'),
('ANAYOL (Sokak)', 'sokak'),
('ARMA ÇIKMAZI (Sokak)', 'sokak'),
('ASAFBEY (Sokak)', 'sokak'),
('ASALET (Sokak)', 'sokak'),
('ATA (Sokak)', 'sokak'),
('ATIFBEY (Sokak)', 'sokak'),
('BAĞ (Sokak)', 'sokak'),
('BAĞ ÇIKMAZI (Sokak)', 'sokak'),
('BAĞIMSIZ (Sokak)', 'sokak'),
('BAĞLAR (Sokak)', 'sokak'),
('BAHARATTAR (Sokak)', 'sokak'),
('BAŞBUĞ (Sokak)', 'sokak'),
('BEDİR (Sokak)', 'sokak'),
('BEHRAMPAŞA (Sokak)', 'sokak'),
('BÜYÜK SELİM PAŞA (Cadde)', 'cadde'),
('CİĞDEM (Sokak)', 'sokak'),
('CUNDA (Sokak)', 'sokak'),
('ÇAM (Sokak)', 'sokak'),
('ÇELİK (Sokak)', 'sokak'),
('ÇEŞMELİ (Sokak)', 'sokak'),
('DEDE EFENDİ (Sokak)', 'sokak'),
('DİKİLİTAŞ (Sokak)', 'sokak'),
('DOĞANAY (Sokak)', 'sokak'),
('DR. ASIM ÖKTEN (Sokak)', 'sokak'),
('EĞİTİM (Sokak)', 'sokak'),
('ENGİN (Sokak)', 'sokak'),
('ERGUVAN (Sokak)', 'sokak'),
('ESER (Sokak)', 'sokak'),
('FEVZİ ÇAKMAK (Cadde)', 'cadde'),
('GAZİ (Sokak)', 'sokak'),
('GEDİK (Sokak)', 'sokak'),
('GENÇLER (Sokak)', 'sokak'),
('GÜL (Sokak)', 'sokak'),
('GÜLAY (Sokak)', 'sokak'),
('HAMDİ REŞİT (Sokak)', 'sokak'),
('HARMAN (Sokak)', 'sokak'),
('HASAN (Sokak)', 'sokak'),
('HATİCE SULTAN (Sokak)', 'sokak'),
('HAZNEDAR (Sokak)', 'sokak'),
('HİLMİ URAN (Sokak)', 'sokak'),
('IŞIK (Sokak)', 'sokak'),
('İLKBAHAR (Sokak)', 'sokak'),
('İNKILAP (Sokak)', 'sokak'),
('İZZET (Sokak)', 'sokak'),
('KAPTANZADE (Sokak)', 'sokak'),
('KASAP (Sokak)', 'sokak'),
('KAVAKLI (Sokak)', 'sokak'),
('KEREM (Sokak)', 'sokak'),
('KIRLANGIC (Sokak)', 'sokak'),
('KIZILTOPRAK (Sokak)', 'sokak'),
('KONAK (Sokak)', 'sokak'),
('KÖPRÜ (Sokak)', 'sokak'),
('KUŞDERE (Sokak)', 'sokak'),
('LALE (Sokak)', 'sokak'),
('MARMARA (Sokak)', 'sokak'),
('MATBAACı (Sokak)', 'sokak'),
('MECNUN (Sokak)', 'sokak'),
('MEŞRUTİYET (Sokak)', 'sokak'),
('MİHRAP (Sokak)', 'sokak'),
('MİNARE (Sokak)', 'sokak'),
('ONAT (Sokak)', 'sokak'),
('ORDU (Sokak)', 'sokak'),
('ORHAN (Sokak)', 'sokak'),
('ORMAN (Sokak)', 'sokak'),
('ORTAKLAR (Sokak)', 'sokak'),
('PAŞA LİMANI (Cadde)', 'cadde'),
('PELİT (Sokak)', 'sokak'),
('RANA (Sokak)', 'sokak'),
('SAĞLIK (Sokak)', 'sokak'),
('SELİM (Sokak)', 'sokak'),
('SELVİ (Sokak)', 'sokak'),
('SERDAR (Sokak)', 'sokak'),
('SERHAT (Sokak)', 'sokak'),
('SÖĞÜT (Sokak)', 'sokak'),
('ŞAİR NEFİ (Sokak)', 'sokak'),
('TANZİMAT (Sokak)', 'sokak'),
('TARAKÇI (Sokak)', 'sokak'),
('TEVFİK FİKRET (Cadde)', 'cadde'),
('TURA (Sokak)', 'sokak'),
('UĞUR (Sokak)', 'sokak'),
('ULVİYE (Sokak)', 'sokak'),
('UMUT (Sokak)', 'sokak'),
('UZUN (Sokak)', 'sokak'),
('VATAN (Sokak)', 'sokak'),
('VELİ EFENDİ (Sokak)', 'sokak'),
('YANBOLİ (Sokak)', 'sokak'),
('YAYLA (Sokak)', 'sokak'),
('YEŞİL (Sokak)', 'sokak'),
('YEŞİL ÇINAR (Sokak)', 'sokak'),
('YEŞİLBAHAR (Sokak)', 'sokak'),
('YEŞİLYURT (Sokak)', 'sokak'),
('YILDIZ (Sokak)', 'sokak'),
('YUNUS (Sokak)', 'sokak'),
('YÜKSEK (Sokak)', 'sokak'),
('ZEYTİN (Sokak)', 'sokak'),
('ZİYA (Sokak)', 'sokak')
) AS s(name, street_type)
WHERE c.name = 'Istanbul' AND d.name = 'Kadikoy' AND n.name = 'Acibadem'
ON CONFLICT (neighborhood_id, name) DO NOTHING;

-- KADIKOY - FENERBAHCE SOKAK/CADDELERI
INSERT INTO streets (neighborhood_id, name, name_ascii, street_type)
SELECT n.id, s.name, normalize_turkish(s.name), s.street_type
FROM neighborhoods n
JOIN districts d ON n.district_id = d.id
JOIN cities c ON d.city_id = c.id
CROSS JOIN (VALUES
('18 MART (Sokak)', 'sokak'),
('AHMET MİTHATEFENDİ (Cadde)', 'cadde'),
('ALAGEYİK (Sokak)', 'sokak'),
('ALARA (Sokak)', 'sokak'),
('ALİ FUAT BAŞGİL (Sokak)', 'sokak'),
('ALPTEKİN (Sokak)', 'sokak'),
('ASLANBEY (Sokak)', 'sokak'),
('BAHÇE (Sokak)', 'sokak'),
('BARBAROS (Cadde)', 'cadde'),
('BEDİA MUVAHHIT (Sokak)', 'sokak'),
('BERK (Sokak)', 'sokak'),
('CELALETTİN ARIF (Sokak)', 'sokak'),
('DALGA (Sokak)', 'sokak'),
('DİNÇER (Sokak)', 'sokak'),
('DOĞRU (Sokak)', 'sokak'),
('DÜMEN (Sokak)', 'sokak'),
('EGE (Sokak)', 'sokak'),
('ERDEM (Sokak)', 'sokak'),
('EZEL (Sokak)', 'sokak'),
('FENER KALAMIS (Cadde)', 'cadde'),
('FİDANLIK (Sokak)', 'sokak'),
('GEMİCİ (Sokak)', 'sokak'),
('GÜL (Sokak)', 'sokak'),
('GÜLLER (Sokak)', 'sokak'),
('GÜLSEN (Sokak)', 'sokak'),
('GÜLSEREN (Sokak)', 'sokak'),
('GÜNEŞ (Sokak)', 'sokak'),
('HATIBOĞLU (Sokak)', 'sokak'),
('HAYDAR (Sokak)', 'sokak'),
('İBRAHİM TALI (Sokak)', 'sokak'),
('İNCİRLİ (Sokak)', 'sokak'),
('İSKELE (Sokak)', 'sokak'),
('KALAMIŞ (Cadde)', 'cadde'),
('KANARYA (Sokak)', 'sokak'),
('KARADUT (Sokak)', 'sokak'),
('LALE (Sokak)', 'sokak'),
('MARMARA (Sokak)', 'sokak'),
('MENEKŞE (Sokak)', 'sokak'),
('MİNE (Sokak)', 'sokak'),
('MODA (Cadde)', 'cadde'),
('NENE HATUN (Sokak)', 'sokak'),
('NİGAR (Sokak)', 'sokak'),
('OTAĞTEPE (Sokak)', 'sokak'),
('ÖĞÜT (Sokak)', 'sokak'),
('ÖZDEN (Sokak)', 'sokak'),
('PÜRTELAŞ (Sokak)', 'sokak'),
('RECEPPEKERİ (Cadde)', 'cadde'),
('REŞAT NURİ GÜNTEKİN (Sokak)', 'sokak'),
('SAFİ (Sokak)', 'sokak'),
('SARI KANARYALı (Sokak)', 'sokak'),
('SEDEF (Sokak)', 'sokak'),
('SİNAN (Sokak)', 'sokak'),
('TUNCELİ (Sokak)', 'sokak'),
('USLU (Sokak)', 'sokak'),
('YALI (Sokak)', 'sokak'),
('YASEMİN (Sokak)', 'sokak'),
('YILDIZ (Sokak)', 'sokak'),
('ZEKİ (Sokak)', 'sokak')
) AS s(name, street_type)
WHERE c.name = 'Istanbul' AND d.name = 'Kadikoy' AND n.name = 'Fenerbahce'
ON CONFLICT (neighborhood_id, name) DO NOTHING;

-- KADIKOY - MODA SOKAK/CADDELERI
INSERT INTO streets (neighborhood_id, name, name_ascii, street_type)
SELECT n.id, s.name, normalize_turkish(s.name), s.street_type
FROM neighborhoods n
JOIN districts d ON n.district_id = d.id
JOIN cities c ON d.city_id = c.id
CROSS JOIN (VALUES
('ALEM (Sokak)', 'sokak'),
('ATAŞEHIT (Sokak)', 'sokak'),
('BAHAR (Sokak)', 'sokak'),
('CAFERAĞA (Sokak)', 'sokak'),
('DAMGA (Sokak)', 'sokak'),
('DİLARA (Sokak)', 'sokak'),
('DR. ESAT IŞIK (Cadde)', 'cadde'),
('FERAH (Sokak)', 'sokak'),
('FETHI BEY (Sokak)', 'sokak'),
('GAZİ MUSTAFA KEMAL PAŞA (Cadde)', 'cadde'),
('GENERAL ASIM GÜNDÜZ (Cadde)', 'cadde'),
('GÜZELBAHÇE (Sokak)', 'sokak'),
('HAMDİ RIFAT (Sokak)', 'sokak'),
('HAMİDİYE (Sokak)', 'sokak'),
('HARE (Sokak)', 'sokak'),
('HAYRETTİN ESMER (Sokak)', 'sokak'),
('İMRAHOR (Sokak)', 'sokak'),
('KONT (Sokak)', 'sokak'),
('LİMAN (Sokak)', 'sokak'),
('MODA (Cadde)', 'cadde'),
('MODA İSKELESİ (Sokak)', 'sokak'),
('NEŞVENİGAR (Sokak)', 'sokak'),
('OLGUN (Sokak)', 'sokak'),
('REFİK SAYDAMi (Sokak)', 'sokak'),
('SABRİ (Sokak)', 'sokak'),
('SAHİL (Sokak)', 'sokak'),
('ŞAİR LEYLA (Sokak)', 'sokak'),
('YUSUFKAMIL PAŞA (Sokak)', 'sokak')
) AS s(name, street_type)
WHERE c.name = 'Istanbul' AND d.name = 'Kadikoy' AND n.name = 'Moda'
ON CONFLICT (neighborhood_id, name) DO NOTHING;

-- BESIKTAS - BEBEK SOKAK/CADDELERI
INSERT INTO streets (neighborhood_id, name, name_ascii, street_type)
SELECT n.id, s.name, normalize_turkish(s.name), s.street_type
FROM neighborhoods n
JOIN districts d ON n.district_id = d.id
JOIN cities c ON d.city_id = c.id
CROSS JOIN (VALUES
('AKASYA (Sokak)', 'sokak'),
('BEBEK (Yolu)', 'sokak'),
('CEVDET PAŞA (Cadde)', 'cadde'),
('ÇALIKUŞU (Sokak)', 'sokak'),
('ÇINARALTI (Sokak)', 'sokak'),
('DERE (Sokak)', 'sokak'),
('DOLAPDERE (Cadde)', 'cadde'),
('ERZURUM (Sokak)', 'sokak'),
('FERIDUN EVREN (Sokak)', 'sokak'),
('GÜL (Sokak)', 'sokak'),
('GÜNGÖREN (Sokak)', 'sokak'),
('HACI EMIN PAŞA (Sokak)', 'sokak'),
('HIŞT HIŞT (Sokak)', 'sokak'),
('IRGAT PAZARI (Sokak)', 'sokak'),
('KIBRIS ŞEHİTLERİ (Cadde)', 'cadde'),
('KÖYBAŞI (Cadde)', 'cadde'),
('KÜÇÜKBEBEK (Cadde)', 'cadde'),
('LALEAZAR (Sokak)', 'sokak'),
('MANOLYA (Sokak)', 'sokak'),
('NADİR NADI (Sokak)', 'sokak'),
('RIZA (Sokak)', 'sokak'),
('ŞEFTALI (Sokak)', 'sokak'),
('TAVŞAN (Sokak)', 'sokak'),
('ULUS PARKI (Sokak)', 'sokak'),
('VEYSELKARANİ (Sokak)', 'sokak'),
('YEMİŞ (Sokak)', 'sokak'),
('YOLCU (Sokak)', 'sokak')
) AS s(name, street_type)
WHERE c.name = 'Istanbul' AND d.name = 'Besiktas' AND n.name = 'Bebek'
ON CONFLICT (neighborhood_id, name) DO NOTHING;

-- BESIKTAS - LEVENT SOKAK/CADDELERI
INSERT INTO streets (neighborhood_id, name, name_ascii, street_type)
SELECT n.id, s.name, normalize_turkish(s.name), s.street_type
FROM neighborhoods n
JOIN districts d ON n.district_id = d.id
JOIN cities c ON d.city_id = c.id
CROSS JOIN (VALUES
('AÇELYA (Sokak)', 'sokak'),
('AHLAT (Sokak)', 'sokak'),
('AKASYA (Sokak)', 'sokak'),
('ALDEMİR (Sokak)', 'sokak'),
('ALTUNAY (Sokak)', 'sokak'),
('ARMUTBELİ (Sokak)', 'sokak'),
('AYTAR (Cadde)', 'cadde'),
('BEBEK LEVENT (Yolu)', 'sokak'),
('BELVÜ (Sokak)', 'sokak'),
('BÜYÜKDERE (Cadde)', 'cadde'),
('CEVİZ (Sokak)', 'sokak'),
('ÇAMLICA (Sokak)', 'sokak'),
('ÇAYIR (Sokak)', 'sokak'),
('DEFNE (Sokak)', 'sokak'),
('DİKİLİTAŞ (Sokak)', 'sokak'),
('ERGENEKON (Sokak)', 'sokak'),
('FELİK PAŞA (Sokak)', 'sokak'),
('FINDIK (Sokak)', 'sokak'),
('HAMDİ SAPLIK (Sokak)', 'sokak'),
('KANYON (Sokak)', 'sokak'),
('KAVACIK (Sokak)', 'sokak'),
('KORU (Sokak)', 'sokak'),
('KÖYBAŞI (Sokak)', 'sokak'),
('LEVENT (Cadde)', 'cadde'),
('MAĞRA (Sokak)', 'sokak'),
('MAYA (Sokak)', 'sokak'),
('NARÇIÇEĞI (Sokak)', 'sokak'),
('NISPETIYE (Cadde)', 'cadde'),
('ORTAKLAR (Sokak)', 'sokak'),
('PLATIN (Sokak)', 'sokak'),
('SAFIR (Sokak)', 'sokak'),
('SELENGA (Sokak)', 'sokak'),
('TEVFİK FİKRET (Sokak)', 'sokak'),
('ULUS (Sokak)', 'sokak'),
('VATAN (Sokak)', 'sokak'),
('YONCALI (Sokak)', 'sokak'),
('ZEYTİNLİK (Sokak)', 'sokak')
) AS s(name, street_type)
WHERE c.name = 'Istanbul' AND d.name = 'Besiktas' AND n.name = 'Levent'
ON CONFLICT (neighborhood_id, name) DO NOTHING;

-- SISLI - NISANTASI SOKAK/CADDELERI
INSERT INTO streets (neighborhood_id, name, name_ascii, street_type)
SELECT n.id, s.name, normalize_turkish(s.name), s.street_type
FROM neighborhoods n
JOIN districts d ON n.district_id = d.id
JOIN cities c ON d.city_id = c.id
CROSS JOIN (VALUES
('ABDI İPEKÇİ (Cadde)', 'cadde'),
('AKKAVAK (Sokak)', 'sokak'),
('ATIYE (Sokak)', 'sokak'),
('BRONZ (Sokak)', 'sokak'),
('DR. MELİHA GÜLTEKİN (Sokak)', 'sokak'),
('GÜNEŞ (Sokak)', 'sokak'),
('HAMDİ (Sokak)', 'sokak'),
('HÜSREV GELİŞKEN (Sokak)', 'sokak'),
('İHLAMURDERE (Cadde)', 'cadde'),
('İLHAN (Sokak)', 'sokak'),
('İSTANBUL (Sokak)', 'sokak'),
('KORE GAZILER (Sokak)', 'sokak'),
('MAÇKA (Cadde)', 'cadde'),
('MANOLYA (Sokak)', 'sokak'),
('MAVİ KARANFIL (Sokak)', 'sokak'),
('MİM KEMAL ÖKE (Cadde)', 'cadde'),
('NECATİ SABİT (Sokak)', 'sokak'),
('OLGUNLAR (Sokak)', 'sokak'),
('PARK (Sokak)', 'sokak'),
('SALİHEFENDİ (Sokak)', 'sokak'),
('SAMİ ÖNARICI (Sokak)', 'sokak'),
('SERPİ (Sokak)', 'sokak'),
('TAVUKÇU BEKIR (Sokak)', 'sokak'),
('TEŞVİKİYE (Cadde)', 'cadde'),
('TOPAĞACI (Cadde)', 'cadde'),
('ÜZÜM (Sokak)', 'sokak'),
('VALI KONAGI (Cadde)', 'cadde'),
('VEKİL HARÇ (Sokak)', 'sokak'),
('YENİ ÇEŞİTLİK (Sokak)', 'sokak'),
('YILDIZ POSTA (Cadde)', 'cadde')
) AS s(name, street_type)
WHERE c.name = 'Istanbul' AND d.name = 'Sisli' AND n.name = 'Nisantasi'
ON CONFLICT (neighborhood_id, name) DO NOTHING;

-- BEYOGLU - TAKSIM SOKAK/CADDELERI
INSERT INTO streets (neighborhood_id, name, name_ascii, street_type)
SELECT n.id, s.name, normalize_turkish(s.name), s.street_type
FROM neighborhoods n
JOIN districts d ON n.district_id = d.id
JOIN cities c ON d.city_id = c.id
CROSS JOIN (VALUES
('AĞAHAMAM (Sokak)', 'sokak'),
('AYA HATIM (Sokak)', 'sokak'),
('BALO (Sokak)', 'sokak'),
('BAYRAM (Sokak)', 'sokak'),
('BÜYÜK BAYRAM (Sokak)', 'sokak'),
('CUMHURIYET (Cadde)', 'cadde'),
('DEFTERDAR YOKUŞU (Sokak)', 'sokak'),
('ELMADAĞ (Sokak)', 'sokak'),
('GEZI (Yolu)', 'sokak'),
('GÜZELBAHÇE (Sokak)', 'sokak'),
('HADİYE (Sokak)', 'sokak'),
('İNÖNÜ (Cadde)', 'cadde'),
('İSTİKLAL (Cadde)', 'cadde'),
('KARANFIL (Sokak)', 'sokak'),
('KAZANCI (Sokak)', 'sokak'),
('KÜÇÜK BAYRAM (Sokak)', 'sokak'),
('LATİF HOCA (Sokak)', 'sokak'),
('NUR-U ZİYA (Sokak)', 'sokak'),
('NUZHET EFENDİ (Sokak)', 'sokak'),
('ORDA (Sokak)', 'sokak'),
('REFİK SAYDAM (Cadde)', 'cadde'),
('SAİT (Sokak)', 'sokak'),
('SIRA SELVİLER (Cadde)', 'cadde'),
('SOĞANCI (Sokak)', 'sokak'),
('ŞEHİT MUHTAR (Cadde)', 'cadde'),
('TALIMHANE (Sokak)', 'sokak'),
('TAKSİM (Meydanı)', 'meydan'),
('TOPÇU (Cadde)', 'cadde'),
('TÜRKOCAĞI (Sokak)', 'sokak'),
('ZAMBAK (Sokak)', 'sokak')
) AS s(name, street_type)
WHERE c.name = 'Istanbul' AND d.name = 'Beyoglu' AND n.name = 'Taksim'
ON CONFLICT (neighborhood_id, name) DO NOTHING;

-- FATIH - SULTANAHMET SOKAK/CADDELERI
INSERT INTO streets (neighborhood_id, name, name_ascii, street_type)
SELECT n.id, s.name, normalize_turkish(s.name), s.street_type
FROM neighborhoods n
JOIN districts d ON n.district_id = d.id
JOIN cities c ON d.city_id = c.id
CROSS JOIN (VALUES
('AKBIYIK (Cadde)', 'cadde'),
('ALEMDAR (Cadde)', 'cadde'),
('AMBAR ARKASI (Sokak)', 'sokak'),
('AYASOFYA (Meydanı)', 'meydan'),
('CAFERİYE (Sokak)', 'sokak'),
('CANKURTARAN (Cadde)', 'cadde'),
('DİVAN YOLU (Cadde)', 'cadde'),
('DR. ŞEFIK YİLMAZ (Sokak)', 'sokak'),
('HİPODROM (Sokak)', 'sokak'),
('İSHAK PAŞA (Cadde)', 'cadde'),
('KABASAKAL (Cadde)', 'cadde'),
('KUTLUGÜN (Sokak)', 'sokak'),
('PEYKHANE (Sokak)', 'sokak'),
('SOĞUKÇEŞME (Sokak)', 'sokak'),
('SULTANAHMET (Meydanı)', 'meydan'),
('TAVUKHANE (Sokak)', 'sokak'),
('TORUN (Sokak)', 'sokak'),
('UTANGAÇ (Sokak)', 'sokak'),
('YEREBATAN (Cadde)', 'cadde')
) AS s(name, street_type)
WHERE c.name = 'Istanbul' AND d.name = 'Fatih' AND n.name = 'Sultanahmet'
ON CONFLICT (neighborhood_id, name) DO NOTHING;

-- USKUDAR - CENGELKOY SOKAK/CADDELERI
INSERT INTO streets (neighborhood_id, name, name_ascii, street_type)
SELECT n.id, s.name, normalize_turkish(s.name), s.street_type
FROM neighborhoods n
JOIN districts d ON n.district_id = d.id
JOIN cities c ON d.city_id = c.id
CROSS JOIN (VALUES
('AHMET FETGERI (Sokak)', 'sokak'),
('BALABAN (Sokak)', 'sokak'),
('BALABAN İSKELESİ (Cadde)', 'cadde'),
('BEKTAŞİ (Sokak)', 'sokak'),
('ÇENGELKÖY (Cadde)', 'cadde'),
('ÇINAR (Sokak)', 'sokak'),
('ÇIRAGÇI (Sokak)', 'sokak'),
('DAL (Sokak)', 'sokak'),
('DAMLA (Sokak)', 'sokak'),
('DEĞİRMEN (Sokak)', 'sokak'),
('EŞRAF (Sokak)', 'sokak'),
('FINDIK (Sokak)', 'sokak'),
('GÜLABI (Sokak)', 'sokak'),
('GÜLFEM HANIM (Sokak)', 'sokak'),
('HACı EMİN (Sokak)', 'sokak'),
('HACı PAŞA (Sokak)', 'sokak'),
('IŞIK (Sokak)', 'sokak'),
('İMRÖZ (Sokak)', 'sokak'),
('KAVAK (Sokak)', 'sokak'),
('KOĞACI (Sokak)', 'sokak'),
('KULELI (Cadde)', 'cadde'),
('LEYLAK (Sokak)', 'sokak'),
('MAHİR İZ (Cadde)', 'cadde'),
('MEŞRUTIYET (Sokak)', 'sokak'),
('NARÇıÇEĞİ (Sokak)', 'sokak'),
('PAŞA LİMANI (Cadde)', 'cadde'),
('SAKIZAĞACI (Sokak)', 'sokak'),
('SELVİ (Sokak)', 'sokak'),
('ŞEMSETTIN GÜNALTAY (Cadde)', 'cadde'),
('TRABZON (Sokak)', 'sokak'),
('YAKUT (Sokak)', 'sokak'),
('YEDEK (Sokak)', 'sokak'),
('YEŞİL (Sokak)', 'sokak'),
('YUSUF KAMIL PAŞA (Sokak)', 'sokak'),
('ZEYTİN (Sokak)', 'sokak'),
('ZEYTİNBURNU (Sokak)', 'sokak')
) AS s(name, street_type)
WHERE c.name = 'Istanbul' AND d.name = 'Uskudar' AND n.name = 'Cengelkoy'
ON CONFLICT (neighborhood_id, name) DO NOTHING;
