-- ============================================================
-- TRADERS REWARDS V1 — Migration SQL
-- ============================================================
-- ⚠️  NE PAS EXÉCUTER — Pour validation et relecture uniquement.
-- Exécuter dans Supabase SQL Editor après validation complète.
-- ============================================================
--
-- PHASE A : Discriminant de version dans challenges
-- PHASE B : Nouveaux produits V1 (25K, 50K, 100K)
-- PHASE C : Instructions pour les webhooks (texte seul — code TypeScript)
--
-- Backward compat :
--   - Tous les challenges existants → dd_model NULL (= comportement ancien)
--   - Le moteur dd_model=NULL utilise TOUJOURS l'ancien code (daily_total)
--   - Aucune ligne existante ne sera modifiée par cette migration
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PHASE A : Colonne discriminant de version
-- ────────────────────────────────────────────────────────────
--
-- Colonne nullable : NULL = ancien modèle (daily_total)
-- Nouveaux challenges V1 → 'trailing_eod_lock' inséré par le webhook.
--
-- Backward compat garantie :
--   Les syncs existants ne lisent pas encore cette colonne.
--   Le routing sera ajouté dans metaapi/sync ET cron/mt5-snapshot
--   APRÈS validation de cette migration.

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS dd_model TEXT DEFAULT NULL;

COMMENT ON COLUMN challenges.dd_model IS
  'Discriminant du moteur DD actif. NULL = ancien comportement (1-Step/2-Step). trailing_eod_lock = nouveau modèle V1 Traders Rewards.';

-- Index optionnel pour filtrer rapidement les challenges V1 (futurs dashboards admin)
CREATE INDEX IF NOT EXISTS idx_challenges_dd_model
  ON challenges (dd_model)
  WHERE dd_model IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- PHASE B : Nouveaux produits V1
-- ────────────────────────────────────────────────────────────
--
-- Stratégie : version=2 pour distinguer des anciens produits (version=1).
-- Les anciens produits restent actifs pendant la transition ;
-- ils seront désactivés séparément via l'admin editor.
--
-- Prix lancement (en centimes EUR) :
--   25K → 19 € → 1 900 cts
--   50K → 29 € → 2 900 cts
--  100K → 59 € → 5 900 cts


-- ── Produit 25K ──────────────────────────────────────────────

INSERT INTO challenge_products (
  slug, name, description,
  model, account_size, balance_usd,
  price_eur_cents, price_crypto_cents,
  currency, active, display_order,
  max_cumul_usd, leverage, version
) VALUES (
  'rewards-25k',
  'Traders Rewards 25K',
  'Nouveau modèle Traders Rewards V1 — compte 25K — Une étape, trailing 4 % EOD',
  '1step',
  '$25,000',
  25000,
  1900,    -- 19 € prix lancement
  NULL,    -- NULL = même prix qu''en EUR (pas de surcharge crypto)
  'EUR',
  true,    -- actif dès insertion
  10,      -- display_order (après les anciens produits)
  NULL,    -- pas de max cumul
  100,     -- leverage
  2        -- version=2 → nouveau modèle
)
ON CONFLICT (slug) DO NOTHING;


INSERT INTO challenge_product_phases (
  product_id, phase_order, phase_label, phase_type,
  profit_target, daily_drawdown, total_drawdown,
  min_trading_days, max_trading_days, profit_split
) VALUES
-- Phase 1 : Challenge unique
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),
  1,
  'Challenge',
  'challenge',
  6.0,   -- profit_target contractuel (+6 %)
  4.0,   -- daily_drawdown = trailing DD pct (4 %) — NB: moteur V1 ignorera daily/total séparés
  4.0,   -- total_drawdown = idem (représentation contractuelle symétrique)
  2,     -- min_trading_days
  30,    -- max_trading_days
  NULL   -- profit_split non applicable (phase challenge)
),
-- Phase 2 : Reward Account (qualification)
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),
  2,
  'Reward Account',
  'funded',
  4.0,   -- profit_target +4 % pour qualification Reward Account
  4.0,   -- trailing DD 4 % avec verrouillage
  4.0,   -- idem
  5,     -- min qualifying profitable days
  NULL,  -- pas de max
  100    -- 100 % du profit éligible, dans la limite du plafond Reward
);


INSERT INTO challenge_product_rules
  (product_id, rule_key, rule_value, enabled, description)
VALUES
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),
  'dd_model',
  '"trailing_eod_lock"',
  true,
  'Discriminant moteur V1. Routing dans metaapi/sync et cron/mt5-snapshot.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),
  'consistency_pct',
  '50',
  true,
  'Consistency Rule : best_day_profit ≤ 50 % du profit total requis. Identique au 1-Step actuel.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),
  'trailing_dd_pct',
  '4',
  true,
  'Pourcentage de trailing drawdown EOD (4 %).'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),
  'trailing_lock_pct',
  '4',
  true,
  'Seuil de verrouillage du trailing (4 %). Quand highest_eod ≥ start×1.04, floor = start (permanent).'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),
  'qualifying_day_min_usd',
  '50',
  true,
  'Seuil USD minimum pour un jour profitable qualifiant Reward Account — 25K : 50 USD/j.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),
  'activation_fee_eur',
  '99',
  true,
  'Frais activation Reward Account — 25K : 99 EUR. (Réservé Phase 2 — pas implémenté en Phase 1)'
);


