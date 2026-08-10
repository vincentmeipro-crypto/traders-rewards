import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const LIMIT_DEFAULT = 25;
const LIMIT_MAX     = 100;

// ── GET /api/admin/support ─────────────────────────────────────────────────
// Paramètres : status (all|new|open|resolved), category, search, page, limit
// Retourne   : { tickets, total, totalNew, page, totalPages }
export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status")   || "all";
  const category = searchParams.get("category") || "";
  const search   = (searchParams.get("search")  || "").trim().slice(0, 100);
  const page     = Math.max(1, parseInt(searchParams.get("page")  || "1",  10));
  const limit    = Math.min(LIMIT_MAX, Math.max(1, parseInt(searchParams.get("limit") || String(LIMIT_DEFAULT), 10)));
  const offset   = (page - 1) * limit;

  const admin = createAdminClient();

  // ── Requête paginée ──────────────────────────────────────────────────────
  let q = admin
    .from("support_tickets")
    .select(
      "id, user_id, first_name, last_name, email, subject, status, category, assigned_to, created_at, updated_at, resolved_at",
      { count: "exact" }
    );

  if (status !== "all") q = q.eq("status", status);
  if (category) q = q.eq("category", category);
  if (search) {
    const safe = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.or(`email.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,subject.ilike.%${safe}%`);
  }

  const ticketsRes = await q
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (ticketsRes.error) {
    console.error("[support] GET list error:", ticketsRes.error.message);
    return NextResponse.json({ error: "Impossible de charger les tickets." }, { status: 500 });
  }

  // ── Compte des tickets 'new' (pour badge sidebar) ────────────────────────
  const { count: totalNew } = await admin
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  const total      = ticketsRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return NextResponse.json({
    tickets:    ticketsRes.data ?? [],
    total,
    totalPages,
    page,
    totalNew:   totalNew ?? 0,
  });
}
