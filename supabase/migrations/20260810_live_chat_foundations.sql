-- ============================================================
-- TRADERS REWARDS — Phase 3B-3c1
-- Live Chat Foundations — DB Schema uniquement
-- À exécuter manuellement dans Supabase → SQL Editor.
-- AVANT de déployer les APIs et le widget client.
--
-- PÉRIMÈTRE :
--   1. Table public.chat_conversations
--   2. Table public.chat_messages
--   3. Fonction dédiée public.update_chat_conversation_timestamp()
--   4. Trigger updated_at sur chat_conversations
--   5. Fonction dédiée public.update_chat_last_message_at()
--   6. Trigger last_message_at sur chat_messages → chat_conversations
--   7. Index chat_conversations
--   8. Index chat_messages
--   9. RLS + permissions chat_conversations (service_role uniquement)
--  10. RLS + permissions chat_messages (service_role uniquement)
--  11. Supabase Realtime Publication (prérequis technique)
--  12. Extension admin_notes.target_type_check : + 'chat_conversation'
--
-- HORS PÉRIMÈTRE (Phase 3B-3c2 et suivantes) :
--   - Aucune API
--   - Aucun widget client
--   - Aucun Realtime côté code applicatif
--   - Policies RLS client (à ajouter AVANT activation du widget navigateur)
--
-- IDEMPOTENT — peut être ré-exécuté sans dommage :
--   CREATE TABLE IF NOT EXISTS
--   CREATE INDEX IF NOT EXISTS
--   CREATE OR REPLACE FUNCTION
--   DROP TRIGGER IF EXISTS + CREATE TRIGGER
--   DO $$ avec vérifications pg_constraint + pg_publication_tables
--   DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT
--
-- FONCTIONS TRIGGER NOMMÉES DÉDIÉES :
--   public.update_chat_conversation_timestamp()   → BEFORE UPDATE chat_conversations
--   public.update_chat_last_message_at()          → AFTER INSERT chat_messages
--   NE MODIFIE PAS :
--     update_updated_at_column()           (challenge_products — challenge_engine.sql)
--     update_support_ticket_timestamp()    (support_tickets — 20260809_support_center.sql)
--     update_settings_timestamp()          (settings — create_settings.sql)
--     prevent_rules_snapshot_update()      (challenges — challenge_engine.sql)
--
-- SÉCURITÉ :
--   chat_conversations : service_role → SELECT, INSERT, UPDATE, DELETE
--   chat_messages      : service_role → SELECT, INSERT, DELETE (pas UPDATE — append-only)
--   anon + authenticated : REVOKE ALL → aucun accès direct navigateur
--   Policies client RLS : NON CRÉÉES dans cette phase.
--     À ajouter en Phase 3B-3c2 avant activation du widget.
--   visitor_token_hash : seul le hash SHA-256 est stocké (jamais le token brut).
--     Token brut → cookie httpOnly ; Secure ; SameSite=Strict uniquement.
--   Aucun credential. Aucun HTML. Aucune donnée financière.
--
-- REALTIME :
--   chat_conversations + chat_messages ajoutés à supabase_realtime.
--   Prérequis pour abonnements Realtime futurs.
--   Sans policies client RLS, aucun navigateur ne peut s'abonner.
--   Bloc DO $$ idempotent — vérifie pg_publication_tables avant ALTER.
--
-- ADMIN_NOTES :
--   Contrainte étendue :
--     AVANT  : trader | challenge | payout | support_ticket
--     APRÈS  : trader | challenge | payout | support_ticket | chat_conversation
--   Notes existantes non modifiées.
--   Pattern identique à l'extension Phase 3B-3a.
--
-- UNREAD — Stratégie B (timestamps conversation) :
--   client_last_read_at / admin_last_read_at sur chat_conversations.
--   Non lus admin  = COUNT(messages client après admin_last_read_at).
--   Non lus client = COUNT(messages admin après client_last_read_at).
--   Un seul UPDATE par "ouverture de conversation" — pas par message.
--
-- USER_ID — Sans FK Postgres :
--   Pattern établi : email_logs.user_id, support_tickets.user_id.
--   Préserve l'historique chat si le compte est ultérieurement supprimé.
--   email + first_name + last_name conservent l'identité du propriétaire.
-- ============================================================

