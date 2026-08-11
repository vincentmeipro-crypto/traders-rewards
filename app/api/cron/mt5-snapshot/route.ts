import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMT5Account, getMT5Positions, getMT5History, changeMT5Group, disableMT5Account, updateMT5AccountName } from "@/lib/mt5";
import { sendFailedEmail } from "@/lib/mailer";
import { syncTradeRiskSnapshots } from "@/lib/trade-risk-store";
import { summarizeTradeHistory } from "@/lib/trade-performance";

// Vercel Cron — toutes les minutes
// Double vérification : equity temps réel + historique deals du jour
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: challenges, error } = await admin
    .from("challenges")
    .select("id, mt5_login, user_id, account_size, model, status, balance, start_balance, daily_drawdown_limit, total_drawdown_limit, daily_start_balance, daily_low_equity, last_synced_at")
    .not("mt5_login", "is", null)
    .in("status", ["active", "funded"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!challenges?.length) return NextResponse.json({ synced: 0, breaches: 0 });

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userEmailMap = Object.fromEntries(users.map(u => [u.id, u.email ?? ""]));

  let synced = 0;
  let breaches = 0;
  let errors = 0;

  for (const challenge of challenges) {
    try {
      const [account, positions] = await Promise.all([
        getMT5Account(challenge.mt5_login),
        getMT5Positions(challenge.mt5_login).catch(() => []),
      ]);

      const equity       = account.equity ?? account.balance ?? 0;
      const startBalance = challenge.start_balance ?? challenge.balance ?? 0;
      const totalLimit   = challenge.total_drawdown_limit ?? 10;
      const dailyLimit   = challenge.daily_drawdown_limit ?? 5;

      // Tracking du jour de trading (22:00 UTC → 21:59 UTC) — avant le guard PUMP_NONE
      const now = new Date();
      const tradingDayStart = new Date(now);
      if (now.getUTCHours() < 22) tradingDayStart.setUTCDate(tradingDayStart.getUTCDate() - 1);
      tradingDayStart.setUTCHours(22, 0, 0, 0);
      const lastSyncedAt = (challenge.last_synced_at as string | null) ?? null;
      const isNewDay = !lastSyncedAt || new Date(lastSyncedAt) < tradingDayStart;

      // Guard: VPS returns balance=0 in PUMP_NONE mode — reset daily si nouveau jour avec balance DB
      if ((account.balance ?? 0) === 0 && (account.equity ?? 0) === 0 && startBalance > 0) {
        const dbBal = challenge.balance as number;
        if (isNewDay && dbBal > 0) {
          await admin.from("challenges").update({
            daily_start_balance: dbBal,
            daily_low_equity:    dbBal,
            daily_dd:            0,
            last_synced_at:      new Date().toISOString(),
          }).eq("id", challenge.id);
          console.warn(`[${challenge.mt5_login}] PUMP_NONE + new day → daily reset with DB balance=${dbBal}`);
        } else {
          console.warn(`[${challenge.mt5_login}] PUMP_NONE → skip`);
        }
        errors++;
        continue;
      }

      await syncTradeRiskSnapshots({
        admin,
        challengeId: challenge.id,
        mt5Login: challenge.mt5_login,
        accountEquity: equity,
        positions,
      }).catch(error => console.error(`[${challenge.mt5_login}] risk snapshot failed:`, error));
      const storedDailyStart = (challenge.daily_start_balance as number | null) ?? null;
      const storedDailyLow   = (challenge.daily_low_equity    as number | null) ?? null;
      const curBalance       = account.balance ?? startBalance;

      const noOpenPos        = Math.abs(equity - curBalance) < 0.50;

      // Staleness 1 : ancien code EOD stockait daily_start = start_balance
      const dailyStartIsStale = !isNewDay && storedDailyStart !== null
        && Math.abs(storedDailyStart - startBalance) < 0.01
        && curBalance < startBalance - 0.01;

      // Staleness 2 : daily_low anachronique (beaucoup plus bas que balance actuelle)
      const dailyLowIsStale  = !isNewDay && storedDailyLow !== null
        && noOpenPos
        && storedDailyLow < curBalance - startBalance * 0.01;

      // Staleness 3 : daily_start nettement au-dessus de curBalance sans trades aujourd'hui
      // (reset 22h manqué — ex: compte restauré avec ancien daily_start d'une période bénéficiaire)
      let dailyStartMissedReset = false;
      let prefetchedHistory: Record<string, unknown>[] | null = null;
      if (!isNewDay && storedDailyStart !== null && noOpenPos
          && storedDailyStart > curBalance + startBalance * 0.005) {
        try {
          prefetchedHistory = await getMT5History(challenge.mt5_login) as Record<string, unknown>[];
          const noTradesToday = !prefetchedHistory.some(
            d => (d.time as number) * 1000 >= tradingDayStart.getTime()
          );
          if (noTradesToday) {
            dailyStartMissedReset = true;
            console.warn(`[${challenge.mt5_login}] daily_start=${storedDailyStart} >> balance=${curBalance}, aucun trade aujourd'hui → reset`);
          }
        } catch {}
      }

      const effectiveNewDay  = isNewDay || dailyStartIsStale || dailyLowIsStale || dailyStartMissedReset;

      const dailyStartBalance = (effectiveNewDay || storedDailyStart === null) ? curBalance : storedDailyStart;
      const dailyLowEquity    = (effectiveNewDay || storedDailyLow   === null) ? equity : Math.min(storedDailyLow, equity);

      // daily_dd affiché = perte depuis l'ouverture du jour (0 si pas de perte aujourd'hui)
      const dailyDDDisplay = dailyStartBalance > 0 ? Math.max(0, (dailyStartBalance - dailyLowEquity) / dailyStartBalance * 100) : 0;

      // Seuils de breach : plancher fixe basé sur start_balance original
      const totalThreshold = startBalance * (1 - totalLimit / 100);
      const dailyThreshold = startBalance * (1 - dailyLimit / 100);

      let breachReason: string | null = null;
      let breachEquity = equity;

      // Worst equity du jour (day-reset) pour le check de breach
      const worstEquity = Math.min(equity, dailyLowEquity);

      if (worstEquity <= dailyThreshold) { breachReason = "daily_drawdown"; breachEquity = worstEquity; }
      if (worstEquity <= totalThreshold) { breachReason = "total_drawdown"; breachEquity = worstEquity; }

      // --- CHECK 2 : snapshots passés (rattrape un breach manqué par le cron) ---
      if (!breachReason) {
        const { data: pastSnaps } = await admin
          .from("mt5_snapshots")
          .select("equity, balance")
          .eq("mt5_login", challenge.mt5_login)
          .order("created_at", { ascending: false })
          .limit(20);

        if (pastSnaps?.length) {
          for (const snap of pastSnaps) {
            const snapEquity = snap.equity ?? snap.balance ?? 0;
            if (snapEquity > 0 && snapEquity <= dailyThreshold) {
              breachReason = "daily_drawdown";
              breachEquity = snapEquity;
              console.error(`BREACH SNAPSHOT [${challenge.mt5_login}] daily_drawdown — equity snapshot: ${snapEquity}`);
              break;
            }
            if (snapEquity > 0 && snapEquity <= totalThreshold) {
              breachReason = "total_drawdown";
              breachEquity = snapEquity;
              console.error(`BREACH SNAPSHOT [${challenge.mt5_login}] total_drawdown — equity snapshot: ${snapEquity}`);
              break;
            }
          }
        }
      }

      // --- CHECK 3 : historique deals du jour (détecte breach intra-minute) ---
      if (!breachReason) {
        try {
          const history = prefetchedHistory ?? await getMT5History(challenge.mt5_login) as Record<string, unknown>[];
          prefetchedHistory = history;
          const todayMs = new Date().setHours(0, 0, 0, 0);

          const todayDeals = history
            .filter(d => (d.time as number) * 1000 >= todayMs)
            .sort((a, b) => (a.time as number) - (b.time as number));

          // Reconstruction correcte : solde en début de journée = balance MT5 actuelle - profits d'aujourd'hui
          const todayProfitTotal = todayDeals.reduce((s, d) => s + (typeof d.profit === "number" ? d.profit : 0), 0);
          const balanceStartOfDay = (account.balance ?? startBalance) - todayProfitTotal;

          let runningBalance = balanceStartOfDay;
          for (const deal of todayDeals) {
            const profit = typeof deal.profit === "number" ? deal.profit : 0;
            runningBalance += profit;
            // Vérifier DAILY DD (5%) ET TOTAL DD (10%) sur chaque deal fermé
            if (runningBalance <= dailyThreshold) {
              breachReason = "daily_drawdown";
              breachEquity = runningBalance;
              console.error(`BREACH HISTORIQUE [${challenge.mt5_login}] daily_drawdown — balance reconstituée: ${runningBalance.toFixed(0)} (seuil: ${dailyThreshold})`);
              break;
            }
            if (runningBalance <= totalThreshold) {
              breachReason = "total_drawdown";
              breachEquity = runningBalance;
              console.error(`BREACH HISTORIQUE [${challenge.mt5_login}] total_drawdown — balance reconstituée: ${runningBalance.toFixed(0)} (seuil: ${totalThreshold})`);
              break;
            }
          }
        } catch (histErr) {
          console.warn(`History check skipped for ${challenge.mt5_login}:`, histErr);
        }
      }

      // --- COUPE IMMÉDIATE si breach détecté ---
      if (breachReason) {
        const breachPct = parseFloat(((startBalance - breachEquity) / startBalance * 100).toFixed(2));
        console.error(`BREACH [${challenge.mt5_login}] ${breachReason} — equity: ${breachEquity}, pct: ${breachPct}%`);

        await admin.from("challenges").update({
          status:         "failed",
          balance:        breachEquity,
          breach_equity:  breachEquity,
          breach_at:      new Date().toISOString(),
          breach_reason:  breachReason,
          breach_value:   breachPct,
          last_synced_at: new Date().toISOString(),
        }).eq("id", challenge.id);

        try { await changeMT5Group(challenge.mt5_login, "HAR/MAN32/demoG5"); } catch (e) { console.error("changeMT5Group failed:", e); }
        try { await disableMT5Account(challenge.mt5_login); }                   catch (e) { console.error("disableMT5Account failed:", e); }

        const userEmail = userEmailMap[challenge.user_id] ?? "";
        if (userEmail) try { await sendFailedEmail(userEmail, challenge.account_size, breachReason as "daily_drawdown" | "total_drawdown", undefined, { userId: challenge.user_id as string, challengeId: challenge.id as string }); } catch {}

        breaches++;
        continue;
      }

      // --- Pas de breach : snapshot normal ---
      await admin.from("challenges").update({
        equity:              equity,
        balance:             account.balance ?? 0,
        open_positions:      positions,
        positions_synced_at: new Date().toISOString(),
        last_synced_at:      new Date().toISOString(),
        daily_low_equity:    dailyLowEquity,
        daily_dd:            parseFloat(dailyDDDisplay.toFixed(2)),
        ...(effectiveNewDay && { daily_start_balance: curBalance }),
      }).eq("id", challenge.id);

      // Le cache de performance dépend de la migration 20260811. On le met à
      // jour séparément afin qu'une colonne absente ne bloque jamais le snapshot principal.
      if (prefetchedHistory) {
        const { error: metricsError } = await admin.from("challenges").update({
          trade_metrics: summarizeTradeHistory(prefetchedHistory),
          trade_metrics_synced_at: new Date().toISOString(),
        }).eq("id", challenge.id);

        if (metricsError && !["42703", "PGRST204"].includes(metricsError.code ?? "")) {
          console.warn(`[${challenge.mt5_login}] trade metrics cache failed:`, metricsError.message);
        }
      }
      await admin.from("mt5_snapshots").insert({
        challenge_id:    challenge.id,
        mt5_login:       challenge.mt5_login,
        balance:         account.balance ?? null,
        equity:          equity,
        margin:          account.margin      ?? null,
        free_margin:     account.margin_free ?? null,
        profit:          account.profit      ?? null,
        positions_count: positions.length,
        positions:       positions,
      });

      synced++;
    } catch (e) {
      console.error(`MT5 snapshot failed for login ${challenge.mt5_login}:`, e);
      errors++;
    }
  }

  // --- Mise à jour noms MT5 pour comptes récents (< 2h) ---
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentChallenges } = await admin
      .from("challenges")
      .select("id, mt5_login, model, phase, user_id")
      .not("mt5_login", "is", null)
      .gte("created_at", twoHoursAgo);

    for (const c of recentChallenges ?? []) {
      const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", c.user_id).single();
      const { data: { user } } = await admin.auth.admin.getUserById(c.user_id);
      const firstName = user?.user_metadata?.first_name || profile?.first_name || "Trader";
      const lastName  = user?.user_metadata?.last_name  || profile?.last_name  || "";
      const phaseLabel = c.phase === "funded" ? "Reward" : c.phase === "phase2" ? "Phase 2" : "Phase 1";
      const label = c.model === "vip" ? `Algo | ${phaseLabel}` : `Trader | ${phaseLabel}`;
      try { await updateMT5AccountName(c.mt5_login, firstName, lastName, label); } catch {}
    }
  } catch {}

  return NextResponse.json({ synced, breaches, errors, total: challenges.length });
}
