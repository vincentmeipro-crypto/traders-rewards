-- ============================================================
-- TRADERS REWARDS V1 — APEX EOD : Migration complète idempotente
-- 2026-08-26
-- ============================================================
--
-- Cibles : rewards-25k | rewards-50k | rewards-100k
-- Safe   : ON CONFLICT ... DO UPDATE — relançable N fois
-- Périmètre : challenge_product_phases + challenge_product_rules
--
-- PRÉ-REQUIS :
--   supabase/migrations/20260823_reward_journey_constraint.sql
--   doit avoir été exécutée AVANT cette migration (DDL phase_type check).
--
-- ============================================================
-- PARAMÈTRES APEX EOD — source de vérité
-- ─────────────────────────────────────────────────────────────
--  Challenge (phase 1)
--    profit_target     : 6 % (25K=1 500$ / 50K=3 000$ / 100K=6 000$)
--    trailing_dd_pct   : 4 % (25K/50K) | 3 % (100K) — affiché uniquement
--    min_trading_days  : 0  (aucun minimum — Apex EOD)
--    max_trading_days  : 30
--    consistency       : AUCUNE
--
--  Reward Account (phase 2 — Reward #1)
--    profit_target     : 4 %
--    min_trading_days  : 5 (jours qualifiants)
--    daily_drawdown    : 0.0 (non applicable — géré par engine)
--    total_drawdown    : 4/4/3 % (= trailing_dd_pct)
--    consistency       : 50 % (best_day < 50 % du profit requis)
--
--  Rewards #2–5 (phase 3 — reward_journey)
--    profit_target     : 4 % (threshold = Safety Net + cap du niveau)
--    plancher          : FIXE = start_balance (pas de trailing)
--    min_trading_days  : 0
--
-- ============================================================
-- RÈGLES ENGINE-ONLY — non stockées en DB (lib/v1-engine.ts) :
-- ─────────────────────────────────────────────────────────────
--  Safety Net — seuil de verrouillage absolu (V1_SAFETY_NET) :
--    25K=26 100$ / 50K=52 100$ / 100K=103 100$
--  DD EOD fixe en $ (V1_DD_USD_BY_BALANCE) :
--    25K=1 000$ / 50K=2 000$ / 100K=3 000$
--  → Ces 2 valeurs ne sont PAS dans challenge_product_rules.
--    Elles sont hardcodées dans lib/v1-engine.ts et non lues depuis la DB.
--    Cette migration ne les crée PAS pour ne pas inventer des règles fictives.
-- ============================================================


-- ============================================================
-- §1 — challenge_product_phases
-- ============================================================

-- §1a — Phase 1 (challenge) : min_trading_days 2 → 0 (Apex EOD)
UPDATE challenge_product_phases
SET min_trading_days = 0
WHERE phase_order = 1
  AND product_id IN (
    SELECT id FROM challenge_products
    WHERE slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
  );

-- §1b — Phase 2 (funded = Reward #1) :
--   • label "Reward Account" → "Reward #1"
--   • daily_drawdown → 0.0 (non applicable sur Reward Account)
--   • profit_split   → NULL (pas de profit split sur Rewards)
UPDATE challenge_product_phases
SET phase_label    = 'Reward #1',
    daily_drawdown = 0.0,
    profit_split   = NULL
WHERE phase_order = 2
  AND product_id IN (
    SELECT id FROM challenge_products
    WHERE slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
  );

-- §1c — Phase 3 (reward_journey = Rewards #2 à #5) : INSERT ou UPDATE
--   Nécessite que 20260823_reward_journey_constraint.sql soit déjà appliquée.
INSERT INTO challenge_product_phases
  (product_id, phase_order, phase_type, phase_label,
   profit_target, daily_drawdown, total_drawdown,
   min_trading_days, max_trading_days, profit_split)
SELECT
  p.id,
  3,
  'reward_journey',
  'Rewards #2 à #5',
  4.0,   -- threshold = Safety Net + cap du niveau (calculé par engine)
  0.0,   -- non applicable (pas de DLL sur reward_journey)
  0.0,   -- plancher FIXE = start_balance (engine), pas de trailing
  0,     -- aucun minimum de jours (Niveau 3)
  NULL,  -- illimité
  NULL   -- pas de profit split
FROM challenge_products p
WHERE p.slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
ON CONFLICT (product_id, phase_order) DO UPDATE
  SET phase_type       = EXCLUDED.phase_type,
      phase_label      = EXCLUDED.phase_label,
      profit_target    = EXCLUDED.profit_target,
      daily_drawdown   = EXCLUDED.daily_drawdown,
      total_drawdown   = EXCLUDED.total_drawdown,
      min_trading_days = EXCLUDED.min_trading_days,
      max_trading_days = EXCLUDED.max_trading_days,
      profit_split     = EXCLUDED.profit_split;


-- ============================================================
-- §2 — challenge_product_rules : règles communes (3 produits)
-- ============================================================

-- §2a — qualifying_day_min_usd : 50/100/150 → 100/250/300 (Apex EOD)
INSERT INTO challenge_product_rules (product_id, rule_key, rule_value, enabled, description)
VALUES
  (
    (SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),
    'qualifying_day_min_usd', '100'::jsonb, true,
    'Apex EOD — Seuil USD minimum journée qualifiante (Reward Account) : 100 USD. (was 50)'
  ),
  (
    (SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),
    'qualifying_day_min_usd', '250'::jsonb, true,
    'Apex EOD — Seuil USD minimum journée qualifiante (Reward Account) : 250 USD. (was 100)'
  ),
  (
    (SELECT id FROM challenge_products WHERE slug = 'rewards-100k'),
    'qualifying_day_min_usd', '300'::jsonb, true,
    'Apex EOD — Seuil USD minimum journée qualifiante (Reward Account) : 300 USD. (was 150)'
  )
ON CONFLICT (product_id, rule_key) DO UPDATE
  SET rule_value  = EXCLUDED.rule_value,
      enabled     = EXCLUDED.enabled,
      description = EXCLUDED.description;

-- §2b — consistency_challenge_pct : NOUVELLE CLÉ (Challenge = aucune consistency)
INSERT INTO challenge_product_rules (product_id, rule_key, rule_value, enabled, description)
SELECT
  p.id,
  'consistency_challenge_pct',
  '0'::jsonb,
  false,   -- désactivé : Apex EOD supprime la consistency au Challenge
  'Apex EOD : aucune consistency au Challenge (désactivé, rule_value = 0).'
FROM challenge_products p
WHERE p.slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
ON CONFLICT (product_id, rule_key) DO UPDATE
  SET rule_value  = EXCLUDED.rule_value,
      enabled     = EXCLUDED.enabled,
      description = EXCLUDED.description;

-- §2c — consistency_reward_pct : NOUVELLE CLÉ (Reward Account = 50 %)
INSERT INTO challenge_product_rules (product_id, rule_key, rule_value, enabled, description)
SELECT
  p.id,
  'consistency_reward_pct',
  '50'::jsonb,
  true,
  'Apex EOD — Consistency Rewards #1–5 : best_day < 50 % du profit requis. (was 33 %)'
FROM challenge_products p
WHERE p.slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
ON CONFLICT (product_id, rule_key) DO UPDATE
  SET rule_value  = EXCLUDED.rule_value,
      enabled     = EXCLUDED.enabled,
      description = EXCLUDED.description;

-- §2d — consistency_pct (ANCIENNE CLÉ) : désactiver si encore présente
--   Remplacée par consistency_challenge_pct + consistency_reward_pct.
--   Ne pas supprimer (historique) — juste désactiver.
UPDATE challenge_product_rules
SET enabled     = false,
    description = 'Déprécié — remplacé par consistency_challenge_pct + consistency_reward_pct (Apex EOD 2026-08-26).'
WHERE rule_key  = 'consistency_pct'
  AND product_id IN (
    SELECT id FROM challenge_products
    WHERE slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
  );


-- ============================================================
-- §3 — Reward caps : reward_cap_1 à reward_cap_5
-- ============================================================
-- rewards-25k  : 300 / 400 / 500 / 600 / 750  USD
-- rewards-50k  : 500 / 650 / 800 / 1000 / 1250 USD
-- rewards-100k : 750 / 1000 / 1250 / 1500 / 1750 USD

INSERT INTO challenge_product_rules (product_id, rule_key, rule_value, enabled, description)
VALUES
  -- 25K
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_1',  '300'::jsonb,  true, 'Plafond Reward #1 — 25K : 300 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_2',  '400'::jsonb,  true, 'Plafond Reward #2 — 25K : 400 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_3',  '500'::jsonb,  true, 'Plafond Reward #3 — 25K : 500 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_4',  '600'::jsonb,  true, 'Plafond Reward #4 — 25K : 600 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_5',  '750'::jsonb,  true, 'Plafond Reward #5 — 25K : 750 USD.'),
  -- 50K
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_1',  '500'::jsonb,  true, 'Plafond Reward #1 — 50K : 500 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_2',  '650'::jsonb,  true, 'Plafond Reward #2 — 50K : 650 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_3',  '800'::jsonb,  true, 'Plafond Reward #3 — 50K : 800 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_4', '1000'::jsonb,  true, 'Plafond Reward #4 — 50K : 1 000 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_5', '1250'::jsonb,  true, 'Plafond Reward #5 — 50K : 1 250 USD.'),
  -- 100K
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_1',  '750'::jsonb,  true, 'Plafond Reward #1 — 100K : 750 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_2', '1000'::jsonb,  true, 'Plafond Reward #2 — 100K : 1 000 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_3', '1250'::jsonb,  true, 'Plafond Reward #3 — 100K : 1 250 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_4', '1500'::jsonb,  true, 'Plafond Reward #4 — 100K : 1 500 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_5', '1750'::jsonb,  true, 'Plafond Reward #5 — 100K : 1 750 USD.')
ON CONFLICT (product_id, rule_key) DO UPDATE
  SET rule_value  = EXCLUDED.rule_value,
      enabled     = EXCLUDED.enabled,
      description = EXCLUDED.description;


-- ============================================================
-- §4 — Vérification post-migration
-- ============================================================

-- §4a — Phases (attendu : 3 par produit)
SELECT
  cp.slug,
  cph.phase_order,
  cph.phase_type,
  cph.phase_label,
  cph.profit_target,
  cph.min_trading_days,
  cph.max_trading_days,
  cph.daily_drawdown,
  cph.total_drawdown,
  cph.profit_split
FROM challenge_product_phases cph
JOIN challenge_products cp ON cp.id = cph.product_id
WHERE cp.slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
ORDER BY cp.slug, cph.phase_order;

-- §4b — Règles clés (doit afficher les nouvelles valeurs Apex EOD)
SELECT
  cp.slug,
  cpr.rule_key,
  cpr.rule_value,
  cpr.enabled
FROM challenge_product_rules cpr
JOIN challenge_products cp ON cp.id = cpr.product_id
WHERE cp.slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
  AND cpr.rule_key IN (
    'qualifying_day_min_usd',
    'consistency_challenge_pct',
    'consistency_reward_pct',
    'consistency_pct',
    'reward_cap_1', 'reward_cap_2', 'reward_cap_3', 'reward_cap_4', 'reward_cap_5'
  )
ORDER BY cp.slug, cpr.rule_key;

-- §4c — Toutes les règles des 3 produits V1 (vue complète)
SELECT
  cp.slug,
  cpr.rule_key,
  cpr.rule_value,
  cpr.enabled
FROM challenge_product_rules cpr
JOIN challenge_products cp ON cp.id = cpr.product_id
WHERE cp.slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
ORDER BY cp.slug, cpr.rule_key;