BEGIN;

-- ════════════════════════════════════════════════════════════
-- §1 — TABLE chat_conversations
-- ════════════════════════════════════════════════════════════
--
-- Représente une session de conversation entre un visiteur/trader
-- et le support Traders Rewards.
--
-- IDENTITÉ DU PROPRIÉTAIRE :
--   A. Trader connecté   : user_id IS NOT NULL, visitor_token_hash IS NULL
--   B. Visiteur anonyme  : user_id IS NULL,     visitor_token_hash IS NOT NULL
--   Contrainte DB        : user_id IS NOT NULL OR visitor_token_hash IS NOT NULL
--
-- USER_ID :
--   UUID auth.users.id. PAS de FK Postgres.
--   Pattern email_logs.user_id + support_tickets.user_id.
--   Préserve la conversation si le compte est supprimé.
--   email + first_name + last_name conservent l'identité si user_id orphelin.
--
-- VISITOR_TOKEN_HASH :
--   Hash SHA-256 du token aléatoire fort généré SERVER-SIDE en Phase 3B-3c2.
--   Token brut → cookie httpOnly ; Secure ; SameSite=Strict uniquement.
--   DB → uniquement le hash. Jamais le token brut.
--   Isolation visiteurs : un token unique → une seule conversation.
--   Lookup : cookie reçu → hash server-side → SELECT WHERE visitor_token_hash = $hash.
--
-- STATUTS (4 valeurs) :
--   waiting_support → état initial. Client a envoyé, attend réponse admin.
--   open            → admin a pris en charge, en cours de traitement.
--   waiting_client  → admin a répondu, attend retour du client.
--   closed          → conversation terminée. Réouvrir = status → 'waiting_support'.
--
-- UNREAD (stratégie B — timestamps sur conversation) :
--   client_last_read_at : quand le client a lu la conversation.
--   admin_last_read_at  : quand l'admin a lu la conversation.
--   NULL = jamais ouvert → tous les messages = non lus.
--   Mise à jour : un seul UPDATE par "ouverture", pas par message.
--
-- LAST_MESSAGE_AT :
--   Mis à jour par trigger AFTER INSERT ON chat_messages.
--   NULL = aucun message encore.
--
-- SUPPORT_TICKET_ID :
--   FK nullable vers support_tickets(id). ON DELETE SET NULL.
--   Permet "Convertir en ticket" sans migration ultérieure.
--   Ticket supprimé → NULL ici, conversation préservée.
--
-- RÉTENTION :
--   Pas d'automatisation de purge en 3B-3c1.
--   Suppression RGPD : DELETE WHERE user_id = $id → CASCADE sur messages.
--   Purge conversations closed > X mois : filtre updated_at + status.

