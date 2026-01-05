-- =============================================
-- Last Selected Branch Tracking
-- Kullanicinin son sectigi subeyi kaydetmek icin
-- =============================================

-- customer_users tablosuna last_selected_branch_id ekle
ALTER TABLE customer_users
ADD COLUMN IF NOT EXISTS last_selected_branch_id UUID REFERENCES customer_branches(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_users_last_branch ON customer_users(last_selected_branch_id);

-- Comment
COMMENT ON COLUMN customer_users.last_selected_branch_id IS 'Kullanicinin son sectigi sube - login sirasinda otomatik yuklenir';
