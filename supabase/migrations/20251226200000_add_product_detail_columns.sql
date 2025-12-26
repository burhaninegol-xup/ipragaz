-- Ürün detay sayfası için yeni kolonlar
-- Products tablosuna eklenen alanlar

-- Ürün açıklaması
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;

-- Teknik özellikler
ALTER TABLE products ADD COLUMN IF NOT EXISTS color VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_mm INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS diameter_mm INTEGER;

-- Uyarılar
ALTER TABLE products ADD COLUMN IF NOT EXISTS warnings TEXT;

-- Örnek veri güncellemesi (12 Kg Uzun İşYerim Tüpü için)
UPDATE products
SET
    description = 'Enerji ihtiyacının olduğu tüm işletmeler ve imalathanelerde yüksek ve düşük basınçlı dedantörler ile birlikte LPG''li cihazlarda kullanılır. Clip-on vana ile dedantörün kolay montajını sağlar. İpragaz tarafından EPDK''ya bildirilen KDV dahil tavan satış fiyatıdır. Depozito fiyatı dahil değildir.',
    color = 'Mavi',
    height_mm = 570,
    diameter_mm = 300,
    warnings = '12 kg İşYerim Tüpü kullandığınız cihaza uygun, tam güvenli, standartlara uygun dedantör ile kullanabilirsiniz. Güvenliğiniz için tüpü bodrum katta bulundurmamalısınız. Güvenliğiniz için dedantörü üretim tarihinden itibaren 10 yılda 1, hortumu da 3 yılda 1 değiştirmeniz gerektiğini lütfen unutmayınız!'
WHERE code = 'IPR-ISYERIM-12-UZUN' OR name LIKE '%12 Kg%Uzun%İşYerim%';

-- Diğer ürünler için varsayılan değerler
UPDATE products
SET
    description = COALESCE(description, 'İpragaz kalitesi ve güvencesiyle sunulan LPG tüpü. Enerji ihtiyaçlarınız için ideal çözüm.'),
    color = COALESCE(color, 'Mavi'),
    warnings = COALESCE(warnings, 'Tüpü kullandığınız cihaza uygun, güvenli ve standartlara uygun dedantör ile kullanınız. Güvenliğiniz için tüpü bodrum katta bulundurmayınız.')
WHERE description IS NULL;