CREATE TABLE IF NOT EXISTS public.chat_conversations (

  -- ── Identifiant ──────────────────────────────────────────
  id                   uuid        NOT NULL DEFAULT gen_random_uuid(),

  -- ── Propriétaire de la conversation ─────────────────────
  --
  -- user_id : UUID auth.users.id si trader authentifié.
  -- Nullable. PAS de FK Postgres (pattern email_logs, support_tickets).
  -- Préserve la conversation si le compte est supprimé ultérieurement.
  user_id              uuid,

  -- visitor_token_hash : hash SHA-256 du token visiteur anonyme.
  -- Token brut = cookie httpOnly Secure uniquement — jamais en DB.
  -- Null pour les traders authentifiés (user_id utilisé à la place).
  -- Minimum 43 chars : SHA-256 base64url=43, hex=64.
  visitor_token_hash   text,

  -- ── Informations de contact ──────────────────────────────
  --
  -- Renseignées par le visiteur (formulaire pré-chat) ou récupérées
  -- automatiquement depuis profiles si trader authentifié.
  -- Permettent l'identification même si user_id devient orphelin.
  email                text,
  first_name           text,
  last_name            text,

  -- ── Statut de la conversation ────────────────────────────
  --
  -- waiting_support : état initial — client attend réponse admin
  -- open            : admin a pris en charge, en cours de traitement
  -- waiting_client  : admin a répondu, client doit répondre
  -- closed          : conversation terminée
  status               text        NOT NULL DEFAULT 'waiting_support',

  -- ── Lien optionnel vers un ticket support ────────────────
  --
  -- FK nullable. ON DELETE SET NULL : ticket supprimé → NULL ici.
  -- Conversation préservée. Permet "Convertir en ticket" sans migration.
  support_ticket_id    uuid
                         REFERENCES public.support_tickets(id)
                         ON DELETE SET NULL,

  -- ── Horodatages ─────────────────────────────────────────
  -- created_at    : immuable (append-only)
  -- updated_at    : mis à jour par trigger BEFORE UPDATE (fonction dédiée)
  -- last_message_at : mis à jour par trigger AFTER INSERT ON chat_messages
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  last_message_at      timestamptz,

  -- ── Marqueurs de lecture (unread — stratégie B) ──────────
  --
  -- NULL = jamais lu → tous les messages sont non lus.
  -- Mise à jour : un seul UPDATE par "ouverture de conversation".
  --
  -- Non lus admin  = COUNT messages WHERE sender_type = 'client'
  --                    AND created_at > admin_last_read_at
  -- Non lus client = COUNT messages WHERE sender_type = 'admin'
  --                    AND created_at > client_last_read_at
  client_last_read_at  timestamptz,
  admin_last_read_at   timestamptz,

  -- ── Contraintes ──────────────────────────────────────────

  CONSTRAINT chat_conversations_pkey
    PRIMARY KEY (id),

  -- Propriété obligatoire : au moins un identifiant doit être présent.
  -- Empêche les conversations fantômes sans propriétaire identifiable.
  -- Cas valides :
  --   user_id NOT NULL + visitor_token_hash NULL     → trader connecté
  --   user_id NULL     + visitor_token_hash NOT NULL → visiteur anonyme
  -- Cas interdit :
  --   user_id NULL     + visitor_token_hash NULL     → refusé
  CONSTRAINT chat_conversations_owner_check
    CHECK (
      user_id IS NOT NULL
      OR visitor_token_hash IS NOT NULL
    ),

  -- Statuts autorisés — 4 valeurs, workflow explicite
  CONSTRAINT chat_conversations_status_check
    CHECK (status IN (
      'waiting_support',
      'open',
      'waiting_client',
      'closed'
    )),

  -- Email : nullable (visiteur sans email possible)
  -- Non vide si fourni, max 254 chars (RFC 5321)
  CONSTRAINT chat_conversations_email_check
    CHECK (
      email IS NULL
      OR (length(trim(email)) > 0 AND length(email) <= 254)
    ),

  -- Prénom : nullable, non vide si fourni, max 100 chars
  CONSTRAINT chat_conversations_first_name_check
    CHECK (
      first_name IS NULL
      OR (length(trim(first_name)) > 0 AND length(first_name) <= 100)
    ),

  -- Nom : nullable, non vide si fourni, max 100 chars
  CONSTRAINT chat_conversations_last_name_check
    CHECK (
      last_name IS NULL
      OR (length(trim(last_name)) > 0 AND length(last_name) <= 100)
    ),

  -- visitor_token_hash : non vide si fourni, min 43 chars
  -- SHA-256 base64url = 43 chars ; hex = 64 chars.
  -- Encodage exact standardisé côté API en Phase 3B-3c2.
  CONSTRAINT chat_conversations_token_hash_check
    CHECK (
      visitor_token_hash IS NULL
      OR (length(trim(visitor_token_hash)) > 0
          AND length(visitor_token_hash) >= 43)
    )

);

