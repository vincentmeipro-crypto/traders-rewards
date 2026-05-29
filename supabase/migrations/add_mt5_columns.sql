ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS mt5_login            BIGINT,
  ADD COLUMN IF NOT EXISTS mt5_password         TEXT,
  ADD COLUMN IF NOT EXISTS mt5_password_investor TEXT,
  ADD COLUMN IF NOT EXISTS mt5_server           TEXT;
