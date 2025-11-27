-- Add unique constraint to daily_consumption table
-- This ensures one entry per user per day

-- First, remove any duplicate entries (keep the most recent one)
DELETE FROM daily_consumption a
USING daily_consumption b
WHERE a.user_id = b.user_id
  AND a.date = b.date
  AND a.created_at < b.created_at;

-- Add unique constraint
ALTER TABLE daily_consumption
ADD CONSTRAINT daily_consumption_user_date_unique UNIQUE (user_id, date);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_consumption_user_date 
ON daily_consumption(user_id, date);