-- ── Commentaires ─────────────────────────────────────────────────────────────

COMMENT ON TABLE public.chat_conversations IS
  'Conversations du Live Chat interne Traders Rewards — Phase 3B-3c1. '
  'Accès service_role uniquement en Phase 3B-3c1. '
  'Policies RLS client à ajouter en Phase 3B-3c2 avant activation widget. '
  'Aucun credential. Aucun HTML. Aucune donnée financière.';

COMMENT ON COLUMN public.chat_conversations.user_id IS
  'UUID auth.users.id si trader authentifié. Nullable. '
  'PAS de FK Postgres : préserve la conversation si le compte est supprimé. '
  'Pattern identique à email_logs.user_id et support_tickets.user_id.';

COMMENT ON COLUMN public.chat_conversations.visitor_token_hash IS
  'Hash SHA-256 du token visiteur anonyme. '
  'Token brut = cookie httpOnly Secure uniquement. '
  'La DB ne contient jamais le token brut. Null pour traders authentifiés. '
  'Isolation visiteurs : un token unique → une seule conversation accessible.';

COMMENT ON COLUMN public.chat_conversations.status IS
  'Statut de la conversation. '
  'waiting_support : état initial — client attend réponse admin. '
  'open : admin a pris en charge, en cours de traitement. '
  'waiting_client : admin a répondu, client doit répondre. '
  'closed : conversation terminée. Réouvrir = status → ''waiting_support''.';

COMMENT ON COLUMN public.chat_conversations.support_ticket_id IS
  'FK optionnelle vers support_tickets(id). ON DELETE SET NULL. '
  'Ticket supprimé → NULL ici, conversation préservée. '
  'Permet ''Convertir en ticket'' depuis le CRM sans migration ultérieure.';

COMMENT ON COLUMN public.chat_conversations.last_message_at IS
  'Mis à jour par trigger AFTER INSERT ON chat_messages. '
  'Via public.update_chat_last_message_at(). '
  'NULL = aucun message encore envoyé dans cette conversation.';

COMMENT ON COLUMN public.chat_conversations.updated_at IS
  'Mis à jour par trigger BEFORE UPDATE via update_chat_conversation_timestamp(). '
  'Également mis à jour lors de chaque nouveau message (trigger last_message_at). '
  'NE dépend PAS de update_updated_at_column() (fonction globale existante).';

COMMENT ON COLUMN public.chat_conversations.client_last_read_at IS
  'Stratégie unread B : timestamp de dernière ouverture par le client. '
  'Non lus client = messages admin postérieurs à cette date. '
  'NULL = client n''a jamais ouvert la conversation (tous messages non lus).';

COMMENT ON COLUMN public.chat_conversations.admin_last_read_at IS
  'Stratégie unread B : timestamp de dernière ouverture par l''admin. '
  'Non lus admin = messages client postérieurs à cette date. '
  'NULL = admin n''a jamais ouvert la conversation (tous messages non lus).';


-- ════════════════════════════════════════════════════════════
-- §2 — TABLE chat_messages
-- ════════════════════════════════════════════════════════════
--
-- Messages individuels d'une conversation.
--
-- APPEND-ONLY :
--   Pas de UPDATE côté applicatif — les messages sont immuables.
--   Pas de colonne updated_at (immuabilité garantie).
--   Suppression physique : uniquement en cascade (conversation supprimée).
--
-- SENDER_TYPE :
--   client → message du trader ou visiteur
--   admin  → réponse du support Traders Rewards
--   system → message automatique (ouverture, fermeture, inactivité...)
--
-- SENDER_USER_ID :
--   UUID auth.users.id si expéditeur connu.
--   NULL pour visiteurs anonymes (sender_type='client') et messages système.
--   PAS de FK Postgres : préserve les messages si le compte est supprimé.
--
-- UNREAD :
--   Stratégie B : pas de colonne read_at ici.
--   Comptage via chat_conversations.{admin,client}_last_read_at.
--
-- CONTENU :
--   Texte brut uniquement. Pas de HTML. Pas de Markdown interprété.
--   Max 4000 chars : live chat = messages courts.
--   (cf. support_tickets.message = 8000 chars pour messages longs détaillés.)
--
-- CASCADE :
--   ON DELETE CASCADE depuis chat_conversations.
--   Conversation supprimée (action admin) → tous ses messages supprimés.

