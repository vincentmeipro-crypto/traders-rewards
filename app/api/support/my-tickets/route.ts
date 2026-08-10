import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/support/my-tickets ────────────────────────────────────────────────
//
// Retourne la liste des tickets de support du trader connecté.
//
// Auth : Bearer JWT (Supabase) — user_id résolu server-side.
//        Jamais accepté depuis le body ou query string.
//
// Colonnes exposées : id, subject, category, status, created_at, updated_at, resolved_at
// Colonnes omises   : assigned_to, message (détail uniquement), admin_notes
//
// Limitation V1 : tickets créés sans être connecté (user_id NULL) ne sont pas
//   inclus. Pas de rapprochement automatique par email dans cette phase.

export async function GET(req: NextRequest) {
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

  // ── Requête ───────────────────────────────────────────────────────────────
  // assigned_to, message, admin_notes : intentionnellement exclus
  const { data: tickets, error } = await admin
    .from("support_tickets")
    .select("id, subject, category, status, created_at, updated_at, resolved_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[support/my-tickets] GET error:", error.message);
    return NextResponse.json(
      { error: "Impossible de charger vos demandes." },
      { status: 500 }
    );
  }

  return NextResponse.json({ tickets: tickets ?? [] });
}
