import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── POST /api/admin/chat/[conversationId]/read ─────────────────────────────────
//
// Marque la conversation comme lue par l'admin.
//
// Sécurité :
//   - checkAdmin requis
//   - admin_last_read_at = now() généré SERVER-SIDE — jamais accepté du client
//
// Retourne : { ok: true, admin_last_read_at: string }

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

  // admin_last_read_at = now() généré server-side (jamais depuis le client)
  const now = new Date().toISOString();

  const { error } = await admin
    .from("chat_conversations")
    .update({ admin_last_read_at: now })
    .eq("id", conversationId);

  if (error) {
    console.error("[admin/chat/read] POST error:", error.message, "convId:", conversationId);
    return NextResponse.json({ error: "Impossible de marquer comme lu" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, admin_last_read_at: now });
}
