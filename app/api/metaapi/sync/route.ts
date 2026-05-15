import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPhase2Email, sendFundedEmail, sendFailedEmail, sendDailyUpdateEmail } from "@/lib/mailer";

const ADMIN_EMAIL = "vincentmeipro@gmail.com";
const METAAPI_BASE = "https://mt-provisioning-api-v1.london.agiliumtrade.ai";
const METAAPI_CLIENT = "https://mt-client-api-v1.london.agiliumtrade.ai";

async function provisionAccount(login: string, password: string, server: string, name: string) {
  const res = await fetch(`${METAAPI_BASE}/users/current/accounts`, {
    method: "POST",
    headers: {
      "auth-token": process.env.METAAPI_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      login,
      password,
      serverName: server,
      platform: "mt5",
      name,
      type: "cloud-g2",
      region: "london",
      magic: 0,
      quoteStreamingIntervalInSeconds: 2.5,
      reliability: "regular",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MetaAPI provision error: ${err}`);
  }
  const data = await res.json();
  return data.id as string;
}

async function getBalance(metaapiAccountId: string): Promise<number | null> {
  const res = await fetch(
    `${METAAPI_CLIENT}/users/current/accounts/${metaapiAccountId}/account-information`,
    { headers: { "auth-token": process.env.METAAPI_TOKEN! } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data.balance === "number" ? data.balance : null;
}

async function checkAndTransition(
  challenge: Record<string, unknown>,
  userEmail: string,
  prevBalance: number
) {
  const admin = createAdminClient();
  const balance = challenge.balance as number;
  const startBalance = challenge.start_balance as number;
  const tradingDays = challenge.trading_days as number;
  const phase = challenge.phase as string;
  const profitTarget = challenge.profit_target as number;
  const accountSize = challenge.account_size as string;
  const id = challenge.id as string;
  const totalDrawdownLimit = challenge.total_drawdown_limit as number;
  const dailyDrawdownLimit = challenge.daily_drawdown_limit as number;

  const totalDrawdownPct = ((startBalance - balance) / startBalance) * 100;
  if (totalDrawdownPct >= totalDrawdownLimit) {
    await admin.from("challenges").update({ status: "failed" }).eq("id", id);
    try { await sendFailedEmail(userEmail, accountSize, "total_drawdown"); } catch {}
    return "failed_total_drawdown";
  }

  if (prevBalance > 0) {
    const dailyDrawdownPct = ((prevBalance - balance) / prevBalance) * 100;
    if (dailyDrawdownPct >= dailyDrawdownLimit) {
      await admin.from("challenges").update({ status: "failed" }).eq("id", id);
      try { await sendFailedEmail(userEmail, accountSize, "daily_drawdown"); } catch {}
      return "failed_daily_drawdown";
    }
  }

  const profitPct = ((balance - startBalance) / startBalance) * 100;

  if (phase === "phase1" && profitPct >= profitTarget && tradingDays >= 4) {
    await admin.from("challenges").update({
      phase: "phase2", balance: startBalance,
      profit_target: 5, trading_days: 0, status: "active",
    }).eq("id", id);
    try { await sendPhase2Email(userEmail, accountSize); } catch {}
    return "phase2";
  }

  if (phase === "phase2" && profitPct >= profitTarget && tradingDays >= 4) {
    await admin.from("challenges").update({
      phase: "funded", status: "funded",
    }).eq("id", id);
    try { await sendFundedEmail(userEmail, accountSize); } catch {}
    return "funded";
  }

  return null;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    authHeader !== `Bearer admin-${ADMIN_EMAIL}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Récupère tous les challenges actifs avec des identifiants MT5
  const { data: challenges } = await admin
    .from("challenges")
    .select("*")
    .eq("status", "active")
    .not("ctrader_account_id", "is", null)
    .not("ctrader_password", "is", null)
    .not("server", "is", null);

  if (!challenges?.length) return NextResponse.json({ synced: 0 });

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email || ""]));

  let synced = 0;
  const results = [];

  for (const challenge of challenges) {
    try {
      let metaapiId = challenge.metaapi_account_id as string | null;

      // Provision le compte dans MetaAPI si pas encore fait
      if (!metaapiId) {
        metaapiId = await provisionAccount(
          String(challenge.ctrader_account_id),
          challenge.ctrader_password,
          challenge.server,
          `Elysium-${challenge.ctrader_account_id}`
        );
        await admin.from("challenges")
          .update({ metaapi_account_id: metaapiId })
          .eq("id", challenge.id);
        // Attendre que le compte soit connecté (30s max en prod, on skip ce cycle)
        results.push({ id: challenge.id, status: "provisioned", metaapiId });
        continue;
      }

      // Récupère le solde via MetaAPI
      const newBalance = await getBalance(metaapiId);
      if (newBalance === null) {
        results.push({ id: challenge.id, status: "balance_unavailable" });
        continue;
      }

      const prevBalance = challenge.balance as number;
      const hasActivity = Math.abs(newBalance - prevBalance) > 0.01;
      const newTradingDays = hasActivity
        ? (challenge.trading_days as number) + 1
        : (challenge.trading_days as number);

      await admin.from("challenges").update({
        balance: newBalance,
        trading_days: newTradingDays,
        last_synced_at: new Date().toISOString(),
      }).eq("id", challenge.id);

      const updated = { ...challenge, balance: newBalance, trading_days: newTradingDays };
      const userEmail = userMap[challenge.user_id] || "";
      const transition = await checkAndTransition(updated, userEmail, prevBalance);

      if (!transition) {
        const profitPct = ((newBalance - (challenge.start_balance as number)) / (challenge.start_balance as number)) * 100;
        try { await sendDailyUpdateEmail(userEmail, challenge.account_size as string, challenge.phase as string, newBalance, profitPct, newTradingDays); } catch {}
      }

      results.push({ id: challenge.id, status: "synced", balance: newBalance, transition });
      synced++;
    } catch (e) {
      console.error(`MetaAPI sync error for ${challenge.id}:`, e);
      results.push({ id: challenge.id, status: "error", error: String(e) });
    }
  }

  return NextResponse.json({ synced, total: challenges.length, results });
}
