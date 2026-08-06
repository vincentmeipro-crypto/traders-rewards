-- ================================================================
-- PHASE 2B-1 — DATABASE FOUNDATION
-- Traders Rewards — Challenge Engine
-- 2026-08-06
--
-- INSTRUCTIONS : À exécuter intégralement dans l'éditeur SQL Supabase.
-- Toutes les instructions sont idempotentes (IF NOT EXISTS / ON CONFLICT).
-- Aucune donnée existante n'est modifiée.
--
-- SÉCURITÉ :
--   - metaapi/sync : NON IMPACTÉ (lit les colonnes existantes inchangées)
--   - mt5-snapshot : NON IMPACTÉ (non modifié)
--   - challenges existants : product_id=NULL, rules_snapshot=NULL → transparents
-- ================================================================


-- ----------------------------------------------------------------
-- §0 : Helper updated_at (idempotent — peut déjà exister depuis Phase 1)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ================================================================
-- §1 — TABLE challenge_products
-- ================================================================
CREATE TABLE IF NOT EXISTS challenge_products (
  id                  uuid         NOT NULL DEFAULT gen_random_uuid(),
  slug                text         NOT NULL,
  name                text         NOT NULL,
  description         text,
  model               text         NOT NULL,
  account_size        text         NOT NULL,          -- label affiché "$50,000"
  balance_usd         integer      NOT NULL,          -- valeur numérique 50000
  price_eur_cents     integer      NOT NULL,          -- 29900 = €299.00 (carte ET crypto)
  price_crypto_cents  integer,                        -- NULL = identique à price_eur_cents
  currency            text         NOT NULL DEFAULT 'EUR',
  active              boolean      NOT NULL DEFAULT true,
  display_order       integer      NOT NULL DEFAULT 0,
  max_cumul_usd       integer,                        -- NULL = pas de plafond de cumul actifs
  leverage            integer      NOT NULL DEFAULT 100,
  mt5_group_challenge text,                           -- NULL = depuis settings table (Phase 1)
  mt5_group_funded    text,                           -- NULL = depuis settings table (Phase 1)
  version             integer      NOT NULL DEFAULT 1, -- hook versioning futur (non utilisé Phase 2)
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now(),
  created_by          text,
  CONSTRAINT challenge_products_pkey     PRIMARY KEY (id),
  CONSTRAINT challenge_products_slug_uk  UNIQUE (slug),
  CONSTRAINT challenge_products_model_ck CHECK (model IN ('1step', '2step', 'vip'))
);

CREATE OR REPLACE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON challenge_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ================================================================
-- §2 — TABLE challenge_product_phases
-- ================================================================
CREATE TABLE IF NOT EXISTS challenge_product_phases (
  id                uuid         NOT NULL DEFAULT gen_random_uuid(),
  product_id        uuid         NOT NULL,
  phase_order       integer      NOT NULL,   -- 1, 2, 3… (dernier = funded)
  phase_label       text         NOT NULL,   -- "Phase 1", "Phase 2", "Funded"
  phase_type        text         NOT NULL,   -- "challenge" | "funded"
  profit_target     numeric(5,2),            -- % objectif. NULL pour type funded.
  daily_drawdown    numeric(5,2) NOT NULL,   -- % drawdown journalier max
  total_drawdown    numeric(5,2) NOT NULL,   -- % drawdown total max
  min_trading_days  integer      NOT NULL DEFAULT 5,
  max_trading_days  integer,                 -- NULL = illimité
  profit_split      numeric(5,2),            -- % part trader (funded seulement)
  mt5_group         text,                    -- override MT5 group pour cette phase (NULL = settings)
  created_at        timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT challenge_product_phases_pkey    PRIMARY KEY (id),
  CONSTRAINT challenge_product_phases_uniq    UNIQUE (product_id, phase_order),
  CONSTRAINT challenge_product_phases_type_ck CHECK (phase_type IN ('challenge', 'funded')),
  CONSTRAINT challenge_product_phases_prod_fk FOREIGN KEY (product_id)
    REFERENCES challenge_products(id) ON DELETE CASCADE
);


