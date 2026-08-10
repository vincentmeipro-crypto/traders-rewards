-- ── Phase 3B-3c3 — Live Chat : RLS trader (SELECT Realtime uniquement) ────────
-- Fichier  : supabase/migrations/20260811_live_chat_trader_rls.sql
-- Objectif : permettre aux traders authentifiés de lire leurs propres
--            conversations/messages via Supabase Realtime (anon key côté browser).
--
-- RÈGLE FONDAMENTALE :
--   authenticated = SELECT uniquement (pas d'INSERT / UPDATE / DELETE)
--   Toutes les écritures continuent via les APIs server-side (service_role)
--
-- DÉPENDANCES :
--   20260810_live_chat_foundations.sql (RLS activé, tables + triggers)
--
-- IDEMPOTENCE : DROP POLICY IF EXISTS avant CREATE POLICY
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- §1 — RÉVOCATION des droits d'écriture authenticated (sécurité défensive)
--
-- Note : ces REVOKE sont idempotents — PostgreSQL ne génère pas d'erreur
-- si le privilège n'avait pas été accordé.
-- ══════════════════════════════════════════════════════════════════════════════

REVOKE INSERT, UPDATE, DELETE
  ON public.chat_conversations
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE
  ON public.chat_messages
  FROM authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- §2 — GRANT SELECT authenticated
--
-- Uniquement SELECT : permet à Supabase Realtime d'évaluer les RLS policies
-- et de transmettre les INSERT de chat_messages au browser du trader.
-- ══════════════════════════════════════════════════════════════════════════════

GRANT SELECT ON public.chat_conversations TO authenticated;
GRANT SELECT ON public.chat_messages      TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- §3 — POLICY chat_conversations : trader voit UNIQUEMENT sa conversation
--
-- Condition : user_id = auth.uid()
-- Visiteurs (user_id IS NULL) → aucun résultat (RLS retourne NULL≠uid)
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "trader_select_own_conversations"
  ON public.chat_conversations;

CREATE POLICY "trader_select_own_conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════════
-- §4 — POLICY chat_messages : trader voit UNIQUEMENT ses propres messages
--
-- Condition : EXISTS(conversation appartenant au trader)
-- Sous-requête sur chat_conversations garantit l'isolation inter-traders.
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "trader_select_own_messages"
  ON public.chat_messages;

CREATE POLICY "trader_select_own_messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations c
      WHERE c.id   = chat_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- §5 — UNIQUE INDEX user_id  (V1 : une conversation persistante par trader)
--
-- Contrôle doublons exécuté le 2026-08-10 → 0 lignes → validation accordée.
--
-- Index partiel : exclut les visiteurs (user_id IS NULL)
-- Effet         : une seule ligne par trader dans chat_conversations
-- ══════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS chat_conversations_user_id_uidx
  ON public.chat_conversations(user_id)
  WHERE user_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- FIN DE MIGRATION
-- ══════════════════════════════════════════════════════════════════════════════
