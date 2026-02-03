-- Add can_convert_points column to customer_users table
-- This permission allows staff users to convert collected points to vouchers

ALTER TABLE customer_users
ADD COLUMN IF NOT EXISTS can_convert_points BOOLEAN DEFAULT false;

-- Add comment explaining the column
COMMENT ON COLUMN customer_users.can_convert_points IS 'Alt kullanicinin toplanan puanlari ceke donusturme yetkisi';

-- Existing owner users should have this permission by default
UPDATE customer_users
SET can_convert_points = true
WHERE role = 'owner' AND can_convert_points IS NULL;
