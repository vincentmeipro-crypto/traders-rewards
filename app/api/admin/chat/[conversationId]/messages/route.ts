import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── POST /api/admin/chat/[conversationId]/messages ─────────────────────────────
//
// Envoie un message admin dans une conversation.
//
// Corps : { message: string }
//
// Sécurité :
//   - checkAdmin requis
//   - sender_type = "admin" FORCÉ server-side — jamais accepté du client
//   - sender_user_id = admin userId (résolu server-side)
//   - Status mis à "waiting_client" après l'envoi (le client doit répondre)
//
// Retourne : { message: { id, sender_type, message, created_at } }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await checkAdmin(req);
  if (!auth.ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId } = await params;
  if (!conversationId)
    return NextResponse.json({ error: "conversationId requis" }, { status: 400 });

  // ── Parse body ─────────────────────────────────────────────────────────────
  let message = "";
  try {
    const body = await req.json();
    if (typeof body?.message === "string") {
      message = body.message.trim().slice(0, 4000);
    }
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Le message ne peut pas être vide" }, { status: 422 });
  }

  const admin = createAdminClient();

  // ── Vérification conversation existante ────────────────────────────────────
  const { data: conv } = await admin
    .from("chat_conversations")
    .select("id, status")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
  }

  // ── INSERT message ─────────────────────────────────────────────────────────
  // sender_type = "admin" FORCÉ — ne jamais accepter une valeur du client
  // sender_user_id = userId résolu par checkAdmin (null pour admin-static)
  const senderUserId = auth.userId !== "admin-static" ? auth.userId : null;

  const { data: inserted, error: insertErr } = await admin
    .from("chat_messages")
    .insert({
      conversation_id: conversationId,
      sender_type:     "admin",        // FORCÉ server-side
      sender_user_id:  senderUserId,
      message,
    })
    .select("id, sender_type, message, created_at")
    .single();

  if (insertErr || !inserted) {
    console.error("[admin/chat/messages] POST error:", insertErr?.message, "convId:", conversationId);
    return NextResponse.json({ error: "Impossible d'envoyer le message" }, { status: 500 });
  }

  // ── Mise à jour statut → waiting_client ────────────────────────────────────
  // Après réponse admin, le client doit répondre.
  await admin
    .from("chat_conversations")
    .update({ status: "waiting_client" })
    .eq("id", conversationId)
    .neq("status", "closed"); // ne pas rouvrir une conv fermée manuellement

  return NextResponse.json({ message: inserted }, { status: 201 });
}
