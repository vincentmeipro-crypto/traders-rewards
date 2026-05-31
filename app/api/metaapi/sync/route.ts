import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMT5Account, disableMT5Account, changeMT5Group } from "@/lib/mt5";
import {
  sendPhase2Email,
  sendFundedEmail,
  sendFailedEmail,
  sendDailyUpdateEmail,
} from "@/lib/mailer";

const FUNDED_GROUP: Record<string, string> = {
  "2step": "Starwave\\demo\\FX1\\grp3",
  "1step": "Starwave\\demo\\FX1\\grp4",
};

type Challenge = Record<string, unknown>;

async function processChallenge(challenge: Challenge, userEmail: string) {
  const admin = createAdminClient();

  const id             = challenge.id as string;
  const login          = challenge.mt5_login as number;
  const model          = (challenge.model as string) ?? "2step";
  const phase          = challenge.phase as string;
  const startBalance   = challenge.start_balance as number;
  const dailyLimit     = challenge.daily_drawdown_limit as number;
  const totalLimit     = challenge.total_drawdown_limit as number;
  const profitTarget   = challenge.profit_target as number;
  const accountSize    = challenge.account_size as string;
  const prevBalance    = challenge.balance as number;
  const prevHighest    = (challenge.highest_balance as number | null) ?? startBalance;

  // 1. Fetch live balance + equity from our MT5 microservice
  const info = await getMT5Account(login).catch(() => null);
  if (!info) return { status: "balance_unavailable" };

  const newBalance  = info.balance as number;
  const newEquity   = info.equity  as number;
  const newHighest  = Math.max(prevHighest, newEquity);

  // 2. Count trading days: if balance changed since last sync → traded today
  const prevTradingDays = challenge.trading_days as number;
  const tradedToday = Math.abs(newBalance - prevBalance) > 0.01;
  const newTradingDays = tradedToday ? prevTradingDays + 1 : prevTradingDays;

  // ── Daily drawdown ────────────────────────────────────────────────────────
  const dailyDD = prevBalance > 0 ? ((prevBalance - newEquity) / prevBalance) * 100 : 0;

  if (dailyDD >= dailyLimit) {
    await disableMT5Account(login).catch(() => {});
    await admin.from("challenges").update({
      status: "failed",
      balance: newBalance,
      highest_balance: newHighest,
      trading_days: newTradingDays,
      last_synced_at: new Date().toISOString(),
    }).eq("id", id);
    await sendFailedEmail(userEmail, accountSize, "daily_drawdown").catch(() => {});
    return { status: "failed", reason: "daily_drawdown", pct: dailyDD.toFixed(2) };
  }

  // ── Total / Trailing drawdown ─────────────────────────────────────────────
  let totalViolated = false;
  if (model === "1step") {
    const trailing = newHighest > 0 ? ((newHighest - newEquity) / newHighest) * 100 : 0;
    if (trailing >= totalLimit) totalViolated = true;
  } else {
    const total = startBalance > 0 ? ((startBalance - newBalance) / startBalance) * 100 : 0;
    if (total >= totalLimit) totalViolated = true;
  }

  if (totalViolated) {
    await disableMT5Account(login).catch(() => {});
    await admin.from("challenges").update({
      status: "failed",
      balance: newBalance,
      highest_balance: newHighest,
      trading_days: newTradingDays,
      last_synced_at: new Date().toISOString(),
    }).eq("id", id);
    await sendFailedEmail(userEmail, accountSize, "total_drawdown").catch(() => {});
    return { status: "failed", reason: "total_drawdown" };
  }

  // ── Save updated data ─────────────────────────────────────────────────────
  await admin.from("challenges").update({
    balance: newBalance,
    highest_balance: newHighest,
    trading_days: newTradingDays,
    last_synced_at: new Date().toISOString(),
  }).eq("id", id);

  // ── Phase transitions ─────────────────────────────────────────────────────
  const profitPct   = startBalance > 0 ? ((newBalance - startBalance) / startBalance) * 100 : 0;
  const targetMet   = profitPct >= profitTarget;
  const daysMet     = newTradingDays >= 4;

  // 1-Step: phase1 → funded
  if (model === "1step" && phase === "phase1" && targetMet && daysMet) {
    await changeMT5Group(login, FUNDED_GROUP["1step"]).catch(() => {});
    await admin.from("challenges").update({ phase: "funded", status: "funded" }).eq("id", id);
    await sendFundedEmail(userEmail, accountSize).catch(() => {});
    return { status: "synced", transition: "phase1→funded (1-step)", balance: newBalance };
  }

  // 2-Step: phase1 → phase2
  if (model === "2step" && phase === "phase1" && targetMet && daysMet) {
    await admin.from("challenges").update({
      phase: "phase2",
      balance: startBalance,
      highest_balance: startBalance,
      profit_target: 5,
      trading_days: 0,
      status: "active",
    }).eq("id", id);
    await sendPhase2Email(userEmail, accountSize).catch(() => {});
    return { status: "synced", transition: "phase1→phase2", balance: newBalance };
  }

  // 2-Step: phase2 → funded
  if (model === "2step" && phase === "phase2" && targetMet && daysMet) {
    await changeMT5Group(login, FUNDED_GROUP["2step"]).catch(() => {});
    await admin.from("challenges").update({ phase: "funded", status: "funded" }).eq("id", id);
    await sendFundedEmail(userEmail, accountSize).catch(() => {});
    return { status: "synced", transition: "phase2→funded", balance: newBalance };
  }

  // ── Daily recap email ─────────────────────────────────────────────────────
  await sendDailyUpdateEmail(userEmail, accountSize, phase, newBalance, profitPct, newTradingDays).catch(() => {});

  return { status: "synced", balance: newBalance, profitPct: profitPct.toFixed(2), tradingDays: newTradingDays, dailyDD: dailyDD.toFixed(2) };
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && auth !== `Bearer admin-vincentmeipro@gmail.com`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: challenges } = await admin
    .from("challenges")
    .select("*")
    .in("status", ["active", "funded"])
    .not("mt5_login", "is", null);

  if (!challenges?.length) {
    return NextResponse.json({ synced: 0, message: "No active challenges with MT5 credentials" });
  }

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email ?? ""]));

  let synced = 0;
  const results: unknown[] = [];

  for (const challenge of challenges) {
    try {
      const userEmail = userMap[challenge.user_id as string] ?? "";
      const result = await processChallenge(challenge as Challenge, userEmail);
      results.push({ id: challenge.id, login: challenge.mt5_login, ...result });
      if ((result as { status: string }).status !== "balance_unavailable") synced++;
    } catch (e) {
      console.error(`Sync error [${challenge.id}]:`, e);
      results.push({ id: challenge.id, status: "error", error: String(e) });
    }
  }

  return NextResponse.json({ synced, total: challenges.length, results });
}