-- ================================================================
-- §3 — TABLE challenge_product_rules
-- ================================================================
CREATE TABLE IF NOT EXISTS challenge_product_rules (
  id           uuid         NOT NULL DEFAULT gen_random_uuid(),
  product_id   uuid         NOT NULL,
  rule_key     text         NOT NULL,   -- 'ea_allowed', 'hedging_allowed', etc.
  rule_value   jsonb        NOT NULL,   -- true | false | {"pct": 50}
  enabled      boolean      NOT NULL DEFAULT true,
  description  text,                    -- Texte affiché au trader (dashboard / pricing)
  created_at   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT challenge_product_rules_pkey    PRIMARY KEY (id),
  CONSTRAINT challenge_product_rules_uniq    UNIQUE (product_id, rule_key),
  CONSTRAINT challenge_product_rules_prod_fk FOREIGN KEY (product_id)
    REFERENCES challenge_products(id) ON DELETE CASCADE
);


-- ================================================================
-- §4 — INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_products_active_order
  ON challenge_products(display_order)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_phases_product_order
  ON challenge_product_phases(product_id, phase_order);

CREATE INDEX IF NOT EXISTS idx_rules_product_enabled
  ON challenge_product_rules(product_id)
  WHERE enabled = true;


-- ================================================================
-- §5 — ROW LEVEL SECURITY
--
-- Les routes admin utilisent le service_role qui bypasse RLS.
-- Les policies couvrent anon + authenticated (frontend public).
-- ================================================================
ALTER TABLE challenge_products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_product_phases  ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_product_rules   ENABLE ROW LEVEL SECURITY;

-- Lecture publique des produits actifs uniquement
DROP POLICY IF EXISTS "public_read_active_products" ON challenge_products;
CREATE POLICY "public_read_active_products"
  ON challenge_products FOR SELECT
  USING (active = true);

-- Lecture publique de toutes les phases (filtrée par join côté application)
DROP POLICY IF EXISTS "public_read_phases" ON challenge_product_phases;
CREATE POLICY "public_read_phases"
  ON challenge_product_phases FOR SELECT
  USING (true);

-- Lecture publique des règles actives uniquement
DROP POLICY IF EXISTS "public_read_enabled_rules" ON challenge_product_rules;
CREATE POLICY "public_read_enabled_rules"
  ON challenge_product_rules FOR SELECT
  USING (enabled = true);


-- ================================================================
-- §6 — MODIFICATIONS TABLE challenges
--
-- UNIQUEMENT ajout de 2 colonnes nullable.
-- Aucune colonne supprimée ou renommée.
-- Les challenges existants conservent product_id=NULL, rules_snapshot=NULL.
-- ================================================================
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS product_id     uuid
    REFERENCES challenge_products(id),
  ADD COLUMN IF NOT EXISTS rules_snapshot jsonb;

-- Index partiel : seulement les challenges liés à un produit
CREATE INDEX IF NOT EXISTS idx_challenges_product_id
  ON challenges(product_id)
  WHERE product_id IS NOT NULL;


-- ================================================================
-- §7 — TRIGGER : IMMUTABILITÉ rules_snapshot
--
-- Bloque toute modification du snapshot après sa création initiale,
-- même via service_role. Les challenges avec rules_snapshot=NULL
-- (tous les challenges existants) sont transparents à ce trigger.
-- ================================================================
CREATE OR REPLACE FUNCTION prevent_rules_snapshot_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.rules_snapshot IS NOT NULL
     AND NEW.rules_snapshot IS DISTINCT FROM OLD.rules_snapshot THEN
    RAISE EXCEPTION
      '[Challenge Engine] rules_snapshot immuable — modification rétroactive '
      'interdite (challenge_id: %)', OLD.id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lock_rules_snapshot ON challenges;
CREATE TRIGGER trg_lock_rules_snapshot
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION prevent_rules_snapshot_update();


-- ================================================================
-- §8 — SEED V1 : 8 PRODUITS
--
-- price_crypto_cents = NULL pour tous les produits :
-- carte et crypto utilisent le même prix (price_eur_cents).
-- ON CONFLICT DO NOTHING → idempotent, re-exécutable sans dommage.
-- ================================================================

