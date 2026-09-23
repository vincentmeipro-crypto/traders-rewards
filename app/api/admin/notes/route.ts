import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/admin/notes?target_type=trader&target_id=<uuid> ────────────────
export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const target_type = searchParams.get("target_type");
  const target_id   = searchParams.get("target_id");

  if (!target_type || !target_id)
    return NextResponse.json({ error: "target_type et target_id requis" }, { status: 400 });

  if (!["trader", "challenge", "payout", "support_ticket", "chat_conversation"].includes(target_type))
    return NextResponse.json({ error: "target_type invalide" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_notes")
    .select("id, content, author_email, created_at")
    .eq("target_type", target_type)
    .eq("target_id", target_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[notes] GET error:", error.message);
    return NextResponse.json({ error: "Impossible de charger les notes." }, { status: 500 });
  }

  return NextResponse.json({ notes: data ?? [] });
}

// ── POST /api/admin/notes ────────────────────────────────────────────────────
// body: { target_type, target_id, content }
// author_email : JAMAIS accepté depuis le frontend — résolu côté serveur.
export async function POST(req: NextRequest) {
  const auth = await checkAdmin(req);
  if (!auth.ok || !auth.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const { target_type, target_id, content } = body as Record<string, string>;

  if (!target_type || !target_id || !content)
    return NextResponse.json({ error: "target_type, target_id et content requis" }, { status: 400 });

  if (!["trader", "challenge", "payout", "support_ticket", "chat_conversation"].includes(target_type))
    return NextResponse.json({ error: "target_type invalide" }, { status: 400 });

  const trimmed = (content ?? "").trim();
  if (!trimmed || trimmed.length > 4000)
    return NextResponse.json({ error: "Contenu vide ou trop long (max 4 000 car.)" }, { status: 400 });

  const author_email = auth.email;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_notes")
    .insert({ target_type, target_id, content: trimmed, author_email })
    .select("id, content, author_email, created_at")
    .single();

  if (error) {
    console.error("[notes] POST error:", error.message);
    return NextResponse.json({ error: "Impossible d'enregistrer la note." }, { status: 500 });
  }

  return NextResponse.json({ note: data }, { status: 201 });
}

// ── DELETE /api/admin/notes?id=<uuid> ────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("admin_notes").delete().eq("id", id);

  if (error) {
    console.error("[notes] DELETE error:", error.message);
    return NextResponse.json({ error: "Impossible de supprimer la note." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