CREATE TABLE IF NOT EXISTS public.chat_messages (

  -- ── Identifiant ──────────────────────────────────────────
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),

  -- ── Conversation parente ─────────────────────────────────
  -- NOT NULL obligatoire — un message sans conversation est invalide.
  -- ON DELETE CASCADE : messages supprimés si conversation supprimée.
  conversation_id  uuid        NOT NULL
                     REFERENCES public.chat_conversations(id)
                     ON DELETE CASCADE,

  -- ── Expéditeur ───────────────────────────────────────────
  -- Discriminant : client | admin | system
  sender_type      text        NOT NULL,

  -- UUID de l'expéditeur si connu :
  --   admin  → auth.users.id de l'admin (attribution CRM)
  --   client → auth.users.id du trader (NULL si visiteur anonyme)
  --   system → toujours NULL
  -- PAS de FK Postgres : préserve les messages si le compte est supprimé.
  sender_user_id   uuid,

  -- ── Contenu ───────────────────────────────────────────────
  -- Texte brut uniquement. Max 4000 chars.
  -- Jamais de HTML. Jamais de Markdown interprété.
  -- Jamais de credentials, de données financières, de données MT5.
  message          text        NOT NULL,

  -- ── Horodatage ───────────────────────────────────────────
  -- Immuable — messages append-only. Pas de updated_at.
  -- Utilisé pour le calcul unread (comparaison avec {admin,client}_last_read_at).
  created_at       timestamptz NOT NULL DEFAULT now(),

  -- ── Contraintes ──────────────────────────────────────────

  CONSTRAINT chat_messages_pkey
    PRIMARY KEY (id),

  -- Expéditeurs autorisés — 3 valeurs
  CONSTRAINT chat_messages_sender_type_check
    CHECK (sender_type IN ('client', 'admin', 'system')),

  -- Message : non vide après trim, max 4000 chars
  -- Chat live = messages courts (cf. support_tickets.message = 8000 chars)
  CONSTRAINT chat_messages_content_check
    CHECK (
      length(trim(message)) > 0
      AND length(message) <= 4000
    )

);

-- ── Commentaires ─────────────────────────────────────────────────────────────

COMMENT ON TABLE public.chat_messages IS
  'Messages du Live Chat interne Traders Rewards — Phase 3B-3c1. '
  'Append-only côté applicatif. Immuables après insertion. '
  'Suppression en cascade si la conversation parente est supprimée (action admin). '
  'Texte brut uniquement. Aucun HTML. Aucun credential. Aucune donnée financière.';

COMMENT ON COLUMN public.chat_messages.conversation_id IS
  'FK NOT NULL vers chat_conversations(id). '
  'ON DELETE CASCADE : messages supprimés si conversation supprimée par admin.';

COMMENT ON COLUMN public.chat_messages.sender_type IS
  'Discriminant expéditeur : client | admin | system. '
  'system : messages automatiques (ouverture session, fermeture, inactivité...).';

COMMENT ON COLUMN public.chat_messages.sender_user_id IS
  'UUID auth.users.id de l''expéditeur si connu. '
  'NULL pour visiteurs anonymes (sender_type=''client'') et messages système. '
  'PAS de FK Postgres : préserve les messages si le compte est supprimé.';

COMMENT ON COLUMN public.chat_messages.message IS
  'Corps du message. Texte brut uniquement. '
  'Max 4000 chars (live chat = messages courts). '
  'Jamais de HTML, jamais de Markdown interprété. '
  'Jamais de credentials, de données MT5, de données financières.';

