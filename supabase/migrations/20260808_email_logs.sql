-- ============================================================
-- TRADERS REWARDS — Phase 3B-0
-- email_logs : journal des tentatives d'envoi transactionnel
-- À exécuter manuellement dans Supabase SQL Editor.
-- AVANT de déployer lib/mailer.ts modifié.
--
-- Accès : uniquement service_role (backend via createAdminClient).
-- anon / authenticated bloqués par RLS (aucune policy créée).
--
-- Sécurité données :
--   - Aucun HTML stocké (contient potentiellement des credentials MT5)
--   - error : message sanitisé max 500 chars côté applicatif
--   - event_key : colonne informative uniquement, aucune garantie
--     de déduplication d'envoi en 3B-0.
-- ============================================================

BEGIN;

-- ── Table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.email_logs (
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),
  type         text        NOT NULL,
  to_email     text        NOT NULL,
  -- user_id : auth.users.id, sans FK (pattern log — préserve les
  -- enregistrements si l'utilisateur est supprimé ultérieurement).
  user_id      uuid,
  challenge_id uuid        REFERENCES public.challenges(id) ON DELETE SET NULL,
  subject      text        NOT NULL,
  resend_id    text,
  status       text        NOT NULL,
  error        text,
  -- event_key : informatif uniquement en 3B-0, pas de UNIQUE.
  -- Prépare une future vraie idempotence (outbox pattern, phase 3B-X).
  -- Valeur NULL dans l'implémentation initiale (challengeId non transmis).
  event_key    text,
  created_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_logs_pkey         PRIMARY KEY (id),
  CONSTRAINT email_logs_status_check CHECK (status IN ('sent', 'failed'))
);

COMMENT ON TABLE public.email_logs IS
  'Journal append-only des tentatives d email transactionnel (Phase 3B-0). '
  'Accès service_role uniquement. Aucun HTML ni credential stocké.';

COMMENT ON COLUMN public.email_logs.type IS
  'Type fonctionnel : welcome | phase2 | failed | funded | daily_update | '
  'phase1_certificate | challenge_certificate | reward_certificate | apology. '
  'Extensible sans migration (TEXT sans CHECK fermé).';

COMMENT ON COLUMN public.email_logs.status IS
  'sent = Resend a accepté l email. failed = Resend a refusé ou réseau KO.';

COMMENT ON COLUMN public.email_logs.resend_id IS
  'ID retourné par Resend API (data.id). NULL si échec avant réponse.';

COMMENT ON COLUMN public.email_logs.error IS
  'Message d erreur sanitisé, tronqué à 500 chars côté applicatif. '
  'Jamais de HTML, jamais de credentials, jamais de response body complet.';

COMMENT ON COLUMN public.email_logs.event_key IS
  'Clé informative pour future idempotence. Exemples : '
  'daily_update:{challengeId}:2026-08-08 | failed:{challengeId}. '
  'Pas de UNIQUE en 3B-0 : n empêche PAS un double envoi Resend.';

-- ── Index ────────────────────────────────────────────────────

-- Tri chronologique décroissant (Email Center — journal principal)
CREATE INDEX IF NOT EXISTS email_logs_created_at_idx
  ON public.email_logs(created_at DESC);

-- Lookup par type (filtres Email Center)
CREATE INDEX IF NOT EXISTS email_logs_type_idx
  ON public.email_logs(type);

-- Lookup par utilisateur (historique emails d'un trader)
CREATE INDEX IF NOT EXISTS email_logs_user_id_idx
  ON public.email_logs(user_id)
  WHERE user_id IS NOT NULL;

-- Lookup par challenge (contexte challenge dans Email Center)
CREATE INDEX IF NOT EXISTS email_logs_challenge_id_idx
  ON public.email_logs(challenge_id)
  WHERE challenge_id IS NOT NULL;

-- Index simple sur event_key (recherche future, non UNIQUE)
CREATE INDEX IF NOT EXISTS email_logs_event_key_idx
  ON public.email_logs(event_key)
  WHERE event_key IS NOT NULL;

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.email_logs FROM PUBLIC;
REVOKE ALL ON public.email_logs FROM anon;
REVOKE ALL ON public.email_logs FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.email_logs
  TO service_role;

COMMIT;
