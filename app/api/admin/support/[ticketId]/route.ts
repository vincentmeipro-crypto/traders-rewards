import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUSES   = ["new", "open", "resolved"] as const;
const VALID_CATEGORIES = ["billing", "challenge", "mt5", "reward", "kyc", "technical", "other"] as const;

type ValidStatus   = typeof VALID_STATUSES[number];
type ValidCategory = typeof VALID_CATEGORIES[number];

// ── GET /api/admin/support/[ticketId] ─────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId } = await params;
  if (!UUID_RE.test(ticketId))
    return NextResponse.json({ error: "ticketId invalide" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

  return NextResponse.json({ ticket: data });
}

// ── PATCH /api/admin/support/[ticketId] ───────────────────────────────────
// Body : { status?, category? }
// - status   : new | open | resolved (résout ou rouvre le ticket)
// - category : billing | challenge | mt5 | reward | kyc | technical | other | null
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ticketId } = await params;
  if (!UUID_RE.test(ticketId))
    return NextResponse.json({ error: "ticketId invalide" }, { status: 400 });

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "JSON invalide" }, { status: 400 }); }

  const updates: Record<string, unknown> = {};

  // ── Validation status ────────────────────────────────────────────────────
  if ("status" in body) {
    const st = body.status as string;
    if (!VALID_STATUSES.includes(st as ValidStatus))
      return NextResponse.json({ error: `status invalide. Valeurs : ${VALID_STATUSES.join(", ")}` }, { status: 400 });

    updates.status = st;

    // resolved_at : rempli à la résolution, remis à NULL à la réouverture
    if (st === "resolved") {
      updates.resolved_at = new Date().toISOString();
    } else {
      updates.resolved_at = null;
    }
  }

  // ── Validation category ─────────────────────────────────────────────────
  if ("category" in body) {
    const cat = body.category;
    if (cat === null || cat === "") {
      updates.category = null;
    } else if (typeof cat === "string" && VALID_CATEGORIES.includes(cat as ValidCategory)) {
      updates.category = cat;
    } else {
      return NextResponse.json({ error: `category invalide. Valeurs : ${VALID_CATEGORIES.join(", ")}` }, { status: 400 });
    }
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Aucune mise à jour fournie" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("support_tickets")
    .update(updates)
    .eq("id", ticketId)
    .select("id, user_id, first_name, last_name, email, subject, status, category, assigned_to, created_at, updated_at, resolved_at")
    .single();

  if (error || !data) {
    console.error("[support] PATCH error:", error?.message ?? "no data");
    return NextResponse.json({ error: "Mise à jour impossible." }, { status: 500 });
  }

  return NextResponse.json({ ticket: data });
}