-- ── Produit 50K ──────────────────────────────────────────────

INSERT INTO challenge_products (
  slug, name, description,
  model, account_size, balance_usd,
  price_eur_cents, price_crypto_cents,
  currency, active, display_order,
  max_cumul_usd, leverage, version
) VALUES (
  'rewards-50k',
  'Traders Rewards 50K',
  'Nouveau modèle Traders Rewards V1 — compte 50K — Une étape, trailing 4 % EOD',
  '1step',
  '$50,000',
  50000,
  2900,    -- 29 € prix lancement
  NULL,
  'EUR',
  true,
  11,
  NULL,
  100,
  2
)
ON CONFLICT (slug) DO NOTHING;


INSERT INTO challenge_product_phases (
  product_id, phase_order, phase_label, phase_type,
  profit_target, daily_drawdown, total_drawdown,
  min_trading_days, max_trading_days, profit_split
) VALUES
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),
  1, 'Challenge', 'challenge',
  6.0, 4.0, 4.0, 2, 30, NULL
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),
  2, 'Reward Account', 'funded',
  4.0, 4.0, 4.0, 5, NULL, 100
);


INSERT INTO challenge_product_rules
  (product_id, rule_key, rule_value, enabled, description)
VALUES
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),
  'dd_model', '"trailing_eod_lock"', true,
  'Discriminant moteur V1.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),
  'consistency_pct', '50', true,
  'Consistency Rule 50 %.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),
  'trailing_dd_pct', '4', true,
  'Trailing drawdown 4 % EOD.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),
  'trailing_lock_pct', '4', true,
  'Seuil de verrouillage du trailing (4 %).'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),
  'qualifying_day_min_usd', '100', true,
  'Seuil USD qualifiant Reward Account — 50K : 100 USD/j.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),
  'activation_fee_eur', '99', true,
  'Frais activation Reward Account — 50K : 99 EUR.'
);


-- ── Produit 100K ─────────────────────────────────────────────

INSERT INTO challenge_products (
  slug, name, description,
  model, account_size, balance_usd,
  price_eur_cents, price_crypto_cents,
  currency, active, display_order,
  max_cumul_usd, leverage, version
) VALUES (
  'rewards-100k',
  'Traders Rewards 100K',
  'Nouveau modèle Traders Rewards V1 — compte 100K — Une étape, trailing 3 % EOD',
  '1step',
  '$100,000',
  100000,
  5900,    -- 59 € prix lancement
  NULL,
  'EUR',
  true,
  12,
  NULL,
  100,
  2
)
ON CONFLICT (slug) DO NOTHING;


INSERT INTO challenge_product_phases (
  product_id, phase_order, phase_label, phase_type,
  profit_target, daily_drawdown, total_drawdown,
  min_trading_days, max_trading_days, profit_split
) VALUES
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-100k'),
  1, 'Challenge', 'challenge',
  6.0, 3.0, 3.0, 2, 30, NULL   -- 100K : trailing DD 3 % (25K/50K restent à 4%)
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-100k'),
  2, 'Reward Account', 'funded',
  4.0, 3.0, 3.0, 5, NULL, 100  -- 100K : trailing DD 3 %, profit éligible 100 %
);


INSERT INTO challenge_product_rules
  (product_id, rule_key, rule_value, enabled, description)
VALUES
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-100k'),
  'dd_model', '"trailing_eod_lock"', true,
  'Discriminant moteur V1.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-100k'),
  'consistency_pct', '50', true,
  'Consistency Rule 50 %.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-100k'),
  'trailing_dd_pct', '3', true,
  'Trailing drawdown 3 % EOD — 100K uniquement (25K/50K = 4%).'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-100k'),
  'trailing_lock_pct', '3', true,
  'Seuil de verrouillage 3 % (100K). Quand highest_eod ≥ start×1.03 = 103 000, floor = start (permanent).'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-100k'),
  'qualifying_day_min_usd', '150', true,
  'Seuil USD qualifiant Reward Account — 100K : 150 USD/j.'
),
(
  (SELECT id FROM challenge_products WHERE slug = 'rewards-100k'),
  'activation_fee_eur', '149', true,
  'Frais activation Reward Account — 100K : 149 EUR.'
);


-- ────────────────────────────────────────────────────────────
-- PHASE C : Instructions pour les webhooks (TypeScript)
-- ────────────────────────────────────────────────────────────
--
-- Après exécution de ce SQL, les webhooks Stripe/Crypto/Promo doivent
-- extraire dd_model depuis le rules_snapshot et l'insérer dans challenges :
--
--   // Dans stripe/webhook et crypto/webhook, après buildRulesSnapshot() :
--   const ddModel = (rulesSnapshot.rules?.dd_model as string) ?? null;
--
--   // Dans l'INSERT challenges, ajouter :
--   dd_model: ddModel,
--
-- De même dans admin/challenges POST (création manuelle), extraire dd_model
-- depuis le product_id si fourni.
--
-- Dans metaapi/sync et cron/mt5-snapshot :
--   Ajouter 'dd_model' dans la clause SELECT.
--   Router vers computeV1TrailingFloor() si challenge.dd_model === 'trailing_eod_lock'.
--   L'ancien code (daily_total) reste inchangé pour dd_model NULL.
--
-- Ces modifications TypeScript seront appliquées en Phase 1B,
-- APRÈS validation et exécution de ce SQL.
-- ────────────────────────────────────────────────────────────
