import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/admin/support/[ticketId]/messages ────────────────────────────────
//
// Auth     : checkAdmin (x-admin-key ou Bearer JWT admin)
// Retourne : fil de messages du ticket, ordre chronologique.
//
// Colonnes EXPOSÉES : id, sender_type, content, channel, created_at
// Colonnes JAMAIS   : provider_message_id, reply_token

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId } = await params;
  if (!UUID_RE.test(ticketId))
    return NextResponse.json({ error: "ticketId invalide" }, { status: 400 });

  const admin = createAdminClient();
  const { data: messages, error } = await admin
    .from("support_ticket_messages")
    .select("id, sender_type, content, channel, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[admin/support/messages] GET:", error.message);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  return NextResponse.json({ messages: messages ?? [] });
}
