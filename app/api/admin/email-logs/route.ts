import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const LIMIT_DEFAULT = 25;
const LIMIT_MAX     = 100;

export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const page   = Math.max(1, parseInt(searchParams.get("page")  || "1",                  10));
  const limit  = Math.min(LIMIT_MAX, Math.max(1, parseInt(searchParams.get("limit") || String(LIMIT_DEFAULT), 10)));
  const type   = searchParams.get("type")   || "all";
  const status = searchParams.get("status") || "all";
  // Sanitise: strip leading/trailing whitespace, cap at 100 chars
  const search = (searchParams.get("search") || "").trim().slice(0, 100);
  const offset = (page - 1) * limit;

  try {
    const admin = createAdminClient();

    const now = new Date();
    const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const d7  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString();

    // ── Summary stats + paginated items in parallel ────────────────
    const [s24hRes, f24hRes, s7dRes, f7dRes, itemsRes] = await Promise.all([
      admin.from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent").gte("created_at", h24),

      admin.from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed").gte("created_at", h24),

      admin.from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent").gte("created_at", d7),

      admin.from("email_logs")
        .select("id", { count: "exact", head: true })
        .eq("status", "failed").gte("created_at", d7),

      // ── Paginated query ──────────────────────────────────────────
      (() => {
        // Select all columns — HTML is never stored, no credential risk
        let q = admin.from("email_logs").select(
          "id,type,to_email,subject,status,error,resend_id,user_id,challenge_id,event_key,created_at",
          { count: "exact" }
        );

        if (status !== "all") q = q.eq("status", status);
        if (type === "tests") {
          q = q.like("type", "test:%");
        } else if (type !== "all") {
          q = q.eq("type", type);
        }

        if (search) {
          // case-insensitive search on to_email and subject
          // Escape % and _ to avoid unintended wildcard expansion
          const safe = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
          q = q.or(`to_email.ilike.%${safe}%,subject.ilike.%${safe}%`);
        }

        return q
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);
      })(),
    ]);

    if (itemsRes.error) {
      console.error("[email-logs] query error:", itemsRes.error.message);
      return NextResponse.json(
        { error: "Impossible de charger le journal des emails." },
        { status: 500 }
      );
    }

    const items      = itemsRes.data ?? [];
    const total      = itemsRes.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      items,
      page,
      limit,
      total,
      totalPages,
      summary: {
        sent_24h:   s24hRes.count  ?? 0,
        failed_24h: f24hRes.count  ?? 0,
        sent_7d:    s7dRes.count   ?? 0,
        failed_7d:  f7dRes.count   ?? 0,
      },
    });

  } catch (err) {
    console.error("[email-logs] unexpected error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Impossible de charger le journal des emails." },
      { status: 500 }
    );
  }
}
