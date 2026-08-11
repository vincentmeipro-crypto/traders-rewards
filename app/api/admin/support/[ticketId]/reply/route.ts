import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── POST /api/admin/support/[ticketId]/reply ──────────────────────────────────
//
// Auth     : checkAdmin (x-admin-key ou Bearer JWT admin)
// Body     : { message: string } — max 4 000 caractères
//
// sender_type='admin' et channel='dashboard' forcés server-side.
// JAMAIS acceptés depuis le frontend.
//
// Ordre des opérations :
//   1. checkAdmin
//   2. Validation ticket + message
//   3. INSERT support_ticket_messages
//   4. UPDATE support_tickets.status = 'open'  ← toujours, quel que soit le statut courant
//   5. Réponse HTTP 201
//
// Si INSERT échoue   → statut NON modifié, 500.
// Si UPDATE échoue   → message déjà inséré, log + 500.
//
// Aucun email envoyé (client ou admin) — dashboard uniquement en V1.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  // ── 1. Auth ───────────────────────────────────────────────────────────────
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId } = await params;
  if (!UUID_RE.test(ticketId))
    return NextResponse.json({ error: "ticketId invalide" }, { status: 400 });

  // ── 2. Validation message ─────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message)
    return NextResponse.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
  if (message.length > 4000)
    return NextResponse.json({ error: "Message trop long (max 4 000 caractères)." }, { status: 400 });

  const admin = createAdminClient();

  // ── 2. Validation ticket (existence) ─────────────────────────────────────
  const { data: ticket, error: ticketErr } = await admin
    .from("support_tickets")
    .select("id")
    .eq("id", ticketId)
    .maybeSingle();

  if (ticketErr) {
    console.error("[admin/support/reply] ticket lookup:", ticketErr.message);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (!ticket)
    return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });

  // ── 3. INSERT message — sender_type et channel forcés server-side ─────────
  const { data: msg, error: insertErr } = await admin
    .from("support_ticket_messages")
    .insert({
      ticket_id:   ticketId,
      sender_type: "admin",      // forcé server-side — JAMAIS depuis le frontend
      content:     message,
      channel:     "dashboard",  // forcé server-side
    })
    .select("id, sender_type, content, channel, created_at")
    .single();

  if (insertErr || !msg) {
    // INSERT échoué → statut NON modifié
    console.error("[admin/support/reply] INSERT:", insertErr?.message);
    return NextResponse.json({ error: "Envoi impossible. Réessayez." }, { status: 500 });
  }

  // ── 4. UPDATE statut → "open" ─────────────────────────────────────────────
  // new + reply admin     → open
  // open + reply admin    → open  (idempotent)
  // resolved + reply admin → open
  // La réponse admin signifie que le ticket est en cours de traitement.
  const { error: updateErr } = await admin
    .from("support_tickets")
    .update({ status: "open" })
    .eq("id", ticketId);

  if (updateErr) {
    // Message inséré avec succès, mais statut non mis à jour.
    console.error("[admin/support/reply] UPDATE status:", updateErr.message);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du statut." }, { status: 500 });
  }

  // ── 5. Réponse ────────────────────────────────────────────────────────────
  return NextResponse.json({ message: msg }, { status: 201 });
}
