import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMT5Account, getMT5Positions, getMT5History, changeMT5Group, disableMT5Account } from "@/lib/mt5";
import { sendFailedEmail } from "@/lib/mailer";

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
    .select("id, mt5_login, user_id, account_size, model, status, balance, start_balance, daily_drawdown_limit, total_drawdown_limit")
    .not("mt5_login", "is", null)
    .in("status", ["active"]);

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

      // Seuils absolus (référence fixe = startBalance)
      const totalThreshold = startBalance * (1 - totalLimit / 100);
      const dailyThreshold = startBalance * (1 - dailyLimit / 100);

      // --- CHECK 1 : equity temps réel ---
      const totalDD = startBalance > 0 ? ((startBalance - equity) / startBalance) * 100 : 0;
      const dailyDD = startBalance > 0 ? ((startBalance - equity) / startBalance) * 100 : 0;

      let breachReason: string | null = null;
      let breachEquity = equity;

      if (equity <= dailyThreshold)  breachReason = "daily_drawdown";
      if (equity <= totalThreshold)  breachReason = "total_drawdown";

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
          const history = await getMT5History(challenge.mt5_login) as Record<string, unknown>[];
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
        console.error(`BREACH [${challenge.mt5_login}] ${breachReason} — equity: ${equity}, start: ${startBalance}, totalDD: ${totalDD.toFixed(2)}%, dailyDD: ${dailyDD.toFixed(2)}%`);

        await admin.from("challenges").update({
          status:         "failed",
          balance:        breachEquity,
          last_synced_at: new Date().toISOString(),
        }).eq("id", challenge.id);

        try { await changeMT5Group(challenge.mt5_login, "HAR/MAN32/demoG5"); } catch (e) { console.error("changeMT5Group failed:", e); }
        try { await disableMT5Account(challenge.mt5_login); }                   catch (e) { console.error("disableMT5Account failed:", e); }

        const userEmail = userEmailMap[challenge.user_id] ?? "";
        if (userEmail) try { await sendFailedEmail(userEmail, challenge.account_size, breachReason as "daily_drawdown" | "total_drawdown"); } catch {}

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
      }).eq("id", challenge.id);

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

  return NextResponse.json({ synced, breaches, errors, total: challenges.length });
}
