import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/chat/my-conversation ─────────────────────────────────────────────
//
// Retourne le résumé de la conversation Live Chat du trader connecté.
// NE CRÉE PAS de conversation si elle n'existe pas (contrairement à /api/chat/start).
//
// Auth : Bearer JWT — user_id résolu server-side.
//
// Retourne :
//   { conversation: ConvSummary | null, unreadCount: number, lastMessage: LastMsg | null }
//
// Sécurité :
//   - visitor_token_hash JAMAIS retourné
//   - service_role uniquement server-side

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!bearer) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: { user }, error: authErr } = await admin.auth.getUser(bearer);
  if (authErr || !user?.id) {
    return NextResponse.json(
      { error: "Session expirée. Reconnectez-vous." },
      { status: 401 }
    );
  }

  // ── Conversation du trader ────────────────────────────────────────────────
  // UNIQUE INDEX garantit au plus une conversation par trader.
  // visitor_token_hash intentionnellement absent du select.
  const { data: conv, error } = await admin
    .from("chat_conversations")
    .select("id, status, last_message_at, created_at, client_last_read_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[chat/my-conversation] GET error:", error.message);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  // Pas de conversation encore — ne pas en créer ici
  if (!conv) {
    return NextResponse.json({ conversation: null, unreadCount: 0, lastMessage: null });
  }

  // ── Dernier message (preview) ──────────────────────────────────────────────
  const { data: lastMsg } = await admin
    .from("chat_messages")
    .select("sender_type, message, created_at")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ── Unread pour le client : messages admin non lus ────────────────────────
  // Non-lu = message admin dont created_at > client_last_read_at
  const { data: adminMsgs } = await admin
    .from("chat_messages")
    .select("created_at")
    .eq("conversation_id", conv.id)
    .eq("sender_type", "admin");

  const clientLastRead = conv.client_last_read_at as string | null;
  const unreadCount = (adminMsgs ?? []).filter(
    (m) => !clientLastRead || m.created_at > clientLastRead
  ).length;

  return NextResponse.json({
    conversation: {
      id:              conv.id,
      status:          conv.status,
      last_message_at: conv.last_message_at,
      created_at:      conv.created_at,
      // visitor_token_hash : JAMAIS
    },
    unreadCount,
    lastMessage: lastMsg
      ? {
          sender_type: lastMsg.sender_type,
          message:     lastMsg.message.slice(0, 200),
          created_at:  lastMsg.created_at,
        }
      : null,
  });
}