-- §8a : Produits
INSERT INTO challenge_products
  (slug, name, model, account_size, balance_usd,
   price_eur_cents, price_crypto_cents,
   display_order, max_cumul_usd, leverage, active, version)
VALUES
--   slug           name                              model    acct_size   bal_usd  €cents  crypto  ord  cumul   lev   act  ver
  ('25k-2step',  'Challenge $25,000 — 2-Step',  '2step', '$25,000',  25000,  19900,  NULL,  1, 200000, 100, true,  1),
  ('50k-2step',  'Challenge $50,000 — 2-Step',  '2step', '$50,000',  50000,  29900,  NULL,  2, 200000, 100, true,  1),
  ('100k-2step', 'Challenge $100,000 — 2-Step', '2step', '$100,000', 100000, 43900,  NULL,  3, 200000, 100, true,  1),
  ('200k-2step', 'Challenge $200,000 — 2-Step', '2step', '$200,000', 200000, 79900,  NULL,  4, 200000, 100, true,  1),
  ('25k-1step',  'Challenge $25,000 — 1-Step',  '1step', '$25,000',  25000,  16900,  NULL,  5, 200000, 100, true,  1),
  ('50k-1step',  'Challenge $50,000 — 1-Step',  '1step', '$50,000',  50000,  24900,  NULL,  6, 200000, 100, true,  1),
  ('100k-1step', 'Challenge $100,000 — 1-Step', '1step', '$100,000', 100000, 42900,  NULL,  7, 200000, 100, true,  1),
  ('200k-1step', 'Challenge $200,000 — 1-Step', '1step', '$200,000', 200000, 74900,  NULL,  8, 200000, 100, true,  1)
ON CONFLICT (slug) DO NOTHING;


-- §8b : Phases
-- 2-Step → 3 phases : Phase 1, Phase 2, Funded
-- 1-Step → 2 phases : Phase 1, Funded
-- Les valeurs correspondent aux defaults lib/config.ts et à l'affichage Pricing.tsx.
INSERT INTO challenge_product_phases
  (product_id, phase_order, phase_label, phase_type,
   profit_target, daily_drawdown, total_drawdown,
   min_trading_days, max_trading_days, profit_split)
SELECT
  (SELECT id FROM challenge_products WHERE slug = src.slug),
  src.phase_order, src.phase_label, src.phase_type,
  src.profit_target, src.daily_drawdown, src.total_drawdown,
  src.min_trading_days, src.max_trading_days, src.profit_split