COMMENT ON COLUMN public.chat_messages.created_at IS
  'Horodatage d''envoi. Immuable — append-only. Pas de updated_at. '
  'Utilisé pour le calcul unread avec {admin,client}_last_read_at.';


-- ════════════════════════════════════════════════════════════
-- §3 — FONCTION update_chat_conversation_timestamp()
-- ════════════════════════════════════════════════════════════
--
-- BEFORE UPDATE trigger sur chat_conversations uniquement.
-- Dédiée au chat — n'interfère pas avec les fonctions existantes :
--   update_updated_at_column()          → challenge_products
--   update_support_ticket_timestamp()   → support_tickets
--   update_settings_timestamp()         → settings
--
-- CREATE OR REPLACE : idempotent.

CREATE OR REPLACE FUNCTION public.update_chat_conversation_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_chat_conversation_timestamp() IS
  'Trigger function BEFORE UPDATE dédiée à chat_conversations.updated_at (Phase 3B-3c1). '
  'Indépendante des fonctions existantes : update_updated_at_column(), '
  'update_support_ticket_timestamp(), update_settings_timestamp(). '
  'NE JAMAIS remplacer par update_updated_at_column() (fonction globale existante).';


-- ════════════════════════════════════════════════════════════
-- §4 — TRIGGER updated_at SUR chat_conversations
-- ════════════════════════════════════════════════════════════
--
-- DROP IF EXISTS : idempotent si la migration est rejouée.

DROP TRIGGER IF EXISTS chat_conversations_updated_at
  ON public.chat_conversations;

CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_conversation_timestamp();


-- ════════════════════════════════════════════════════════════
-- §5 — FONCTION update_chat_last_message_at()
-- ════════════════════════════════════════════════════════════
--
-- AFTER INSERT sur chat_messages.
-- Met à jour chat_conversations.last_message_at et updated_at
-- à chaque nouveau message.
--
-- Fiabilité : trigger DB — ne peut pas être oublié côté API.
--
-- Pas de boucle récursive :
--   INSERT chat_messages → AFTER INSERT → UPDATE chat_conversations
--   → BEFORE UPDATE sur chat_conversations → re-set updated_at = now()
--   Aucun UPDATE sur chat_messages déclenché → pas de récursion.
--
-- CREATE OR REPLACE : idempotent.

CREATE OR REPLACE FUNCTION public.update_chat_last_message_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.chat_conversations
  SET
    last_message_at = NEW.created_at,
    updated_at      = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_chat_last_message_at() IS
  'Trigger function AFTER INSERT ON chat_messages (Phase 3B-3c1). '
  'Met à jour chat_conversations.last_message_at et updated_at '
  'à chaque nouveau message. Fiable côté DB — ne peut pas être oublié côté API. '
  'Pas de récursion : UPDATE chat_conversations uniquement, pas chat_messages.';


-- ════════════════════════════════════════════════════════════
-- §6 — TRIGGER last_message_at SUR chat_messages
-- ════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS chat_messages_update_conversation
  ON public.chat_messages;

CREATE TRIGGER chat_messages_update_conversation
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_last_message_at();


-- ════════════════════════════════════════════════════════════
-- §7 — INDEX chat_conversations
-- ════════════════════════════════════════════════════════════

-- Index composite principal : CRM admin — filtre statut + tri par activité récente.
-- Requêtes couvertes :
--   WHERE status = 'waiting_support' ORDER BY last_message_at DESC
--   WHERE status IN (...) ORDER BY last_message_at DESC
CREATE INDEX IF NOT EXISTS chat_conversations_status_last_msg_idx
  ON public.chat_conversations (status, last_message_at DESC);

-- Tri chronologique décroissant sans filtre statut (liste complète CRM).
CREATE INDEX IF NOT EXISTS chat_conversations_last_msg_idx
  ON public.chat_conversations (last_message_at DESC);

-- Lookup par trader authentifié — index partiel (lignes NULL exclues).
-- WHERE user_id = $1 (fiche trader CRM, historique chat dans dashboard trader).
CREATE INDEX IF NOT EXISTS chat_conversations_user_id_idx
  ON public.chat_conversations (user_id)
  WHERE user_id IS NOT NULL;

