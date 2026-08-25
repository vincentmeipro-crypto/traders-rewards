-- ============================================================
-- TRADERS REWARDS — Correction trailing DD 100K : 4% → 3%
-- Date : 2026-08-20
-- ============================================================
-- ⚠️  NE PAS EXÉCUTER IMMÉDIATEMENT.
-- Utiliser UNIQUEMENT si scripts/sql/v1-migration.sql a déjà été
-- exécuté dans Supabase avec les anciennes valeurs 4% pour 100K.
-- Si la migration n'a pas encore été exécutée, utiliser directement
-- v1-migration.sql (déjà corrigé à 3%).
--
-- PÉRIMÈTRE STRICT :
--   - Seul le produit rewards-100k est modifié.
--   - rewards-25k et rewards-50k restent à 4%.
--   - Les challenges.rules_snapshot déjà achetés NE SONT PAS TOUCHÉS
--     (snapshot contractuel immuable).
-- ============================================================

-- ── Audit avant modification ──────────────────────────────────
SELECT
  cp.slug,
  cpr.rule_key,
  cpr.rule_value
FROM challenge_product_rules cpr
JOIN challenge_products cp ON cp.id = cpr.product_id
WHERE cp.slug = 'rewards-100k'
  AND cpr.rule_key IN ('trailing_dd_pct', 'trailing_lock_pct')
ORDER BY cpr.rule_key;

-- ── Challenges 100K actifs (info seulement — non modifiés) ───
SELECT id, status, dd_model, created_at
FROM challenges
WHERE product_id = (SELECT id FROM challenge_products WHERE slug = 'rewards-100k')
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================
-- MODIFICATIONS (décommenter pour exécuter)
-- ============================================================

-- 1. trailing_dd_pct : 4 → 3
-- UPDATE challenge_product_rules
-- SET rule_value   = '3',
--     description  = 'Trailing drawdown 3 % EOD — 100K uniquement (25K/50K = 4%). Corrigé 2026-08-20.'
-- WHERE product_id = (SELECT id FROM challenge_products WHERE slug = 'rewards-100k')
--   AND rule_key   = 'trailing_dd_pct';

-- 2. trailing_lock_pct : 4 → 3
--    Verrou : start × 1.03 = 103 000 (au lieu de 104 000)
-- UPDATE challenge_product_rules
-- SET rule_value   = '3',
--     description  = 'Seuil de verrouillage 3 % (100K). highest_eod ≥ start×1.03 → floor = start. Corrigé 2026-08-20.'
-- WHERE product_id = (SELECT id FROM challenge_products WHERE slug = 'rewards-100k')
--   AND rule_key   = 'trailing_lock_pct';

-- 3. Phases (daily_drawdown / total_drawdown) : 4.0 → 3.0
-- UPDATE challenge_product_phases
-- SET daily_drawdown = 3.0,
--     total_drawdown = 3.0
-- WHERE product_id = (SELECT id FROM challenge_products WHERE slug = 'rewards-100k');

-- 4. Description produit
-- UPDATE challenge_products
-- SET description = 'Traders Rewards V1 — compte 100K — Une étape, trailing 3 % EOD'
-- WHERE slug = 'rewards-100k';

-- ── Vérification post-modification ───────────────────────────
-- SELECT cp.slug, cpr.rule_key, cpr.rule_value
-- FROM challenge_product_rules cpr
-- JOIN challenge_products cp ON cp.id = cpr.product_id
-- WHERE cp.slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
--   AND cpr.rule_key IN ('trailing_dd_pct', 'trailing_lock_pct')
-- ORDER BY cp.slug, cpr.rule_key;
