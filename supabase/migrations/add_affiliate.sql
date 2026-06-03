-- Add affiliate_code column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS affiliate_code TEXT UNIQUE;

-- Affiliate conversions tracking
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_user_id UUID NOT NULL,
  buyer_user_id UUID,
  stripe_session_id TEXT UNIQUE,
  amount_paid NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0.10,
  commission_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aff_conv_affiliate ON affiliate_conversions(affiliate_user_id);