-- Lookup par visitor token hash — UNIQUE index partiel (lignes NULL exclues).
-- WHERE visitor_token_hash = $hash (cookie → hash → conversation visiteur).
-- UNIQUE : un hash donné ne peut appartenir qu'à une seule conversation.
-- Garantit l'isolation visiteurs au niveau DB — pas seulement applicatif.
-- Partiel (WHERE NOT NULL) : les traders authentifiés (NULL) non concernés.
CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_visitor_token_uidx
  ON public.chat_conversations (visitor_token_hash)
  WHERE visitor_token_hash IS NOT NULL;

-- Lookup lien ticket support — index partiel (lignes NULL exclues).
-- WHERE support_ticket_id = $id (depuis la fiche ticket dans le CRM).
CREATE INDEX IF NOT EXISTS chat_conversations_ticket_id_idx
  ON public.chat_conversations (support_ticket_id)
  WHERE support_ticket_id IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- §8 — INDEX chat_messages
-- ════════════════════════════════════════════════════════════

-- Index composite principal : thread d'une conversation, ordre chronologique.
-- Requête dominante : WHERE conversation_id = $1 ORDER BY created_at ASC
-- Couvre également : WHERE conversation_id = $1 AND created_at > $timestamp
--   (calcul non lus avec stratégie B — comparaison avec last_read_at).
CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx
  ON public.chat_messages (conversation_id, created_at ASC);


-- ════════════════════════════════════════════════════════════
-- §9 — RLS + PERMISSIONS chat_conversations
-- ════════════════════════════════════════════════════════════
--
-- Phase 3B-3c1 : service_role UNIQUEMENT.
-- Aucune policy anon/authenticated créée dans cette phase.
--
-- IMPORTANT — NE PAS ACTIVER LE WIDGET SANS CES POLICIES (Phase 3B-3c2) :
--
-- Trader connecté (prévisionnel 3B-3c2) :
--   SELECT : WHERE user_id = auth.uid()
--   INSERT : WITH CHECK (user_id = auth.uid())
--   → Realtime abonnement possible via JWT Supabase valide
--
-- Visiteur anonyme (prévisionnel 3B-3c2) :
--   Pas de policy Supabase navigateur possible.
--   Raison : visitor_token est dans un cookie httpOnly — inaccessible
--   aux RLS policies évaluées côté Supabase JS (navigateur).
--   Accès exclusif : API Route server-side (server lit le cookie,
--   calcule le hash, interroge Supabase via service_role).
--   Realtime : NON pour les visiteurs → polling ou SSE via API.
--   Realtime : OUI pour les traders connectés (JWT valide + RLS policy).

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.chat_conversations FROM PUBLIC;
REVOKE ALL ON public.chat_conversations FROM anon;
REVOKE ALL ON public.chat_conversations FROM authenticated;

-- Phase 3B-3c1 : service_role uniquement.
-- UPDATE inclus : admin modifie statut, last_read_at, support_ticket_id.
-- DELETE inclus : admin supprime une conversation (cascade sur messages).
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.chat_conversations
  TO service_role;


-- ════════════════════════════════════════════════════════════
-- §10 — RLS + PERMISSIONS chat_messages
-- ════════════════════════════════════════════════════════════
--
-- Même architecture que chat_conversations.
-- Phase 3B-3c1 : service_role UNIQUEMENT.
--
-- Trader connecté (prévisionnel 3B-3c2) :
--   SELECT : via JOIN sur chat_conversations WHERE user_id = auth.uid()
--   INSERT : WITH CHECK que la conversation appartient au trader
--   → Realtime : abonnement filtré par conversation_id (RLS garantit isolation)
--
-- Visiteur anonyme (prévisionnel 3B-3c2) :
--   Même limitation : cookie httpOnly inaccessible à RLS JS.
--   Accès : API Route server-side uniquement.
--
-- Un visiteur ne peut jamais lire les messages d'un autre visiteur.
-- Garantie : visitor_token unique → une seule conversation → ses seuls messages.

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.chat_messages FROM PUBLIC;
REVOKE ALL ON public.chat_messages FROM anon;
REVOKE ALL ON public.chat_messages FROM authenticated;

