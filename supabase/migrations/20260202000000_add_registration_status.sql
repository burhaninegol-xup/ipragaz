-- Add registration_status column to customers table
-- Tracks who created the customer record: dealer or customer themselves

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) DEFAULT 'customer_registered';

-- Add comment explaining the values
COMMENT ON COLUMN customers.registration_status IS 'dealer_created = Bayi tarafından teklif sayfasında oluşturuldu (henüz müşteri kayıt olmadı), customer_registered = Müşteri kendisi Üye Ol formundan kayıt oldu';

-- Update existing records to have proper status
-- All existing customers are assumed to be customer_registered
UPDATE customers
SET registration_status = 'customer_registered'
WHERE registration_status IS NULL;
