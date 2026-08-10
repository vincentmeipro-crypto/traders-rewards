import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveChatCaller, getOwnedConversation } from "@/lib/chat-caller";
import { checkRateLimit } from "@/lib/chat-rate-limit";

// ── GET /api/chat/messages?conversationId=<uuid> ──────────────────────────────
//
// Récupère les messages d'une conversation.
//
// Auth : Bearer <token> (trader) ou Cookie tr_chat_v1 (visiteur)
//
// Réponse :
//   { messages: Message[], status: string, unreadCount: number }
//
// Colonnes retournées : id, sender_type, message, created_at
// Colonnes omises : sender_user_id (jamais exposé au client — info interne)
//
// Rate limit : 60 requêtes / minute par conversationId.
//
// ── POST /api/chat/messages ───────────────────────────────────────────────────
//
// Envoie un message dans une conversation.
//
// Corps : { conversationId: string, message: string }
//
// Auth : Bearer <token> (trader) ou Cookie tr_chat_v1 (visiteur)
//
// Réponse :
//   { message: { id, sender_type, message, created_at } }
//
// Actions post-INSERT :
//   - trigger DB update last_message_at + updated_at sur chat_conversations ✓ (trigger)
//   - UPDATE chat_conversations.status = 'waiting_support' (côté API)
//
// Rate limit : 20 messages / minute par conversationId.

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const conversationId = (searchParams.get("conversationId") ?? "").trim();

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
  }

  // Rate limit par conversation (pas par IP — moins discriminant pour le widget)
  if (!checkRateLimit(`chat_read:${conversationId}`, 60, 60_000)) {
    return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
  }

  // Résolution identité caller
  const caller = await resolveChatCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Vérification de propriété — le caller doit posséder cette conversation
  const conv = await getOwnedConversation(admin, conversationId, caller);
  if (!conv) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  // Récupérer les messages en ordre chronologique
  // sender_user_id intentionnellement exclu — information interne
  const { data: messages, error } = await admin
    .from("chat_messages")
    .select("id, sender_type, message, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[chat/messages] GET error:", error.message, "convId:", conversationId);
    return NextResponse.json({ error: "Impossible de charger les messages" }, { status: 500 });
  }

  // Calculer les non-lus côté serveur (stratégie B — client_last_read_at)
  // On récupère client_last_read_at depuis la conversation pour le calcul.
  const { data: convFull } = await admin
    .from("chat_conversations")
    .select("client_last_read_at")
    .eq("id", conversationId)
    .single();

  const clientLastRead = convFull?.client_last_read_at;
  const allMessages    = messages ?? [];

  // Non lus pour le client = messages admin postérieurs à client_last_read_at
  const unreadCount = allMessages.filter((m) => {
    if (m.sender_type !== "admin") return false;
    if (!clientLastRead) return true; // jamais lu → tout est non lu
    return new Date(m.created_at) > new Date(clientLastRead);
  }).length;

  return NextResponse.json({
    messages:     allMessages,
    status:       conv.status,
    unreadCount,
  });
}

// ── POST ──────────────────────────────────────────────────────────────────────

function safeStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: NextRequest) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let conversationId = "", message = "";
  try {
    const body    = await req.json();
    conversationId = safeStr(body?.conversationId, 36);
    message        = safeStr(body?.message,        4000);
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
  }

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId requis" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Le message ne peut pas être vide" }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: "Message trop long (max 4 000 caractères)" }, { status: 400 });
  }

  // Rate limit par conversation
  if (!checkRateLimit(`chat_send:${conversationId}`, 20, 60_000)) {
    return NextResponse.json({ error: "Trop de messages. Attendez un moment." }, { status: 429 });
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

  // Interdire l'envoi dans une conversation fermée
  if (conv.status === "closed") {
    return NextResponse.json(
      { error: "Cette conversation est fermée. Démarrez une nouvelle conversation." },
      { status: 403 },
    );
  }

  // ── INSERT message ─────────────────────────────────────────────────────────
  // sender_type = 'client' (seul type autorisé depuis cette API publique)
  // sender_user_id = user_id si trader connecté, null si visiteur
  const senderUserId =
    caller.type === "trader" ? caller.userId : null;

  const { data: inserted, error: insertErr } = await admin
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_type:     "client",
      sender_user_id:  senderUserId,
      message,
    })
    .select("id, sender_type, message, created_at")
    .single();

  if (insertErr || !inserted) {
    console.error("[chat/messages] POST INSERT error:", insertErr?.message, "convId:", conversationId);
    return NextResponse.json({ error: "Impossible d'envoyer le message. Réessayez." }, { status: 500 });
  }

  // ── Mise à jour statut conversation ───────────────────────────────────────
  // Le trigger DB gère last_message_at + updated_at.
  // Le statut est mis à jour ici car il nécessite une logique métier.
  // → 'waiting_support' : le client a envoyé un message, l'admin doit répondre.
  await admin
    .from("chat_conversations")
    .update({ status: "waiting_support" })
    .eq("id", conversationId)
    .neq("status", "waiting_support"); // évite un UPDATE inutile si déjà à jour

  return NextResponse.json({ message: inserted }, { status: 201 });
}
