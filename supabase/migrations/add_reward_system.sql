-- Create user_rewards table for tracking points and milestones
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_streak_date DATE,
  milestones_achieved JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create reward_history table for tracking redemptions and point awards
CREATE TABLE IF NOT EXISTS reward_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed')),
  points INTEGER NOT NULL,
  reason TEXT,
  milestone INTEGER,
  voucher_code TEXT,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vouchers table for tracking generated vouchers
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_amount INTEGER NOT NULL,
  points_used INTEGER NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- User can only see their own rewards
CREATE POLICY "Users can view own rewards"
  ON user_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards"
  ON user_rewards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewards"
  ON user_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User can only see their own reward history
CREATE POLICY "Users can view own reward history"
  ON reward_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reward history"
  ON reward_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User can only see their own vouchers
CREATE POLICY "Users can view own vouchers"
  ON vouchers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vouchers"
  ON vouchers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vouchers"
  ON vouchers FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_user_id ON reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_created_at ON reward_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_rewards_timestamp
  BEFORE UPDATE ON user_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rewards_updated_at();
