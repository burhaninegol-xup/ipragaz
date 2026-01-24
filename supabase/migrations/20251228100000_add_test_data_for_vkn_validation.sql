-- Test verileri: VKN validasyonu test etmek için
-- Bu migration'ı çalıştırdıktan sonra VKN: 1234567890 ile test yapabilirsiniz

-- Test için ikinci bir bayi oluştur (eğer yoksa)
INSERT INTO dealers (id, name, code, city, district, phone, is_active)
SELECT
    gen_random_uuid(),
    'Test Bayi 2',
    'TEST002',
    'İstanbul',
    'Kadıköy',
    '5559998877',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM dealers WHERE code = 'TEST002'
);

-- Test müşteri oluştur (VKN: 1234567890)
INSERT INTO customers (id, vkn, name, company_name, phone, email, address, is_active)
SELECT
    gen_random_uuid(),
    '1234567890',
    'Test Müşteri (Başka Bayi ile Anlaşmalı)',
    'Test Şirket Ltd. Şti.',
    '5551234567',
    'testmusteri@test.com',
    'Test Müşteri Adresi',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM customers WHERE vkn = '1234567890'
);

-- Test bayi 2 ve test müşteri arasında kabul edilmiş teklif oluştur
INSERT INTO offers (id, dealer_id, customer_id, status, notes, created_at)
SELECT
    gen_random_uuid(),
    (SELECT id FROM dealers WHERE code = 'TEST002' LIMIT 1),
    (SELECT id FROM customers WHERE vkn = '1234567890' LIMIT 1),
    'accepted',
    'Test için oluşturulmuş teklif - VKN validasyonu test etmek için',
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM offers
    WHERE customer_id = (SELECT id FROM customers WHERE vkn = '1234567890' LIMIT 1)
    AND dealer_id = (SELECT id FROM dealers WHERE code = 'TEST002' LIMIT 1)
);

-- Teklif detayları ekle (ilk ürün için örnek fiyat)
INSERT INTO offer_details (id, offer_id, product_id, unit_price, commitment_quantity)
SELECT
    gen_random_uuid(),
    (SELECT o.id FROM offers o
     JOIN customers c ON o.customer_id = c.id
     WHERE c.vkn = '1234567890' LIMIT 1),
    (SELECT id FROM products LIMIT 1),
    350.00,
    10
WHERE EXISTS (
    SELECT 1 FROM offers o
    JOIN customers c ON o.customer_id = c.id
    WHERE c.vkn = '1234567890'
)
AND EXISTS (
    SELECT 1 FROM products
)
AND NOT EXISTS (
    SELECT 1 FROM offer_details od
    JOIN offers o ON od.offer_id = o.id
    JOIN customers c ON o.customer_id = c.id
    WHERE c.vkn = '1234567890'
);
