-- Rutin siparişlere frekans kolonu ekle (daily, weekly, biweekly, monthly)
ALTER TABLE recurring_orders ADD COLUMN IF NOT EXISTS frequency VARCHAR(20) DEFAULT 'weekly';
COMMENT ON COLUMN recurring_orders.frequency IS 'daily: Günlük, weekly: Haftalık, biweekly: 2 Haftalık, monthly: Aylık';
