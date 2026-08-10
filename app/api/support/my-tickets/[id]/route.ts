import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/support/my-tickets/[id] ──────────────────────────────────────────
//
// Retourne le détail d'un ticket support avec son message complet.
//
// Auth    : Bearer JWT — user_id résolu server-side.
// Ownership : ticket.user_id = authenticated user (vérifié au niveau DB).
//
// Colonnes exposées : id, subject, category, status, message,
//                     created_at, updated_at, resolved_at
// Colonnes JAMAIS exposées : assigned_to, admin_notes, autres traders

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  // ── Validation ────────────────────────────────────────────────────────────
  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  // ── Requête avec ownership enforced au niveau DB ───────────────────────────
  // La condition .eq("user_id", user.id) garantit qu'un trader ne peut
  // jamais accéder aux tickets d'un autre, même en connaissant l'UUID.
  const { data: ticket, error } = await admin
    .from("support_tickets")
    .select(
      // assigned_to, admin_notes : intentionnellement exclus
      "id, subject, category, status, message, created_at, updated_at, resolved_at"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[support/my-tickets/detail] GET error:", error.message);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (!ticket) {
    // 404 générique — ne révèle pas l'existence du ticket à un tiers
    return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
  }

  return NextResponse.json({ ticket });
}
