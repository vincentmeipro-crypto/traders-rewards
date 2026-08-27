-- ============================================================
-- Migration : Challenge V1.2 — minTradingDays = 2, consistency = 50 %
-- ============================================================
-- IDEMPOTENTE — peut être exécutée plusieurs fois sans effet.
-- À exécuter manuellement dans la console Supabase SQL Editor.
-- NE PAS exécuter automatiquement via scripts.
-- ============================================================

-- 1. Mettre à jour min_trading_days = 2 pour les phases Challenge V1
--    (phase_type = 'challenge', produits rewards-25k / rewards-50k / rewards-100k)
UPDATE challenge_product_phases
SET    min_trading_days = 2
WHERE  phase_type = 'challenge'
  AND  product_slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
  AND  (min_trading_days IS NULL OR min_trading_days IS DISTINCT FROM 2);

-- 2. Mettre à jour consistency_challenge_pct = 50 dans challenge_product_rules
--    Adapter le nom de table / colonne selon le schéma Supabase réel.
UPDATE challenge_product_rules
SET    consistency_challenge_pct = 50
WHERE  product_slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
  AND  (consistency_challenge_pct IS NULL OR consistency_challenge_pct IS DISTINCT FROM 50);
