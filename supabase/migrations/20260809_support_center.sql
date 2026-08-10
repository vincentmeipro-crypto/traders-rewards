-- ============================================================
-- TRADERS REWARDS — Phase 3B-3a
-- Support Center : table support_tickets + extension admin_notes
-- À exécuter manuellement dans Supabase SQL Editor.
--
-- Périmètre de cette migration :
--   1. Créer public.support_tickets
--   2. Créer public.update_support_ticket_timestamp() — fonction DÉDIÉE
--      (ne touche PAS public.update_updated_at_column() existante)
--   3. Créer le trigger updated_at sur support_tickets
--   4. Créer les index
--   5. Appliquer RLS + permissions service_role
--   6. Étendre admin_notes.target_type_check pour 'support_ticket'
--
-- FONCTIONS :
--   Cette migration NE MODIFIE PAS public.update_updated_at_column().
--   Cette fonction est utilisée par d'autres tables (challenge_products, etc.).
--   Une fonction dédiée public.update_support_ticket_timestamp() est créée
--   pour le trigger de support_tickets uniquement.
--
-- ADMIN_NOTES :
--   Avant d'exécuter, vérifier les target_type existants (READ-ONLY) :
--
--     SELECT target_type, COUNT(*)
--     FROM public.admin_notes
--     GROUP BY target_type
--     ORDER BY target_type;
--
--   La nouvelle contrainte autorise : trader | challenge | payout | support_ticket
--   Les notes existantes ne sont pas modifiées.
--   L'opération DROP CONSTRAINT + ADD CONSTRAINT est transactionnelle
--   et ne supprime aucune donnée.
--
-- IMPORTANT :
--   - Aucun code applicatif modifié dans cette étape.
--   - L'API /api/support existante N'EST PAS modifiée (email Resend conservé).
--   - L'insertion DB sera ajoutée en 3B-3b.
--
-- Architecture user_id :
--   Nullable, sans FK Postgres — même pattern que email_logs.user_id.
--   Formulaire support public : pas d'auth requise.
--   Préserve les tickets si un compte est ultérieurement supprimé.
--
-- Statut workflow :
--   new (reçu) → open (en cours) → resolved (clôturé)
--   Pas de 'closed' séparé en V1. Réouvrir = mettre status à 'open'.
--
-- Catégorie :
--   Nullable — le formulaire public V1 ne demande pas la catégorie.
--   Renseignée manuellement par l'admin depuis le CRM (3B-3b+).
--
-- Notes admin sur tickets :
--   Via admin_notes WHERE target_type = 'support_ticket'.
--   Réutilise le système existant — pas de duplication.
-- ============================================================

BEGIN;

-- ── 1. Table support_tickets ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_tickets (

  -- Identifiant unique du ticket
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),

  -- Trader : nullable (formulaire public, pas d'auth)
  -- Sans FK Postgres : préserve les tickets si le compte est supprimé.
  -- Rapprochement par email si user_id IS NULL.
  -- Pattern identique à email_logs.user_id.
  user_id       uuid,

  -- Champs formulaire public — présents dans la route /api/support actuelle :
  --   POST { firstName, lastName, email, message }
  first_name    text        NOT NULL,
  last_name     text        NOT NULL,
  email         text        NOT NULL,

  -- Subject : nullable — le formulaire V1 n'a pas de champ subject.
  -- L'API 3B-3b générera automatiquement : '[Support] {firstName} {lastName}'.
  subject       text,

  -- Corps du message
  message       text        NOT NULL,

  -- Workflow : new → open → resolved
  status        text        NOT NULL DEFAULT 'new',

  -- Catégorie assignée par l'admin depuis le CRM — nullable en V1
  category      text,

  -- Email de l'admin responsable du ticket — nullable
  assigned_to   text,

  -- Horodatages
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),   -- mis à jour par trigger dédié
  resolved_at   timestamptz,                          -- NULL tant que status != 'resolved'

  -- ── Contraintes ──────────────────────────────────────────────────────────

  CONSTRAINT support_tickets_pkey
    PRIMARY KEY (id),

  -- Workflow statut contrôlé — 3 valeurs, pas davantage
  CONSTRAINT support_tickets_status_check
    CHECK (status IN ('new', 'open', 'resolved')),

  -- Catégorie contrôlée, nullable autorisé (formulaire V1 sans catégorie)
  CONSTRAINT support_tickets_category_check
    CHECK (
      category IS NULL
      OR category IN ('billing', 'challenge', 'mt5', 'reward', 'kyc', 'technical', 'other')
    ),

  -- Email non vide, max 254 chars (RFC 5321)
  CONSTRAINT support_tickets_email_check
    CHECK (
      length(trim(email)) > 0
      AND length(email) <= 254
    ),

  -- Prénom non vide, max 100 chars
  CONSTRAINT support_tickets_first_name_check
    CHECK (
      length(trim(first_name)) > 0
      AND length(first_name) <= 100
    ),

  -- Nom non vide, max 100 chars
  CONSTRAINT support_tickets_last_name_check
    CHECK (
      length(trim(last_name)) > 0
      AND length(last_name) <= 100
    ),

  -- Message non vide, max 8 000 chars
  -- (messages support légitimes peuvent être longs et détaillés)
  CONSTRAINT support_tickets_message_check
    CHECK (
      length(trim(message)) > 0
      AND length(message) <= 8000
    ),

  -- Subject nullable ; non vide si fourni, max 200 chars
  CONSTRAINT support_tickets_subject_check
    CHECK (
      subject IS NULL
      OR (length(trim(subject)) > 0 AND length(subject) <= 200)
    ),

  -- Assigné : email admin, nullable, max 254 chars si fourni
  CONSTRAINT support_tickets_assigned_to_check
    CHECK (
      assigned_to IS NULL
      OR (length(trim(assigned_to)) > 0 AND length(assigned_to) <= 254)
    )

);