FROM (VALUES
  -- 2-Step : Phase 1 (target 10%, daily 5%, total 10%, 5 jours min)
  ('25k-2step',  1, 'Phase 1', 'challenge', 10.00, 5.00, 10.00, 5, NULL::int, NULL::numeric),
  ('50k-2step',  1, 'Phase 1', 'challenge', 10.00, 5.00, 10.00, 5, NULL,      NULL),
  ('100k-2step', 1, 'Phase 1', 'challenge', 10.00, 5.00, 10.00, 5, NULL,      NULL),
  ('200k-2step', 1, 'Phase 1', 'challenge', 10.00, 5.00, 10.00, 5, NULL,      NULL),
  -- 2-Step : Phase 2 (target 5%, daily 5%, total 10%, 5 jours min)
  ('25k-2step',  2, 'Phase 2', 'challenge',  5.00, 5.00, 10.00, 5, NULL,      NULL),
  ('50k-2step',  2, 'Phase 2', 'challenge',  5.00, 5.00, 10.00, 5, NULL,      NULL),
  ('100k-2step', 2, 'Phase 2', 'challenge',  5.00, 5.00, 10.00, 5, NULL,      NULL),
  ('200k-2step', 2, 'Phase 2', 'challenge',  5.00, 5.00, 10.00, 5, NULL,      NULL),
  -- 2-Step : Funded (target NULL, daily 5%, total 10%, split 80%)
  ('25k-2step',  3, 'Funded',  'funded',    NULL,  5.00, 10.00, 5, NULL,      80.00),
  ('50k-2step',  3, 'Funded',  'funded',    NULL,  5.00, 10.00, 5, NULL,      80.00),
  ('100k-2step', 3, 'Funded',  'funded',    NULL,  5.00, 10.00, 5, NULL,      80.00),
  ('200k-2step', 3, 'Funded',  'funded',    NULL,  5.00, 10.00, 5, NULL,      80.00),
  -- 1-Step : Phase 1 (target 10%, daily 3%, total 10%, 5 jours min)
  ('25k-1step',  1, 'Phase 1', 'challenge', 10.00, 3.00, 10.00, 5, NULL,      NULL),
  ('50k-1step',  1, 'Phase 1', 'challenge', 10.00, 3.00, 10.00, 5, NULL,      NULL),
  ('100k-1step', 1, 'Phase 1', 'challenge', 10.00, 3.00, 10.00, 5, NULL,      NULL),
  ('200k-1step', 1, 'Phase 1', 'challenge', 10.00, 3.00, 10.00, 5, NULL,      NULL),
  -- 1-Step : Funded (target NULL, daily 3%, total 10%, split 90%)
  ('25k-1step',  2, 'Funded',  'funded',    NULL,  3.00, 10.00, 5, NULL,      90.00),
  ('50k-1step',  2, 'Funded',  'funded',    NULL,  3.00, 10.00, 5, NULL,      90.00),
  ('100k-1step', 2, 'Funded',  'funded',    NULL,  3.00, 10.00, 5, NULL,      90.00),
  ('200k-1step', 2, 'Funded',  'funded',    NULL,  3.00, 10.00, 5, NULL,      90.00)
) AS src(slug, phase_order, phase_label, phase_type,
         profit_target, daily_drawdown, total_drawdown,
         min_trading_days, max_trading_days, profit_split)
ON CONFLICT (product_id, phase_order) DO NOTHING;


-- §8c : Règles — communes aux 8 produits
INSERT INTO challenge_product_rules
  (product_id, rule_key, rule_value, enabled, description)
SELECT
  p.id,
  r.rule_key,
  r.rule_value::jsonb,
  true,
  r.description
FROM challenge_products p
CROSS JOIN (VALUES
  ('ea_allowed',               'true',  'Expert Advisor autorisé'),
  ('hedging_allowed',          'true',  'Hedging autorisé'),
  ('copy_trading_allowed',     'false', 'Copy trading interdit'),
  ('news_trading_banned',      'false', 'Trading sur news autorisé'),
  ('weekend_holding_allowed',  'true',  'Positions week-end autorisées'),
  ('overnight_holding_allowed','true',  'Positions overnight autorisées')
) AS r(rule_key, rule_value, description)
ON CONFLICT (product_id, rule_key) DO NOTHING;

-- §8d : Règle supplémentaire best_day_cap — 1-Step uniquement
INSERT INTO challenge_product_rules
  (product_id, rule_key, rule_value, enabled, description)
SELECT
  p.id,
  'best_day_cap_pct',
  '{"pct": 50}'::jsonb,
  true,
  'Un seul jour ne peut pas représenter plus de 50% de l''objectif total de profit'
FROM challenge_products p
WHERE p.model = '1step'
ON CONFLICT (product_id, rule_key) DO NOTHING;


-- ================================================================
-- FIN — Phase 2B-1 Database Foundation
-- Vérification post-exécution recommandée :
--   SELECT slug, price_eur_cents, price_crypto_cents, active FROM challenge_products ORDER BY display_order;
--   SELECT p.slug, ph.phase_order, ph.phase_label, ph.profit_target, ph.daily_drawdown, ph.profit_split FROM challenge_products p JOIN challenge_product_phases ph ON ph.product_id = p.id ORDER BY p.display_order, ph.phase_order;
--   SELECT count(*) FROM challenge_product_rules;  -- doit retourner 52 (8×6 + 4×1)
--   SELECT count(*) FROM challenges WHERE product_id IS NOT NULL;  -- doit retourner 0 (normal)
-- ================================================================
