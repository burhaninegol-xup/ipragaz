-- Müşteri adresleri tablosu
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(150),
    street VARCHAR(200),
    building_no VARCHAR(20),
    floor VARCHAR(10),
    apartment VARCHAR(20),
    address_description TEXT,
    full_address TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for faster lookups by customer
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- Grant permissions
GRANT ALL ON customer_addresses TO anon;
GRANT ALL ON customer_addresses TO authenticated;
GRANT ALL ON customer_addresses TO service_role;
