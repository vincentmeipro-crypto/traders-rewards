-- ============================================================
-- MIGRATION : CREATE SETTINGS TABLE
-- Traders Rewards V2 — Phase 1
-- Date : 2026-08-06
-- ============================================================
-- Cette table stocke les paramètres configurables de la plateforme.
-- Elle remplace progressivement les valeurs hardcodées dans le code.
--
-- IMPORTANT :
-- Les paramètres challenges.* sont des DEFAULTS GLOBAUX uniquement.
-- La Phase 2 introduira un Challenge Engine avec configuration
-- par produit (product_id → règles spécifiques).
-- Ne jamais utiliser cette table comme moteur de challenge.
--
-- Architecture multi-tenant future :
-- Une colonne tenant_id sera ajoutée en Phase 8 (White-label).
-- Le schéma actuel est conçu pour rendre cette évolution non destructive.
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        UNIQUE NOT NULL,
  value       JSONB       NOT NULL,
  category    TEXT        NOT NULL CHECK (category IN (
                'branding', 'trading', 'challenges',
                'payouts', 'emails', 'general'
              )),
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index sur category pour le filtrage par catégorie (interface admin)
CREATE INDEX IF NOT EXISTS settings_category_idx ON settings(category);

-- Trigger : mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_settings_timestamp();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
-- Lecture : utilisateurs authentifiés uniquement
-- Écriture : service_role uniquement (backend vérifie RBAC côté API)
-- Le frontend ne peut jamais écrire directement.
-- ============================================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read_authenticated" ON settings;
CREATE POLICY "settings_read_authenticated"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "settings_write_service_role" ON settings;
CREATE POLICY "settings_write_service_role"
  ON settings FOR ALL
  TO service_role
  USING (true);

-- ============================================================
-- DONNÉES INITIALES
-- Reproduisent EXACTEMENT les valeurs actuellement hardcodées.
-- Le comportement production est identique avant et après.
-- ============================================================

INSERT INTO settings (key, category, description, value) VALUES

-- ── BRANDING ─────────────────────────────────────────────────
('branding.brand_name',
  'branding',
  'Nom de la marque affiché sur la plateforme',
  '"Traders Rewards"'),

('branding.site_url',
  'branding',
  'URL racine du site sans slash final',
  '"https://www.traders-rewards.eu"'),

('branding.logo_url',
  'branding',
  'URL du logo utilisé dans les emails',
  '"https://www.traders-rewards.eu/logo-email-small.png"'),

('branding.support_email',
  'branding',
  'Email de support affiché aux traders',
  '"contact@traders-rewards.eu"'),

('branding.sender_name',
  'branding',
  'Nom expéditeur des emails transactionnels',
  '"Traders Rewards"'),

('branding.sender_email',
  'branding',
  'Adresse email expéditeur (doit être vérifiée dans Resend)',
  '"contact@traders-rewards.eu"'),

-- ── TRADING — MT5 Groups ─────────────────────────────────────
-- Ces groupes correspondent aux groupes configurés côté broker.
-- Une modification ici ne prend effet qu'à la prochaine création de compte.
-- Les comptes existants ne sont pas migrés automatiquement.
('trading.mt5_group_2step',
  'trading',
  'Groupe MT5 pour les challenges 2-Step (Phase 1 et 2)',
  '"HAR/MAN32/demoG1"'),

('trading.mt5_group_1step',
  'trading',
  'Groupe MT5 pour les challenges 1-Step',
  '"HAR/MAN32/demoG2"'),

('trading.mt5_group_funded_2step',
  'trading',
  'Groupe MT5 pour les comptes Funded 2-Step',
  '"HAR/MAN32/demoG3"'),

('trading.mt5_group_funded_1step',
  'trading',
  'Groupe MT5 pour les comptes Funded 1-Step',
  '"HAR/MAN32/demoG4"'),

('trading.mt5_group_disabled',
  'trading',
  'Groupe MT5 pour les comptes désactivés / breach',
  '"HAR/MAN32/demoG5"'),

-- ── CHALLENGES — Defaults globaux ────────────────────────────
-- IMPORTANT : Ces valeurs sont des DEFAULTS GLOBAUX uniquement.
-- Elles servent de point de départ pour les nouveaux challenges.
-- La Phase 2 introduira une configuration par produit.
-- Ne pas construire de logique de challenge engine autour de ces clés.
('challenges.profit_target',
  'challenges',
  'Objectif de profit par défaut en % (défaut global Phase 1)',
  '10'),

('challenges.daily_dd_1step',
  'challenges',
  'Drawdown journalier maximum pour les challenges 1-Step en %',
  '3'),

('challenges.daily_dd_2step',
  'challenges',
  'Drawdown journalier maximum pour les challenges 2-Step en %',
  '5'),

('challenges.total_dd_default',
  'challenges',
  'Drawdown total maximum par défaut en %',
  '10'),

-- ── PAYOUTS ──────────────────────────────────────────────────
('payouts.profit_split_1step',
  'payouts',
  'Pourcentage de profit reversé au trader pour les comptes 1-Step',
  '90'),

('payouts.profit_split_2step',
  'payouts',
  'Pourcentage de profit reversé au trader pour les comptes 2-Step',
  '80'),

-- ── GENERAL ──────────────────────────────────────────────────
('general.platform_version',
  'general',
  'Version de la plateforme (informatif)',
  '"2.0"')

ON CONFLICT (key) DO NOTHING;
