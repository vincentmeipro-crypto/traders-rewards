-- ============================================================
-- TRADERS REWARDS — Phase 3B-2a
-- admin_notes : notes internes CRM (traders, challenges, payouts)
-- À exécuter manuellement dans Supabase SQL Editor.
-- AVANT de déployer les APIs et l'UI 3B-2.
--
-- Accès : uniquement service_role (backend via createAdminClient).
-- anon / authenticated bloqués par RLS (aucune policy créée).
--
-- Architecture target_id :
--   target_type IN ('trader','challenge','payout')
--   target_id   uuid — tous les IDs cibles sont des uuid dans ce projet
--     trader    → auth.users.id (= profiles.user_id)
--     challenge → public.challenges.id
--     payout    → public.payouts.id
--   Pas de FK polymorphique (non supporté nativement par Postgres).
--   Pas de colonnes séparées (rigidité à chaque nouveau type).
--   Pattern identique à email_logs.user_id.
--
-- Suppression :
--   Physique (hard delete). Les notes sont des annotations opérationnelles,
--   pas des données financières ou réglementaires.
--   Pas de soft-delete : évite WHERE deleted_at IS NULL partout.
--
-- Édition :
--   Non supportée en 3B-2 (GRANT n'inclut pas UPDATE).
--   Ajouter UPDATE au GRANT si l'édition est requise dans une phase future.
-- ============================================================

BEGIN;

-- ── Table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_notes (

  -- Identifiant de la note
  id           uuid        NOT NULL DEFAULT gen_random_uuid(),

  -- Entité cible : type discriminant + identifiant uuid
  -- target_type : 'trader'    → target_id = auth.users.id
  --               'challenge' → target_id = public.challenges.id
  --               'payout'    → target_id = public.payouts.id
  target_type  text        NOT NULL,
  target_id    uuid        NOT NULL,

  -- Corps de la note (texte libre admin)
  content      text        NOT NULL,

  -- Identité de l'admin auteur (email résolu côté API)
  author_email text        NOT NULL,

  -- Horodatage immuable (pas d'updated_at : pas d'édition)
  created_at   timestamptz NOT NULL DEFAULT now(),

  -- ── Contraintes ──────────────────────────────────────────
  CONSTRAINT admin_notes_pkey
    PRIMARY KEY (id),

  -- Types de cible autorisés — extensible via ALTER TABLE + migration
  CONSTRAINT admin_notes_target_type_check
    CHECK (target_type IN ('trader', 'challenge', 'payout')),

  -- Contenu : non vide après trim, max 4 000 caractères (~600 mots)
  CONSTRAINT admin_notes_content_check
    CHECK (
      length(trim(content)) > 0
      AND length(content) <= 4000
    ),

  -- Auteur : non vide après trim, max 254 caractères (RFC 5321)
  CONSTRAINT admin_notes_author_email_check
    CHECK (
      length(trim(author_email)) > 0
      AND length(author_email) <= 254
    )

);

-- ── Commentaires ─────────────────────────────────────────────

COMMENT ON TABLE public.admin_notes IS
  'Notes internes CRM — admin uniquement (Phase 3B-2). '
  'Visible nulle part côté client. '
  'Accès service_role uniquement. Suppression physique autorisée.';

COMMENT ON COLUMN public.admin_notes.target_type IS
  'Discriminant polymorphique : trader | challenge | payout. '
  'Extensible via migration sans changer la structure de la table.';

COMMENT ON COLUMN public.admin_notes.target_id IS
  'UUID de l entité cible. '
  'trader    = auth.users.id (= profiles.user_id). '
  'challenge = public.challenges.id. '
  'payout    = public.payouts.id. '
  'Pas de FK Postgres : target_type rend une FK unique impossible. '
  'Pattern identique à email_logs.user_id.';

COMMENT ON COLUMN public.admin_notes.content IS
  'Corps de la note, max 4000 chars. '
  'Texte libre. Jamais de credentials, jamais de mots de passe. '
  'Contenu validé non vide (trim) côté DB et côté API.';

COMMENT ON COLUMN public.admin_notes.author_email IS
  'Email de l admin auteur, résolu par l API depuis ADMIN_EMAIL '
  'ou user.email (session Supabase). Max 254 chars (RFC 5321).';

COMMENT ON COLUMN public.admin_notes.created_at IS
  'Horodatage de création. Immuable — pas de updated_at (pas d édition).';

-- ── Index ────────────────────────────────────────────────────

-- Index composite principal — couvre la requête dominante :
--   WHERE target_type = 'trader' AND target_id = $1
--   ORDER BY created_at DESC
-- Couvre également challenge et payout avec le même schéma.
-- Un seul index composite suffit (Postgres peut l'utiliser
-- pour des préfixes : target_type seul, ou target_type+target_id).
CREATE INDEX IF NOT EXISTS admin_notes_target_created_idx
  ON public.admin_notes (target_type, target_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────

-- Row Level Security activé.
-- Aucune policy anon ni authenticated :
--   la table est invisible depuis tout client Supabase frontend.
-- Seul service_role (createAdminClient) peut y accéder.

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_notes FROM PUBLIC;
REVOKE ALL ON public.admin_notes FROM anon;
REVOKE ALL ON public.admin_notes FROM authenticated;

-- SELECT  : lecture des notes dans la fiche trader/challenge/payout
-- INSERT  : création d'une nouvelle note
-- DELETE  : suppression physique d'une note
-- UPDATE non accordé en 3B-2 (pas d'édition supportée)
GRANT SELECT, INSERT, DELETE
  ON public.admin_notes
  TO service_role;

COMMIT;