-- ── Commentaires ──────────────────────────────────────────────────────────────

COMMENT ON TABLE public.support_tickets IS
  'Tickets de support client — Phase 3B-3. '
  'Alimenté par POST /api/support via createAdminClient (service_role). '
  'Jamais inséré directement depuis le navigateur (RLS bloque anon/authenticated). '
  'Notes admin via admin_notes WHERE target_type = ''support_ticket''.';

COMMENT ON COLUMN public.support_tickets.user_id IS
  'UUID auth.users.id si le trader est identifié. Nullable. '
  'Pas de FK Postgres : formulaire public autorisé sans compte. '
  'Rapprochement trader par email si user_id IS NULL. '
  'Pattern identique à email_logs.user_id.';

COMMENT ON COLUMN public.support_tickets.subject IS
  'Objet du ticket. Nullable en V1 : le formulaire public n''a pas de champ subject. '
  'L''API 3B-3b génère automatiquement : ''[Support] {firstName} {lastName}''.';

COMMENT ON COLUMN public.support_tickets.status IS
  'Workflow : new (reçu) → open (en cours) → resolved (clôturé). '
  'Pas de statut ''closed'' séparé en V1. '
  'Réouvrir un ticket = mettre status à ''open''.';

COMMENT ON COLUMN public.support_tickets.category IS
  'Catégorie assignée par l''admin depuis le CRM. '
  'Nullable : formulaire public V1 ne demande pas la catégorie. '
  'Valeurs autorisées : billing | challenge | mt5 | reward | kyc | technical | other.';

COMMENT ON COLUMN public.support_tickets.assigned_to IS
  'Email de l''admin responsable du ticket. Nullable.';

COMMENT ON COLUMN public.support_tickets.updated_at IS
  'Mis à jour automatiquement par le trigger support_tickets_updated_at. '
  'Via la fonction dédiée update_support_ticket_timestamp(). '
  'NE dépend PAS de update_updated_at_column() (fonction globale non modifiée).';

COMMENT ON COLUMN public.support_tickets.resolved_at IS
  'Horodatage de résolution. NULL tant que status != ''resolved''. '
  'Rempli par l''API CRM lors du passage à ''resolved''. '
  'Remis à NULL si le ticket est rouvert (status → ''open'').';

