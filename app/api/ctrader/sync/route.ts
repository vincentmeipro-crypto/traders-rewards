import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPhase2Email, sendFundedEmail } from "@/lib/mailer";

const ADMIN_EMAIL = "fundedelysium@gmail.com";

async function refreshToken(refreshToken: string) {
  const res = await fetch("https://connect.ctrader.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.CTRADER_CLIENT_ID!,
      client_secret: process.env.CTRADER_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function getAccountData(accessToken: string) {
  const res = await fetch("https://api.ctrader.com/connect/oauth/accounts", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.data?.[0] || null;
}

async function checkAndTransition(challenge: Record<string, unknown>, userEmail: string, prevBalance: number) {
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

  // Check total drawdown (balance vs original start balance)
  const totalDrawdownPct = ((startBalance - balance) / startBalance) * 100;
  if (totalDrawdownPct >= totalDrawdownLimit) {
    await admin.from("challenges").update({ status: "failed" }).eq("id", id);
    return "failed_total_drawdown";
  }

  // Check daily drawdown (today's drop vs yesterday's closing balance)
  if (prevBalance > 0) {
    const dailyDrawdownPct = ((prevBalance - balance) / prevBalance) * 100;
    if (dailyDrawdownPct >= dailyDrawdownLimit) {
      await admin.from("challenges").update({ status: "failed" }).eq("id", id);
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
  // Security: only allow Vercel Cron or admin
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && authHeader !== `Bearer admin-${ADMIN_EMAIL}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get all active challenges with cTrader tokens
  const { data: challenges } = await admin
    .from("challenges")
    .select("*")
    .not("ctrader_refresh_token", "is", null)
    .eq("status", "active");

  if (!challenges?.length) return NextResponse.json({ synced: 0 });

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email || ""]));

  let synced = 0;

  for (const challenge of challenges) {
    try {
      let accessToken = challenge.ctrader_access_token;

      // Refresh token if expired
      if (!accessToken || Date.now() > (challenge.ctrader_token_expiry || 0) - 60000) {
        const newTokens = await refreshToken(challenge.ctrader_refresh_token);
        if (!newTokens) continue;
        accessToken = newTokens.access_token;
        await admin.from("challenges").update({
          ctrader_access_token: newTokens.access_token,
          ctrader_token_expiry: Date.now() + (newTokens.expires_in * 1000),
        }).eq("id", challenge.id);
      }

      // Get account data
      const account = await getAccountData(accessToken);
      if (!account) continue;

      const newBalance = account.balance ? account.balance / 100 : challenge.balance;

      // Count today as trading day if there was activity
      const hasActivity = account.balance !== (challenge.balance * 100);
      const newTradingDays = hasActivity
        ? challenge.trading_days + 1
        : challenge.trading_days;

      await admin.from("challenges").update({
        balance: newBalance,
        trading_days: newTradingDays,
        last_synced_at: new Date().toISOString(),
      }).eq("id", challenge.id);

      // Check phase transition + drawdown (prevBalance = balance before this sync)
      const updated = { ...challenge, balance: newBalance, trading_days: newTradingDays };
      const userEmail = userMap[challenge.user_id] || "";
      await checkAndTransition(updated, userEmail, challenge.balance);

      synced++;
    } catch (e) {
      console.error(`Sync error for challenge ${challenge.id}:`, e);
    }
  }

  return NextResponse.json({ synced, total: challenges.length });
}
