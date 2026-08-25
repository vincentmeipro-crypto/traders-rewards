-- ============================================================
-- Migration : autoriser reward_journey dans challenge_product_phases
-- ============================================================
--
-- La contrainte actuelle n'autorisait que ('challenge', 'funded').
-- Le Niveau 3 V1 (Rewards #2 à #5) utilise phase_type='reward_journey'.
-- Cette migration étend la contrainte sans casser l'existant.
--
-- Idempotente : DROP IF EXISTS + recréation propre.
-- À appliquer AVANT scripts/add-v1-phase3.ts
--
-- Usage Supabase Studio > SQL Editor : copier-coller et exécuter
-- Usage CLI (si projet linked + auth) : supabase db push
-- ============================================================

ALTER TABLE challenge_product_phases
DROP CONSTRAINT IF EXISTS challenge_product_phases_type_ck;

ALTER TABLE challenge_product_phases
ADD CONSTRAINT challenge_product_phases_type_ck
CHECK (phase_type IN ('challenge', 'funded', 'reward_journey'));
