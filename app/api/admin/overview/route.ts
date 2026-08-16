import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/admin/overview ───────────────────────────────────────────────────
// Agrège en un seul appel toutes les données du cockpit global.
// Promise.all — aucune requête bloquante.
// Colonnes sélectionnées explicitement : aucun secret sensible exposé.

export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin  = createAdminClient();
  const now    = new Date();
  const h24    = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // ── 14 requêtes en parallèle ─────────────────────────────────────────────
  const [
    activeChallengesRes,   // risk watch + count
    statusCountsRes,       // KPI : certified / failed / passed counts
    caMonthRes,            // CA mois
    pendingPayoutsRes,     // rewards en attente
    recentChallengesRes,   // activité récente (achats + fails)
    recentPhase2Res,       // activité récente (passages phase)
    recentPayoutsRes,      // activité récente (rewards)
    kycPendingRes,         // KPI + À traiter
    supportNewRes,         // KPI + À traiter
    supportOpenRes,        // résumé support
    emailFailed24hRes,     // KPI + À traiter
    emailSent24hRes,       // résumé email
    tradersCountRes,       // KPI traders
    promoActiveRes,        // mini marketing
  ] = await Promise.all([

    // 1. Challenges actifs — colonnes drawdown uniquement (risk watch)
    admin.from("challenges")
      .select("id, user_email, account_size, phase, model, status, balance, start_balance, total_drawdown_limit, daily_drawdown_limit, daily_start_balance, daily_low_equity")
      .eq("status", "active"),

    // 2. Counts par statut (funded/failed/passed/active)
    admin.from("challenges")
      .select("status")
      .in("status", ["funded", "failed", "passed", "active"]),

    // 3. CA du mois (achats réels : phase1 + instant)
    admin.from("challenges")
      .select("amount_paid")
      .or("phase.eq.phase1,model.eq.instant")
      .gte("created_at", mStart),

    // 4. Rewards en attente
    admin.from("payouts")
      .select("id, amount")
      .eq("status", "pending"),

    // 5. Challenges récents (achats + fails — pour timeline)
    admin.from("challenges")
      .select("id, user_email, account_size, phase, model, status, breach_at, created_at")
      .or("phase.eq.phase1,model.eq.instant,status.eq.failed")
      .order("created_at", { ascending: false })
      .limit(10),

    // 6. Phase 2 récents (passage phase 1 → 2)
    admin.from("challenges")
      .select("id, user_email, account_size, created_at")
      .eq("phase", "phase2")
      .neq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(5),

    // 7. Rewards récents
    admin.from("payouts")
      .select("id, user_email, amount, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),

    // 8. KYC en attente (profiles.kyc_status)
    admin.from("profiles")
      .select("user_id", { count: "exact", head: true })
      .eq("kyc_status", "pending"),

    // 9. Support tickets nouveaux
    admin.from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),

    // 10. Support tickets ouverts
    admin.from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),

    // 11. Emails échoués 24h
    admin.from("email_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", h24),

    // 12. Emails envoyés 24h
    admin.from("email_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", h24),

    // 13. Traders (count profiles)
    admin.from("profiles")
      .select("user_id", { count: "exact", head: true }),

    // 14. Promos actives — 3 colonnes pour filtrer max_uses côté serveur
    // (PostgREST ne supporte pas la comparaison de deux colonnes en filtre natif)
    // Le nombre de promos actives est toujours faible (< 100) — acceptable.
    admin.from("promo_codes")
      .select("id, max_uses, used_count")
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${now.toISOString()}`)
      .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`),
  ]);

  // ── Calculs côté serveur ─────────────────────────────────────────────────

  const activeChallenges = activeChallengesRes.data ?? [];
  const allChallengeStatuses = statusCountsRes.data ?? [];

  // Counts par statut
  const statusCounts = allChallengeStatuses.reduce(
    (acc, c) => ({ ...acc, [c.status]: (acc[c.status as keyof typeof acc] ?? 0) + 1 }),
    { active: 0, funded: 0, failed: 0, passed: 0 } as Record<string, number>
  );

  // Détail phase des actifs
  const is1Step = (m: string) => m?.toLowerCase().replace(/[\s-]/g, "").includes("1step");
  const activeBreakdown = activeChallenges.reduce(
    (acc, c) => {
      if (is1Step(c.model)) acc.oneStep++;
      else if (c.phase === "phase2") acc.phase2++;
      else acc.phase1++;
      return acc;
    },
    { phase1: 0, oneStep: 0, phase2: 0 }
  );

  // CA du mois
  const caMonth = (caMonthRes.data ?? []).reduce((s, c) => s + (c.amount_paid ?? 0), 0);

  // Rewards en attente
  const pendingPayouts   = pendingPayoutsRes.data ?? [];
  const pendingCount     = pendingPayouts.length;
  const pendingAmt       = pendingPayouts.reduce((s, p) => s + (p.amount ?? 0), 0);

  // ── Risk Watch : top 5 comptes les plus proches de leur limite ───────────
  const riskWatch = activeChallenges
    .filter(c => c.start_balance && c.balance)
    .map(c => {
      const totalDD       = Math.max(0, (c.start_balance - c.balance) / c.start_balance * 100);
      const totalLimit    = c.total_drawdown_limit ?? 10;
      const totalConsumed = totalLimit > 0 ? totalDD / totalLimit * 100 : 0;

      const dS    = c.daily_start_balance as number | null;
      const dL    = c.daily_low_equity    as number | null;

      let dailyDD = 0; let dailyConsumed = 0;
      const hasDailyData = !!(dS && dS > 0);
      if (hasDailyData && dS) {
        const low = dL !== null && dL !== undefined ? Math.min(dL, c.balance) : c.balance;
        dailyDD       = Math.max(0, (dS - low) / dS * 100);
        const dLimit  = c.daily_drawdown_limit ?? 5;
        dailyConsumed = dLimit > 0 ? dailyDD / dLimit * 100 : 0;
      }
      return {
        id:             c.id,
        user_email:     c.user_email,
        account_size:   c.account_size,
        phase:          c.phase,
        model:          c.model,
        totalDD:        Math.round(totalDD * 10) / 10,
        totalLimit:     totalLimit,
        totalConsumed:  Math.round(totalConsumed),
        dailyDD:        Math.round(dailyDD * 10) / 10,
        dailyLimit:     c.daily_drawdown_limit ?? 5,
        dailyConsumed:  Math.round(dailyConsumed),
        hasDailyData,
      };
    })
    .filter(x => x.totalConsumed >= 40 || x.dailyConsumed >= 40)
    .sort((a, b) => Math.max(b.totalConsumed, b.dailyConsumed) - Math.max(a.totalConsumed, a.dailyConsumed))
    .slice(0, 5);

  // ── Activité récente : merge challenges + phase2 + payouts → top 8 ───────
  type Event = { at: string; type: string; label: string; sub: string; color: string };
  const events: Event[] = [];

  for (const c of recentChallengesRes.data ?? []) {
    if (c.phase === "phase1" || c.model === "instant") {
      events.push({ at: c.created_at, type: "purchase", label: "Nouveau challenge", sub: `${c.account_size} · ${c.user_email}`, color: "#3b82f6" });
    } else if (c.status === "failed" && c.breach_at) {
      events.push({ at: c.breach_at as string, type: "failed", label: "Challenge échoué", sub: `${c.account_size} · ${c.user_email}`, color: "#ef4444" });
    }
  }
  for (const c of recentPhase2Res.data ?? []) {
    events.push({ at: c.created_at, type: "phase2", label: "Phase 1 réussie", sub: `${c.account_size} · ${c.user_email}`, color: "#22c55e" });
  }
  for (const p of recentPayoutsRes.data ?? []) {
    events.push({
      at: p.created_at,
      type: "payout",
      label: p.status === "paid" ? "Reward validé" : "Reward demandé",
      sub: `€${(p.amount ?? 0).toLocaleString("fr-FR")} · ${p.user_email}`,
      color: p.status === "paid" ? "#22c55e" : "#f59e0b",
    });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const recentEvents = events.slice(0, 8);

  // ── Promos actives — filtre max_uses côté serveur ───────────────────────
  // active=true + starts_at OK + expires_at OK déjà filtrés par la requête.
  // Dernier critère : max_uses IS NULL (illimitées) OU used_count < max_uses.
  const promoActive = (promoActiveRes.data ?? []).filter(p => {
    if (p.max_uses === null || p.max_uses === undefined) return true;
    return (p.used_count ?? 0) < p.max_uses;
  }).length;

  // ── Réponse ──────────────────────────────────────────────────────────────
  return NextResponse.json({
    kpis: {
      activeTotal:  activeChallenges.length,
      breakdown:    activeBreakdown,
      certified:    statusCounts.funded  ?? 0,
      failed:       statusCounts.failed  ?? 0,
      passed:       statusCounts.passed  ?? 0,
      traders:      tradersCountRes.count ?? 0,
      pendingPayoutsCount: pendingCount,
      pendingPayoutsAmt:   pendingAmt,
      caMonth,
      kycPending:    kycPendingRes.count    ?? 0,
      supportNew:    supportNewRes.count    ?? 0,
      supportOpen:   supportOpenRes.count   ?? 0,
      emailFailed24h: emailFailed24hRes.count ?? 0,
      emailSent24h:   emailSent24hRes.count   ?? 0,
      promoActive,
    },
    riskWatch,
    recentEvents,
  });
}
