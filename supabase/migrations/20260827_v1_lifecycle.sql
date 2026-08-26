-- ============================================================
-- TRADERS REWARDS V1 — Lifecycle complet Challenge → Reward #1 à #5
-- 2026-08-27
-- ============================================================
--
-- PRÉ-REQUIS (dans cet ordre) :
--   1. challenge_engine.sql
--   2. 20260823_reward_journey_constraint.sql
--   3. 20260826_apex_eod_v1_rules.sql
--   Puis exécuter CE fichier.
--
-- Idempotent : IF NOT EXISTS + DROP IF EXISTS avant chaque ADD CONSTRAINT.
--
-- RÉSUMÉ DES CHANGEMENTS :
--   Table challenges :
--     + challenge_passed_at       timestamptz   — horodatage du passage du challenge
--     + challenge_passed_balance  numeric(12,2) — balance MT5 au moment du PASS
--     + challenge_passed_equity   numeric(12,2) — equity MT5 au moment du PASS
--     + reward_converted_at       timestamptz   — horodatage bascule → Reward Account
--     + reward_conversion_status  text          — 'pending'|'converting'|'done'|'error'
--     + highest_eod               numeric(12,2) — plus haut EOD (trailing floor V1)
--     + terminated_at             timestamptz   — horodatage fin de parcours après R#5
--
--   Nouvelle table : v1_challenge_history
--     Enregistre de façon PERMANENTE et IMMUABLE le passage du challenge.
--     Ne peut pas être écrasé même quand le compte bascule en Reward Account.
-- ============================================================


-- ============================================================
-- §1 — Colonnes ajoutées à challenges
-- ============================================================

ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS challenge_passed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS challenge_passed_balance  numeric(12,2),
  ADD COLUMN IF NOT EXISTS challenge_passed_equity   numeric(12,2),
  ADD COLUMN IF NOT EXISTS reward_converted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS reward_conversion_status  text,
  ADD COLUMN IF NOT EXISTS highest_eod               numeric(12,2),
  ADD COLUMN IF NOT EXISTS terminated_at             timestamptz;

-- Contrainte sur reward_conversion_status (idempotente)
ALTER TABLE challenges
  DROP CONSTRAINT IF EXISTS challenges_reward_conversion_status_ck;
ALTER TABLE challenges
  ADD CONSTRAINT challenges_reward_conversion_status_ck
  CHECK (reward_conversion_status IN ('pending', 'converting', 'done', 'error'));

-- Index partiel : challenges V1 en attente de conversion (cron rapide)
CREATE INDEX IF NOT EXISTS idx_challenges_v1_pending_conversion
  ON challenges(challenge_passed_at)
  WHERE dd_model = 'trailing_eod_lock'
    AND status = 'passed'
    AND reward_converted_at IS NULL;

-- Index pour dd_model (cron snapshot + conversion)
CREATE INDEX IF NOT EXISTS idx_challenges_dd_model
  ON challenges(dd_model)
  WHERE dd_model IS NOT NULL;


-- ============================================================
-- §2 — Table v1_challenge_history
--
-- Historique PERMANENT et IMMUABLE du passage de chaque challenge V1.
-- Une ligne par challenge — UNIQUE sur challenge_id.
-- Ne jamais supprimer ou modifier ces lignes — elles constituent
-- la preuve contractuelle que le challenge a été réussi.
-- ============================================================

CREATE TABLE IF NOT EXISTS v1_challenge_history (
  id                  uuid         NOT NULL DEFAULT gen_random_uuid(),
  challenge_id        uuid         NOT NULL,
  user_id             uuid         NOT NULL,
  account_size        text         NOT NULL,
  start_balance       numeric(12,2) NOT NULL,
  mt5_login           bigint,
  passed_at           timestamptz  NOT NULL,
  passed_balance      numeric(12,2),
  passed_equity       numeric(12,2),
  dd_model            text,
  rules_snapshot      jsonb,
  converted_at        timestamptz,    -- renseigné lors de la bascule Reward Account
  created_at          timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT v1_challenge_history_pkey
    PRIMARY KEY (id),
  CONSTRAINT v1_challenge_history_challenge_uniq
    UNIQUE (challenge_id),             -- un seul enregistrement par challenge
  CONSTRAINT v1_challenge_history_challenge_fk
    FOREIGN KEY (challenge_id)
    REFERENCES challenges(id)
    ON DELETE CASCADE
);

-- RLS : chaque trader lit uniquement son propre historique
ALTER TABLE v1_challenge_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traders_read_own_v1_history" ON v1_challenge_history;
CREATE POLICY "traders_read_own_v1_history"
  ON v1_challenge_history FOR SELECT
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_v1_history_user_id
  ON v1_challenge_history(user_id);

CREATE INDEX IF NOT EXISTS idx_v1_history_challenge_id
  ON v1_challenge_history(challenge_id);


-- ============================================================
-- §3 — Trigger IMMUABILITÉ v1_challenge_history
--
-- Bloque toute tentative de modification des lignes passées
-- (seule la colonne converted_at peut être mise à jour).
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_v1_history_core_update()
RETURNS TRIGGER AS $$
BEGIN
  -- N'autoriser que la mise à jour de converted_at
  IF OLD.challenge_id     IS DISTINCT FROM NEW.challenge_id     OR
     OLD.user_id          IS DISTINCT FROM NEW.user_id          OR
     OLD.account_size     IS DISTINCT FROM NEW.account_size     OR
     OLD.start_balance    IS DISTINCT FROM NEW.start_balance    OR
     OLD.mt5_login        IS DISTINCT FROM NEW.mt5_login        OR
     OLD.passed_at        IS DISTINCT FROM NEW.passed_at        OR
     OLD.passed_balance   IS DISTINCT FROM NEW.passed_balance   OR
     OLD.passed_equity    IS DISTINCT FROM NEW.passed_equity    OR
     OLD.dd_model         IS DISTINCT FROM NEW.dd_model         OR
     OLD.rules_snapshot   IS DISTINCT FROM NEW.rules_snapshot
  THEN
    RAISE EXCEPTION
      '[V1 Lifecycle] v1_challenge_history : champs cœur immuables — '
      'seule la colonne converted_at peut être modifiée (challenge_id: %)', OLD.challenge_id
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_lock_v1_history_core ON v1_challenge_history;
CREATE TRIGGER trg_lock_v1_history_core
  BEFORE UPDATE ON v1_challenge_history
  FOR EACH ROW
  EXECUTE FUNCTION prevent_v1_history_core_update();


-- ============================================================
-- §4 — Vérification post-migration
-- ============================================================

-- Colonnes ajoutées à challenges :
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'challenges'
  AND column_name IN (
    'challenge_passed_at', 'challenge_passed_balance', 'challenge_passed_equity',
    'reward_converted_at', 'reward_conversion_status',
    'highest_eod', 'terminated_at'
  )
ORDER BY column_name;

-- Table v1_challenge_history :
SELECT 'v1_challenge_history' AS table_name,
       COUNT(*) AS row_count
FROM v1_challenge_history;
