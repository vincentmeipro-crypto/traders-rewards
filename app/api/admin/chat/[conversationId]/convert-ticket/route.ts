import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── POST /api/admin/chat/[conversationId]/convert-ticket ───────────────────────
//
// Convertit une conversation chat en ticket support.
// Idempotent : si support_ticket_id est déjà renseigné, retourne le ticket existant.
//
// Sécurité :
//   - checkAdmin requis
//   - service_role uniquement (côté serveur)
//
// Logique :
//   1. Récupérer la conversation
//   2. Si support_ticket_id déjà renseigné → retourner { ticketId, isNew: false }
//   3. Sinon créer un nouveau support_ticket depuis les données de la conv
//   4. UPDATE chat_conversations.support_ticket_id = nouveauTicket.id
//
// Fallbacks visiteur sans email :
//   email     = conv.email ?? "no-reply@chat.traders-rewards.eu"
//   first_name = conv.first_name ?? "Visiteur"
//   last_name  = conv.last_name  ?? "Anonyme"
//   subject   = "Conversation chat du " + date
//   message   = premier message client (ou message vide)
//
// Retourne : { ticketId: string, isNew: boolean }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  if (!conversationId)
    return NextResponse.json({ error: "conversationId requis" }, { status: 400 });

  const admin = createAdminClient();

  // ── 1. Récupérer la conversation ───────────────────────────────────────────
  const { data: conv, error: convErr } = await admin
    .from("chat_conversations")
    .select("id, user_id, email, first_name, last_name, status, support_ticket_id, created_at")
    .eq("id", conversationId)
    .maybeSingle();

  if (convErr) {
    console.error("[admin/chat/convert-ticket] GET conv error:", convErr.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!conv) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  // ── 2. Idempotence — déjà converti ────────────────────────────────────────
  if (conv.support_ticket_id) {
    return NextResponse.json({ ticketId: conv.support_ticket_id, isNew: false });
  }

  // ── 3. Récupérer tous les messages pour le transcript ─────────────────────
  // On exclut les messages système (informations internes).
  const { data: allMsgs } = await admin
    .from("chat_messages")
    .select("sender_type, message, created_at")
    .eq("conversation_id", conversationId)
    .neq("sender_type", "system")
    .order("created_at", { ascending: true });

  // ── 4. Créer le ticket support ────────────────────────────────────────────
  const convDate = new Date(conv.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // Email : valeur réelle du client si disponible.
  // Fallback "anonymous-chat@traders-rewards.eu" = valeur technique imposée par
  // support_tickets.email NOT NULL — ne représente PAS une identité client réelle.
  const ticketEmail     = conv.email      ?? "anonymous-chat@traders-rewards.eu";
  const ticketFirstName = conv.first_name ?? "Visiteur";
  const ticketLastName  = conv.last_name  ?? "Anonyme";

  // ── 4b. Construire le transcript ──────────────────────────────────────────
  let transcript = `Conversation Live Chat convertie en ticket.\nDate : ${new Date(conv.created_at).toLocaleString("fr-FR")}\n\n`;
  for (const msg of allMsgs ?? []) {
    const label = msg.sender_type === "admin" ? "Support" : "Client";
    const time  = new Date(msg.created_at).toLocaleString("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    transcript += `[${time}] ${label} :\n${msg.message}\n\n`;
  }
  // Tronquer à 8 000 caractères (pas de HTML — texte brut uniquement)
  if (transcript.length > 8000) {
    transcript = transcript.slice(0, 7900) + "\n\n[... transcript tronqué]";
  }

  const { data: ticket, error: ticketErr } = await admin
    .from("support_tickets")
    .insert({
      user_id:    conv.user_id ?? null,
      email:      ticketEmail,
      first_name: ticketFirstName,
      last_name:  ticketLastName,
      subject:    `Conversation chat du ${convDate}`,
      message:    transcript || "(conversation vide)",
      status:     "open",
      category:   null,
    })
    .select("id")
    .single();

  if (ticketErr || !ticket) {
    console.error("[admin/chat/convert-ticket] INSERT ticket error:", ticketErr?.message);
    return NextResponse.json({ error: "Impossible de créer le ticket" }, { status: 500 });
  }

  // ── 5. Lier la conversation au ticket ──────────────────────────────────────
  const { error: linkErr } = await admin
    .from("chat_conversations")
    .update({ support_ticket_id: ticket.id })
    .eq("id", conversationId);

  if (linkErr) {
    // Le ticket a été créé mais le lien a échoué — log + retourner quand même
    console.error("[admin/chat/convert-ticket] UPDATE link error:", linkErr.message);
  }

  return NextResponse.json({ ticketId: ticket.id, isNew: true }, { status: 201 });
}
