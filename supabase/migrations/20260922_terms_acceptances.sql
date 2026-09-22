-- ============================================================
-- TRADERS REWARDS — Phase 3B-1
-- terms_acceptances : preuve d'acceptation des CGV et consentement
-- À exécuter manuellement dans Supabase SQL Editor.
--
-- Enregistre pour chaque paiement :
--   - quelle version des CGV a été acceptée
--   - timestamp exact de l'acceptation
--   - IP et user-agent du client
--   - consentement au démarrage immédiat
--   - langue acceptée
--   - référence au paiement (Stripe session_id ou NOWPayments payment_id)
--
-- Accès : uniquement service_role (backend via createAdminClient).
-- anon / authenticated bloqués par RLS.
-- ============================================================

BEGIN;

-- ── Table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id                      uuid        NOT NULL DEFAULT gen_random_uuid(),

  -- Références obligatoires
  user_id                 uuid        NOT NULL,
  challenge_id            uuid,                 -- FK challenges, NULL si pas encore créé
  payment_provider        text        NOT NULL CHECK (payment_provider IN ('stripe', 'crypto', 'free')),
  payment_reference       text        NOT NULL,  -- stripe_session_id ou payment_id (NOWPayments), unique par provider

  -- Version et acceptation
  terms_version           text        NOT NULL,  -- "2026-09-22" (TERMS_VERSION)
  terms_accepted          boolean     NOT NULL DEFAULT true,
  accepted_at             timestamptz NOT NULL DEFAULT now(),

  -- Consentement spécifique
  immediate_performance_requested boolean NOT NULL DEFAULT false,

  -- Environnement client
  client_ip_address       text,                 -- IPv4/IPv6 capturé côté serveur
  client_user_agent       text,                 -- User-Agent header
  language                text        NOT NULL CHECK (language IN ('fr', 'en', 'es')),

  -- Audit trail
  created_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT terms_acceptances_pkey PRIMARY KEY (id),

  -- Une acceptation par référence paiement et provider
  CONSTRAINT terms_acceptances_payment_unique
    UNIQUE (payment_provider, payment_reference)
);

COMMENT ON TABLE public.terms_acceptances IS
  'Preuve d''acceptation des CGV : timestamp, IP, user-agent, version CGV, '
  'consentement démarrage immédiat. Utilisé pour démontrer conformité '
  'rétractation/RGPD/CCPA. Append-only (aucune modification).';

COMMENT ON COLUMN public.terms_acceptances.terms_version IS
  'Version des CGV acceptées (ex: "2026-09-22"). Permet retrouver texte exact ultérieurement.';

COMMENT ON COLUMN public.terms_acceptances.accepted_at IS
  'Timestamp exact d''acceptation. Utilisé pour délai rétractation 14 jours.';

COMMENT ON COLUMN public.terms_acceptances.immediate_performance_requested IS
  'TRUE si client a coché "démarrage immédiat". Afaiblit droit rétractation (art. 14 LCCV).';

COMMENT ON COLUMN public.terms_acceptances.payment_reference IS
  'Clé unique pour idempotence : stripe_session_id ou payment_id NOWPayments.';

COMMENT ON COLUMN public.terms_acceptances.language IS
  'Langue de la CGV présentée au client (fr/en/es). Permet retrouver texte exact.';

-- ── Index ────────────────────────────────────────────────────

-- Lookup par utilisateur (historique acceptations d'un trader)
CREATE INDEX IF NOT EXISTS terms_acceptances_user_id_idx
  ON public.terms_acceptances(user_id);

-- Lookup par challenge (context paiement-challenge)
CREATE INDEX IF NOT EXISTS terms_acceptances_challenge_id_idx
  ON public.terms_acceptances(challenge_id)
  WHERE challenge_id IS NOT NULL;

-- Lookup par payment_provider + payment_reference (recherche rapide idempotence)
CREATE INDEX IF NOT EXISTS terms_acceptances_payment_idx
  ON public.terms_acceptances(payment_provider, payment_reference);

-- Tri chronologique décroissant (audits, rapports)
CREATE INDEX IF NOT EXISTS terms_acceptances_accepted_at_idx
  ON public.terms_acceptances(accepted_at DESC);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.terms_acceptances FROM PUBLIC;
REVOKE ALL ON public.terms_acceptances FROM anon;
REVOKE ALL ON public.terms_acceptances FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.terms_acceptances
  TO service_role;

COMMIT;
