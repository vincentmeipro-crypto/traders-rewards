import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/support/my-tickets/[id]/messages ─────────────────────────────────
// ── POST /api/support/my-tickets/[id]/messages ───────────────────────────────
//
// Auth     : Bearer JWT uniquement — user_id résolu server-side.
// Ownership: ticket.user_id = authenticated user (vérifié au niveau DB).
//
// GET  → retourne le fil de messages, ordre chronologique.
// POST → insère un message client.
//
// Colonnes EXPOSÉES   : id, sender_type, content, channel, created_at
// Colonnes JAMAIS     : provider_message_id, reply_token, assigned_to, admin_notes
// Colonnes FORCÉES    : sender_type='client', channel='dashboard' (POST)

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Helper auth ───────────────────────────────────────────────────────────────

async function resolveUser(
  req: NextRequest,
): Promise<{ userId: string } | { error: string; status: number }> {
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!bearer) return { error: "Authentication required", status: 401 };

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(bearer);
  if (error || !user?.id)
    return { error: "Session expirée. Reconnectez-vous.", status: 401 };

  return { userId: user.id };
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await resolveUser(req);
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  const admin = createAdminClient();

  // Ownership enforced au niveau DB — ticket doit appartenir à cet user
  const { data: ticket, error: ticketErr } = await admin
    .from("support_tickets")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (ticketErr) {
    console.error("[support/my-tickets/messages] GET ticket:", ticketErr.message);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (!ticket)
    // 404 générique — ne révèle pas si le ticket appartient à un autre user
    return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });

  // Messages — jamais provider_message_id, reply_token
  const { data: messages, error: msgErr } = await admin
    .from("support_ticket_messages")
    .select("id, sender_type, content, channel, created_at")
    .eq("ticket_id", id)
    .order("created_at", { ascending: true });

  if (msgErr) {
    console.error("[support/my-tickets/messages] GET messages:", msgErr.message);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  return NextResponse.json({ messages: messages ?? [] });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await resolveUser(req);
  if ("error" in auth)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

  // Parse body
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Payload JSON invalide." }, { status: 400 }); }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message)
    return NextResponse.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
  if (message.length > 4000)
    return NextResponse.json({ error: "Message trop long (max 4 000 caractères)." }, { status: 400 });

  const admin = createAdminClient();

  // Ownership enforced au niveau DB
  const { data: ticket, error: ticketErr } = await admin
    .from("support_tickets")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (ticketErr) {
    console.error("[support/my-tickets/messages] POST ticket:", ticketErr.message);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (!ticket)
    return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });

  // Réouverture automatique si resolved ou new
  if (ticket.status === "resolved" || ticket.status === "new") {
    await admin
      .from("support_tickets")
      .update({ status: "open" })
      .eq("id", id);
  }

  // Insertion — sender_type et channel forcés server-side, JAMAIS depuis le frontend
  const { data: msg, error: insertErr } = await admin
    .from("support_ticket_messages")
    .insert({
      ticket_id:   id,
      sender_type: "client",     // forcé server-side
      content:     message,
      channel:     "dashboard",  // forcé server-side
    })
    .select("id, sender_type, content, channel, created_at")
    .single();

  if (insertErr || !msg) {
    console.error("[support/my-tickets/messages] INSERT:", insertErr?.message);
    return NextResponse.json({ error: "Envoi impossible. Réessayez." }, { status: 500 });
  }

  return NextResponse.json({ message: msg }, { status: 201 });
}