-- REVOKE ALL depuis service_role avant le GRANT final.
-- Garantit l'idempotence : si un GRANT UPDATE a été accordé par erreur
-- dans une session précédente, ce REVOKE ALL le supprime.
-- La reconstruction future de la DB produit exactement le même état.
REVOKE ALL ON public.chat_messages FROM service_role;

-- Phase 3B-3c1 : service_role uniquement.
-- Append-only : UPDATE intentionnellement exclu.
--   Les messages sont immuables après insertion.
--   DELETE inclus : suppression physique admin possible (rare — cascade préférable).
--   UPDATE exclu : aucune modification de message n'est prévue en V1.
GRANT SELECT, INSERT, DELETE
  ON public.chat_messages
  TO service_role;


-- ════════════════════════════════════════════════════════════
-- §11 — SUPABASE REALTIME PUBLICATION
-- ════════════════════════════════════════════════════════════
--
-- Prérequis technique : les tables doivent être dans la publication
-- supabase_realtime pour que les abonnements Realtime côté code fonctionnent.
--
-- La publication NE contrôle PAS l'accès — seule la RLS le fait.
-- Sans policies client RLS, aucun navigateur ne peut s'abonner
-- même si la table est dans la publication.
--
-- Séquence d'activation Realtime :
--   3B-3c1 : publication configurée (cette migration — prérequis)
--   3B-3c2 : policies RLS trader → Realtime activé pour traders authentifiés
--   visiteurs : toujours via API (cookie httpOnly incompatible avec Realtime JS)
--
-- Bloc DO $$ — idempotent :
--   Vérifie pg_publication_tables avant chaque ALTER PUBLICATION.

DO $$
BEGIN

  -- chat_conversations → supabase_realtime
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.chat_conversations;
  END IF;

  -- chat_messages → supabase_realtime
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname    = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.chat_messages;
  END IF;

END;
$$;


-- ════════════════════════════════════════════════════════════
-- §12 — EXTENSION admin_notes.target_type_check
-- ════════════════════════════════════════════════════════════
--
-- Objectif :
--   Permettre les notes admin sur les conversations de chat
--   via le système polymorphique existant (admin_notes).
--     target_type = 'chat_conversation'
--     target_id   = chat_conversations.id (uuid)
--
-- Contrainte AVANT cette migration (Phase 3B-3a) :
--   CHECK (target_type IN ('trader', 'challenge', 'payout', 'support_ticket'))
--
-- Contrainte APRÈS cette migration :
--   CHECK (target_type IN (
--     'trader', 'challenge', 'payout', 'support_ticket', 'chat_conversation'
--   ))
--
-- GARANTIES :
--   - Notes existantes non modifiées (contrainte élargie, jamais restreinte).
--   - DROP + ADD transactionnel (dans ce BEGIN/COMMIT).
--   - IF EXISTS sur DROP : idempotent si la migration est rejouée.
--   - RLS, index et données de admin_notes intacts.
--
-- VÉRIFICATION RECOMMANDÉE avant exécution (requête READ-ONLY séparée) :
--   SELECT target_type, COUNT(*)
--   FROM public.admin_notes
--   GROUP BY target_type ORDER BY target_type;
--   → Confirmer valeurs présentes ⊆ {trader, challenge, payout, support_ticket}

ALTER TABLE public.admin_notes
  DROP CONSTRAINT IF EXISTS admin_notes_target_type_check;

ALTER TABLE public.admin_notes
  ADD CONSTRAINT admin_notes_target_type_check
    CHECK (target_type IN (
      'trader',
      'challenge',
      'payout',
      'support_ticket',
      'chat_conversation'
    ));

COMMIT;
