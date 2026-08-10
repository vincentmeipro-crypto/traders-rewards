import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveChatCaller, getOwnedConversation } from "@/lib/chat-caller";
import { checkRateLimit } from "@/lib/chat-rate-limit";

// ── PUT /api/chat/read ────────────────────────────────────────────────────────
//
// Marque la conversation comme lue côté client.
// Met à jour chat_conversations.client_last_read_at = now().
//
// Corps : { conversationId: string }
//
// Auth : Bearer <token> (trader) ou Cookie tr_chat_v1 (visiteur)
//
// Réponse : { ok: true }
//
// Unread strategy B :
//   Après cet appel, les "non lus client" = 0 pour les messages existants.
//   Les prochains messages admin seront de nouveau non lus.
//
// Rate limit : 30 appels / minute par conversationId.
//   (Le widget peut appeler read() à chaque ouverture de la fenêtre chat)

export async function PUT(req: NextRequest) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let conversationId = "";
  try {
    const body     = await req.json();
    conversationId = typeof body?.conversationId === "string"
      ? body.conversationId.trim().slice(0, 36)
      : "";
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
  }

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
  }

  // Rate limit par conversation
  if (!checkRateLimit(`chat_mark:${conversationId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  // Résolution identité caller
  const caller = await resolveChatCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Vérification de propriété
  const conv = await getOwnedConversation(admin, conversationId, caller);
  if (!conv) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  // ── Mise à jour client_last_read_at ────────────────────────────────────────
  // Stratégie B : un seul UPDATE par "ouverture", pas par message lu.
  // Après cet appel : unreadCount = 0 pour tous les messages antérieurs.
  const { error } = await admin
    .from("chat_conversations")
    .update({ client_last_read_at: new Date().toISOString() })
    .eq("id", conversationId);

  if (error) {
    console.error("[chat/read] PUT error:", error.message, "convId:", conversationId);
    return NextResponse.json({ error: "Impossible de mettre à jour" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
