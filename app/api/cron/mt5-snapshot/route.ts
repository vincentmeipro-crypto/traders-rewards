import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMT5Account, getMT5Positions, changeMT5Group, disableMT5Account } from "@/lib/mt5";
import { sendFailedEmail } from "@/lib/mailer";

// Vercel Cron — toutes les minutes
// Vérifie les drawdowns en temps réel et coupe immédiatement si limite atteinte
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: challenges, error } = await admin
    .from("challenges")
    .select("id, mt5_login, user_id, account_size, model, status, balance, start_balance, highest_balance, daily_drawdown_limit, total_drawdown_limit")
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

      const equity = account.equity ?? account.balance ?? 0;
      const startBalance = challenge.start_balance ?? challenge.balance ?? 0;
      const currentBalance = challenge.balance ?? startBalance;

      // Vérification drawdown total : (start_balance - equity) / start_balance
      const totalDrawdownPct = startBalance > 0
        ? ((startBalance - equity) / startBalance) * 100
        : 0;

      // Vérification drawdown journalier : (balance_actuelle - equity) / balance_actuelle
      const dailyDrawdownPct = currentBalance > 0
        ? ((currentBalance - equity) / currentBalance) * 100
        : 0;

      const totalBreached = totalDrawdownPct >= (challenge.total_drawdown_limit ?? 10);
      const dailyBreached = dailyDrawdownPct >= (challenge.daily_drawdown_limit ?? 5);

      if (totalBreached || dailyBreached) {
        const reason = totalBreached ? "total_drawdown" : "daily_drawdown";
        console.error(`BREACH [${challenge.mt5_login}] ${reason} — equity: ${equity}, start: ${startBalance}, balance: ${currentBalance}, totalDD: ${totalDrawdownPct.toFixed(2)}%, dailyDD: ${dailyDrawdownPct.toFixed(2)}%`);

        // 1. Marquer failed en DB
        await admin.from("challenges").update({
          status: "failed",
          balance: equity,
          last_synced_at: new Date().toISOString(),
        }).eq("id", challenge.id);

        // 2. Groupe 5 + désactivation MT5
        try { await changeMT5Group(challenge.mt5_login, "HAR\\MAN32\\demoG5"); } catch (e) { console.error("changeMT5Group breach failed:", e); }
        try { await disableMT5Account(challenge.mt5_login); } catch (e) { console.error("disableMT5Account breach failed:", e); }

        // 3. Email client
        const userEmail = userEmailMap[challenge.user_id] ?? "";
        if (userEmail) {
          try { await sendFailedEmail(userEmail, challenge.account_size, reason); } catch {}
        }

        breaches++;
        continue;
      }

      // Pas de breach : snapshot normal
      await admin.from("challenges").update({
        equity:              equity,
        open_positions:      positions,
        positions_synced_at: new Date().toISOString(),
        balance:             account.balance ?? currentBalance,
        last_synced_at:      new Date().toISOString(),
      }).eq("id", challenge.id);

      await admin.from("mt5_snapshots").insert({
        challenge_id:    challenge.id,
        mt5_login:       challenge.mt5_login,
        balance:         account.balance ?? null,
        equity:          equity,
        margin:          account.margin  ?? null,
        free_margin:     account.margin_free ?? null,
        profit:          account.profit  ?? null,
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
