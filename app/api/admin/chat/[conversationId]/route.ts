import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/admin/chat/[conversationId] ───────────────────────────────────────
//
// Détail d'une conversation : header + messages en ordre chronologique.
//
// Sécurité :
//   - visitor_token_hash JAMAIS retourné
//   - checkAdmin requis
//
// Retourne :
//   { conversation: ConvDetail, messages: Message[] }
//
// ── PATCH /api/admin/chat/[conversationId] ─────────────────────────────────────
//
// Mise à jour du statut de la conversation.
//
// Corps : { status: "waiting_support" | "open" | "waiting_client" | "closed" }
//
// Retourne : { conversation: ConvDetail }

const VALID_STATUSES = ["waiting_support", "open", "waiting_client", "closed"] as const;
type ChatStatus = typeof VALID_STATUSES[number];

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  if (!conversationId)
    return NextResponse.json({ error: "conversationId requis" }, { status: 400 });

  const admin = createAdminClient();

  // ── Conversation ──────────────────────────────────────────────────────────
  const { data: conv, error: convErr } = await admin
    .from("chat_conversations")
    .select(
      // visitor_token_hash intentionnellement absent
      "id, user_id, email, first_name, last_name, status, last_message_at, created_at, updated_at, support_ticket_id, admin_last_read_at, client_last_read_at"
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (convErr) {
    console.error("[admin/chat/detail] GET conv error:", convErr.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!conv) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  // ── Messages (ASC — ordre chronologique) ─────────────────────────────────
  const { data: messages, error: msgsErr } = await admin
    .from("chat_messages")
    .select("id, sender_type, message, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (msgsErr) {
    console.error("[admin/chat/detail] GET msgs error:", msgsErr.message);
    return NextResponse.json({ error: "Erreur lors du chargement des messages" }, { status: 500 });
  }

  return NextResponse.json({
    conversation: conv,
    messages:     messages ?? [],
  });
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  if (!conversationId)
    return NextResponse.json({ error: "conversationId requis" }, { status: 400 });

  // ── Parse body ─────────────────────────────────────────────────────────────
  let status: ChatStatus | undefined;
  try {
    const body = await req.json();
    if (body?.status && VALID_STATUSES.includes(body.status as ChatStatus)) {
      status = body.status as ChatStatus;
    }
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json(
      { error: `Statut invalide. Valeurs acceptées : ${VALID_STATUSES.join(", ")}` },
      { status: 422 }
    );
  }

  const admin = createAdminClient();

  const { data: updated, error: updateErr } = await admin
    .from("chat_conversations")
    .update({ status })
    .eq("id", conversationId)
    .select(
      "id, user_id, email, first_name, last_name, status, last_message_at, created_at, updated_at, support_ticket_id, admin_last_read_at"
    )
    .maybeSingle();

  if (updateErr) {
    console.error("[admin/chat/detail] PATCH error:", updateErr.message);
    return NextResponse.json({ error: "Impossible de mettre à jour le statut" }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  return NextResponse.json({ conversation: updated });
}
