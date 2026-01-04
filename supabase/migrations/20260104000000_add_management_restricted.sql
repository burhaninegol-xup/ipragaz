-- Add management_restricted column to customers table
-- When true, customer cannot manage branches or users from isyerim-musteri pages

ALTER TABLE customers ADD COLUMN IF NOT EXISTS management_restricted BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN customers.management_restricted IS 'When true, customer cannot add/edit/delete branches or users from customer portal. Only backoffice can manage.';
