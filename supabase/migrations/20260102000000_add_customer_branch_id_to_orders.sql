-- Add customer_branch_id column to orders table
-- This stores which branch the order was placed for

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_branch_id UUID REFERENCES customer_branches(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer_branch_id ON orders(customer_branch_id);
