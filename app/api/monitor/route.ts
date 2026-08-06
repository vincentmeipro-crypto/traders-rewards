/**
 * API MONITOR — Tableau de bord sans connexion (lecture seule)
 * GET /api/monitor?key=MONITOR_KEY
 *
 * Protégé par token secret (pas de Supabase auth).
 * Retourne les stats de la plateforme — aucune donnée personnelle (PII).
 * Usage : donner l'URL à Claude / ChatGPT pour suivi de plateforme.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Token secret — à mettre dans Vercel env vars : MONITOR_KEY=votre_token
const MONITOR_KEY = process.env.MONITOR_KEY || "tr2026-monitor-k9x";

export async function GET(req: NextRequest) {
  // ── Auth par token secret ──────────────────────────────────────
  const key =
    req.headers.get("x-monitor-key") ||
    new URL(req.url).searchParams.get("key") ||
    "";

  if (key !== MONITOR_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  try {
    // ── Challenges ─────────────────────────────────────────────────
    const { data: challenges, error: cErr } = await admin
      .from("challenges")
      .select("id, status, phase, model, balance, start_balance, created_at");

    if (cErr) throw new Error(`challenges: ${cErr.message}`);

    const byStatus: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    let today = 0;
    let thisWeek = 0;
    let totalBalance = 0;

    for (const c of challenges ?? []) {
      byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
      byModel[c.model ?? "unknown"] = (byModel[c.model ?? "unknown"] ?? 0) + 1;
      const created = new Date(c.created_at);
      if (created >= todayStart) today++;
      if (created >= weekStart) thisWeek++;
      totalBalance += Number(c.start_balance ?? 0);
    }

    const active = (byStatus["active"] ?? 0) + (byStatus["phase2"] ?? 0);
    const funded = byStatus["funded"] ?? 0;
    const passed = byStatus["passed"] ?? 0;
    const failed = byStatus["failed"] ?? 0;
    const breached = byStatus["breached"] ?? 0;
    const pending = byStatus["pending"] ?? 0;

    // Derniers 10 challenges (anonymisés — no PII)
    const recent = (challenges ?? [])
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        model: c.model,
        phase: c.phase,
        status: c.status,
        balance: c.balance,
        start_balance: c.start_balance,
        created_at: c.created_at,
      }));


    // ── Payouts ────────────────────────────────────────────────────
    const { data: payouts, error: pErr } = await admin
      .from("payouts")
      .select("id, status, amount, created_at");

    const payoutByStatus: Record<string, number> = {};
    let payoutTotalApproved = 0;
    for (const p of payouts ?? []) {
      payoutByStatus[p.status] = (payoutByStatus[p.status] ?? 0) + 1;
      if (p.status === "approved" || p.status === "paid") {
        payoutTotalApproved += Number(p.amount ?? 0);
      }
    }

    // ── Profiles ───────────────────────────────────────────────────
    const { count: traderCount } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // ── Settings sanity ────────────────────────────────────────────
    const { data: settingsRows } = await admin
      .from("settings")
      .select("key, value, updated_at")
      .in("key", [
        "branding.brand_name",
        "branding.site_url",
        "payouts.profit_split_1step",
        "payouts.profit_split_2step",
        "challenges.profit_target",
        "general.platform_version",
      ]);

    const settings: Record<string, unknown> = {};
    for (const row of settingsRows ?? []) {
      settings[row.key] = row.value;
    }

    // ── Response ───────────────────────────────────────────────────
    return NextResponse.json(
      {
        timestamp: now.toISOString(),
        platform: {
          brand: settings["branding.brand_name"] ?? "Traders Rewards",
          url: settings["branding.site_url"] ?? "https://www.traders-rewards.eu",
          version: settings["general.platform_version"] ?? "2.0",
        },
        traders: {
          total: traderCount ?? 0,
        },
        challenges: {
          total: challenges?.length ?? 0,
          today,
          this_week: thisWeek,
          total_capital: totalBalance,
          by_status: { active, passed, funded, failed, breached, pending },
          by_model: byModel,
          recent,
        },
        payouts: {
          total: payouts?.length ?? 0,
          by_status: payoutByStatus,
          total_approved_eur: payoutTotalApproved,
        },
        settings_snapshot: {
          profit_split_1step: settings["payouts.profit_split_1step"],
          profit_split_2step: settings["payouts.profit_split_2step"],
          profit_target: settings["challenges.profit_target"],
        },
        health: {
          supabase: "ok",
          settings_rows: settingsRows?.length ?? 0,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Internal error", detail: msg, timestamp: now.toISOString() },
      { status: 500 }
    );
  }
}