-- ── 2. Fonction updated_at DÉDIÉE ────────────────────────────────────────────
--
-- IMPORTANT : cette fonction est PROPRE à support_tickets.
-- Elle NE remplace PAS public.update_updated_at_column() (utilisée par
-- challenge_products et potentiellement d'autres tables).
--
-- Nommée explicitement pour éviter tout conflit présent ou futur.

CREATE OR REPLACE FUNCTION public.update_support_ticket_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_support_ticket_timestamp() IS
  'Trigger function dédiée à support_tickets.updated_at (Phase 3B-3a). '
  'Indépendante de update_updated_at_column() — pas de risque de collision '
  'avec les triggers existants sur d''autres tables.';

-- ── 3. Trigger updated_at sur support_tickets ─────────────────────────────────
--
-- DROP IF EXISTS : idempotent si la migration est rejouée.
-- Appelle la fonction dédiée update_support_ticket_timestamp().

DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_support_ticket_timestamp();

-- ── 4. Index ──────────────────────────────────────────────────────────────────

-- Vue principale CRM : tickets filtrés par statut, triés par date de création.
-- Couvre : WHERE status = $1 ORDER BY created_at DESC
-- Peut aussi servir un ORDER BY created_at DESC sans filtre statut (préfixe).
CREATE INDEX IF NOT EXISTS support_tickets_status_created_idx
  ON public.support_tickets (status, created_at DESC);

-- Rapprochement trader par email (lien CRM quand user_id IS NULL).
CREATE INDEX IF NOT EXISTS support_tickets_email_idx
  ON public.support_tickets (email);

-- Lien trader authentifié — index partiel (lignes NULL exclues, plus léger).
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx
  ON public.support_tickets (user_id)
  WHERE user_id IS NOT NULL;

-- Filtrage par catégorie depuis le CRM — index partiel (NULL exclus).
CREATE INDEX IF NOT EXISTS support_tickets_category_idx
  ON public.support_tickets (category)
  WHERE category IS NOT NULL;

-- Vue "En cours" / récemment mis à jour — utile pour le tri CRM par activité.
CREATE INDEX IF NOT EXISTS support_tickets_updated_idx
  ON public.support_tickets (updated_at DESC);

-- ── 5. RLS + Permissions ──────────────────────────────────────────────────────

-- Activer Row Level Security.
-- Aucune policy anon/authenticated créée → table invisible hors service_role.
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Révoquer tout accès public/client.
REVOKE ALL ON public.support_tickets FROM PUBLIC;
REVOKE ALL ON public.support_tickets FROM anon;
REVOKE ALL ON public.support_tickets FROM authenticated;

-- Accorder tous les droits à service_role uniquement :
--   SELECT  : lecture CRM (liste tickets, détail ticket)
--   INSERT  : création ticket via /api/support → createAdminClient()
--   UPDATE  : changement statut, assignation, catégorie via CRM admin
--   DELETE  : suppression physique via CRM admin
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.support_tickets
  TO service_role;

-- ── 6. Extension admin_notes.target_type_check ───────────────────────────────
--
-- Objectif :
--   Permettre les notes admin sur les tickets de support via le système
--   polymorphique existant (admin_notes).
--     target_type = 'support_ticket'
--     target_id   = support_tickets.id (uuid)
--
-- Contrainte AVANT cette migration (Phase 3B-2a) :
--   CHECK (target_type IN ('trader', 'challenge', 'payout'))
--
-- Contrainte APRÈS cette migration :
--   CHECK (target_type IN ('trader', 'challenge', 'payout', 'support_ticket'))
--
-- GARANTIES :
--   - Les notes existantes (trader/challenge/payout) ne sont PAS modifiées.
--   - DROP CONSTRAINT + ADD CONSTRAINT est transactionnel (dans ce BEGIN/COMMIT).
--   - Si aucune note n'existe, l'opération est triviale.
--   - IF EXISTS sur DROP : idempotent si la migration est rejouée.
--   - La RLS, les index, et les données de admin_notes restent intacts.
--
-- VÉRIFICATION RECOMMANDÉE avant exécution (requête READ-ONLY séparée) :
--   SELECT target_type, COUNT(*)
--   FROM public.admin_notes
--   GROUP BY target_type
--   ORDER BY target_type;
--   → Confirmer que seuls 'trader', 'challenge', 'payout' sont présents.
--   → La nouvelle contrainte les autorise tous + 'support_ticket'.

ALTER TABLE public.admin_notes
  DROP CONSTRAINT IF EXISTS admin_notes_target_type_check;

ALTER TABLE public.admin_notes
  ADD CONSTRAINT admin_notes_target_type_check
    CHECK (target_type IN ('trader', 'challenge', 'payout', 'support_ticket'));

COMMIT;
