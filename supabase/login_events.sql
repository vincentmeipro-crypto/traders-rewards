-- Table pour tracker les connexions (sécurité / détection fraude)
CREATE TABLE IF NOT EXISTS login_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email   TEXT,
  ip           TEXT,
  country      TEXT,
  is_vpn       BOOLEAN DEFAULT FALSE,
  fingerprint  TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour requêtes rapides
CREATE INDEX IF NOT EXISTS idx_login_events_ip          ON login_events(ip);
CREATE INDEX IF NOT EXISTS idx_login_events_fingerprint ON login_events(fingerprint);
CREATE INDEX IF NOT EXISTS idx_login_events_user_email  ON login_events(user_email);
CREATE INDEX IF NOT EXISTS idx_login_events_created_at  ON login_events(created_at DESC);

-- Désactiver RLS (accès admin uniquement via service_role)
ALTER TABLE login_events DISABLE ROW LEVEL SECURITY;
