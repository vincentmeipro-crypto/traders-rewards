/**
 * TRADERS REWARDS — Live Chat — Résolution d'identité du caller
 * Phase 3B-3c2
 *
 * Identifie l'appelant d'une API Route de chat client :
 *  - Trader connecté  : JWT Bearer → auth.getUser() → { type: "trader", userId }
 *  - Visiteur anonyme : Cookie tr_chat_v1 → SHA-256 → { type: "visitor", tokenHash }
 *  - Inconnu          : null (aucun accès)
 *
 * Règle de priorité :
 *   Bearer JWT valide > Cookie visiteur
 *   Si les deux sont présents, le trader est prioritaire.
 *   La logique de merge visiteur→trader est gérée dans POST /api/chat/start.
 *
 * SÉCURITÉ :
 *  - user_id résolu SERVER-SIDE depuis le JWT — jamais depuis le body.
 *  - visitor_token_hash calculé server-side — jamais accepté depuis le client.
 *  - Ne jamais retourner tokenHash ou userId dans les réponses JSON publiques.
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashVisitorToken, readVisitorToken } from "@/lib/chat-token";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ChatCaller =
  | { type: "trader";  userId: string }
  | { type: "visitor"; tokenHash: string }
  | null;

// ── Résolution ────────────────────────────────────────────────────────────────

/**
 * Résout l'identité du caller depuis la requête entrante.
 *
 * Appeler en début de chaque route API chat client.
 * Retourne null si aucune identité valide — retourner 401 dans ce cas.
 *
 * @param req Requête Next.js entrante
 */
export async function resolveChatCaller(req: NextRequest): Promise<ChatCaller> {
  // ── 1. Trader connecté — Bearer JWT ───────────────────────────────────────
  // Même pattern que app/api/profile/route.ts et app/api/payouts/route.ts
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (bearer) {
    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(bearer);
    if (!error && user?.id) {
      return { type: "trader", userId: user.id };
    }
    // Bearer présent mais invalide → pas de fallback cookie (sécurité)
    // Un token expiré ou malformé ne doit pas tomber silencieusement sur visiteur.
    return null;
  }

  // ── 2. Visiteur anonyme — Cookie httpOnly ──────────────────────────────────
  // Le token brut est lu depuis le cookie.
  // Le hash SHA-256 est calculé server-side — jamais accepté depuis le client.
  const visitorToken = readVisitorToken(req.headers.get("cookie"));
  if (visitorToken) {
    return { type: "visitor", tokenHash: hashVisitorToken(visitorToken) };
  }

  // ── 3. Inconnu ────────────────────────────────────────────────────────────
  return null;
}

// ── Vérification de propriété ─────────────────────────────────────────────────

export interface ConvRow {
  id:     string;
  status: string;
}

/**
 * Vérifie que le caller est propriétaire de la conversation demandée.
 *
 * Sécurité : la condition de propriété est évaluée côté DB (Supabase).
 * Un caller ne peut jamais accéder à la conversation d'un autre.
 *
 * @param admin          Client Supabase service_role (déjà instancié)
 * @param conversationId UUID de la conversation demandée
 * @param caller         Identité résolue par resolveChatCaller()
 *
 * @returns ConvRow si le caller est propriétaire, null sinon (→ 404)
 */
export async function getOwnedConversation(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  caller: ChatCaller,
): Promise<ConvRow | null> {
  if (!caller) return null;

  // UUID basique — évite les injections et les requêtes inutiles
  if (!/^[0-9a-f-]{36}$/.test(conversationId)) return null;

  let q = admin
    .from("chat_conversations")
    .select("id, status")
    .eq("id", conversationId);

  if (caller.type === "trader") {
    q = q.eq("user_id", caller.userId);
  } else {
    q = q.eq("visitor_token_hash", caller.tokenHash);
  }

  const { data } = await q.maybeSingle();
  return (data as ConvRow | null) ?? null;
}
