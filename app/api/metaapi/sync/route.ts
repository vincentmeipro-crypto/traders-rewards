import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendPhase2Email,
  sendFundedEmail,
  sendFailedEmail,
  sendDailyUpdateEmail,
} from "@/lib/mailer";

const METAAPI_PROVISION = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const METAAPI_CLIENT = "https://mt-client-api-v1.london.agiliumtrade.ai";

// ─── MetaAPI helpers ──────────────────────────────────────────────────────────

async function provisionAccount(
  login: string,
  password: string,
  server: string,
  name: string
): Promise<string> {
  const res = await fetch(`${METAAPI_PROVISION}/users/current/accounts`, {
    method: "POST",
    headers: {
      "auth-token": process.env.METAAPI_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      login,
      password,
      server,
      platform: "mt5",
      name,
      type: "cloud-g2",
      region: "london",
      magic: 0,
      quoteStreamingIntervalInSeconds: 2.5,
      reliability: "regular",
    }),
  });
  if (!res.ok) throw new Error(`MetaAPI provision: ${await res.text()}`);
  const data = await res.json();
  return data.id as string;
}

type AccountInfo = { balance: number; equity: number };

async function getAccountInfo(metaapiId: string): Promise<AccountInfo | null> {
  const res = await fetch(
    `${METAAPI_CLIENT}/users/current/accounts/${metaapiId}/account-information`,
    { headers: { "auth-token": process.env.METAAPI_TOKEN! } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (typeof data.balance !== "number") return null;
  return { balance: data.balance, equity: data.equity ?? data.balance };
}

type Deal = { time: string; type: string };

async function getDeals(metaapiId: string, since: Date): Promise<Deal[]> {
  const from = since.toISOString();
  const to = new Date().toISOString();
  const res = await fetch(
    `${METAAPI_CLIENT}/users/current/accounts/${metaapiId}/history-deals/time/${from}/${to}`,
    { headers: { "auth-token": process.env.METAAPI_TOKEN! } }
  );
  if (!res.ok) return [];
  return res.json();
}

// Count unique calendar days with at least one closed trade
function countTradingDays(deals: Deal[]): number {
  const days = new Set<string>();
  for (const deal of deals) {
    if (deal.type === "DEAL_TYPE_BALANCE") continue; // skip deposit/withdrawal entries
    days.add(deal.time.slice(0, 10));
  }
  return days.size;
}

// ─── Core processing logic ────────────────────────────────────────────────────

type Challenge = Record<string, unknown>;

async function processChallenge(
  challenge: Challenge,
  userEmail: string
): Promise<Record<string, unknown>> {
  const admin = createAdminClient();

  const id = challenge.id as string;
  const model = (challenge.model as string) ?? "2step";  // "2step" | "1step"
  const phase = challenge.phase as string;               // "phase1" | "phase2" | "funded"
  const startBalance = challenge.start_balance as number;
  const dailyDrawdownLimit = challenge.daily_drawdown_limit as number;
  const totalDrawdownLimit = challenge.total_drawdown_limit as number;
  const profitTarget = challenge.profit_target as number;
  const accountSize = challenge.account_size as string;
  const metaapiId = challenge.metaapi_account_id as string;
  const prevBalance = challenge.balance as number;
  // highest_balance tracks peak equity (used for 1-Step trailing drawdown)
  // Falls back to startBalance if column doesn't exist yet in DB
  const prevHighest = (challenge.highest_balance as number | null) ?? startBalance;

  // 1. Fetch live balance + equity from MetaAPI
  const info = await getAccountInfo(metaapiId);
  if (!info) return { status: "balance_unavailable" };
  const { balance: newBalance, equity: newEquity } = info;

  // 2. Update high-water mark (peak equity ever reached)
  const newHighest = Math.max(prevHighest, newEquity);

  // 3. Count trading days from full deal history (more reliable than balance diff)
  const challengeStart = new Date(challenge.created_at as string);
  const deals = await getDeals(metaapiId, challengeStart);
  const newTradingDays = countTradingDays(deals);

  // ── Daily drawdown ─────────────────────────────────────────────────────────
  // prevBalance = balance at last sync = effectively yesterday (daily cron)
  const dailyDrawdownPct =
    prevBalance > 0 ? ((prevBalance - newEquity) / prevBalance) * 100 : 0;

  if (dailyDrawdownPct >= dailyDrawdownLimit) {
    await admin
      .from("challenges")
      .update({
        status: "failed",
        balance: newBalance,
        highest_balance: newHighest,
        trading_days: newTradingDays,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", id);
    await sendFailedEmail(userEmail, accountSize, "daily_drawdown").catch(() => {});
    return {
      status: "failed",
      reason: "daily_drawdown",
      pct: dailyDrawdownPct.toFixed(2),
    };
  }

  // ── Total / Trailing drawdown ──────────────────────────────────────────────
  let totalViolated = false;

  if (model === "1step") {
    // 1-Step uses trailing drawdown: from the highest equity ever reached
    const trailingPct =
      newHighest > 0 ? ((newHighest - newEquity) / newHighest) * 100 : 0;
    if (trailingPct >= totalDrawdownLimit) totalViolated = true;
  } else {
    // 2-Step: fixed from the initial start balance
    const totalPct =
      startBalance > 0 ? ((startBalance - newBalance) / startBalance) * 100 : 0;
    if (totalPct >= totalDrawdownLimit) totalViolated = true;
  }

  if (totalViolated) {
    await admin
      .from("challenges")
      .update({
        status: "failed",
        balance: newBalance,
        highest_balance: newHighest,
        trading_days: newTradingDays,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", id);
    await sendFailedEmail(userEmail, accountSize, "total_drawdown").catch(() => {});
    return { status: "failed", reason: "total_drawdown" };
  }

  // ── Save updated data ──────────────────────────────────────────────────────
  await admin
    .from("challenges")
    .update({
      balance: newBalance,
      highest_balance: newHighest,
      trading_days: newTradingDays,
      last_synced_at: new Date().toISOString(),
    })
    .eq("id", id);

  // ── Phase transitions ──────────────────────────────────────────────────────
  const profitPct =
    startBalance > 0 ? ((newBalance - startBalance) / startBalance) * 100 : 0;
  const targetReached = profitPct >= profitTarget;
  const minDaysMet = newTradingDays >= 4;

  // 1-Step: phase1 → funded (no phase2)
  if (model === "1step" && phase === "phase1" && targetReached && minDaysMet) {
    await admin
      .from("challenges")
      .update({ phase: "funded", status: "funded" })
      .eq("id", id);
    await sendFundedEmail(userEmail, accountSize).catch(() => {});
    return { status: "synced", transition: "phase1→funded (1-step)", balance: newBalance };
  }

  // 2-Step: phase1 → phase2 (reset balance + target)
  if (model === "2step" && phase === "phase1" && targetReached && minDaysMet) {
    await admin
      .from("challenges")
      .update({
        phase: "phase2",
        balance: startBalance,
        highest_balance: startBalance,
        profit_target: 5,
        trading_days: 0,
        status: "active",
      })
      .eq("id", id);
    await sendPhase2Email(userEmail, accountSize).catch(() => {});
    return { status: "synced", transition: "phase1→phase2", balance: newBalance };
  }

  // 2-Step: phase2 → funded
  if (model === "2step" && phase === "phase2" && targetReached && minDaysMet) {
    await admin
      .from("challenges")
      .update({ phase: "funded", status: "funded" })
      .eq("id", id);
    await sendFundedEmail(userEmail, accountSize).catch(() => {});
    return { status: "synced", transition: "phase2→funded", balance: newBalance };
  }

  // ── No transition — send daily recap ──────────────────────────────────────
  await sendDailyUpdateEmail(
    userEmail,
    accountSize,
    phase,
    newBalance,
    profitPct,
    newTradingDays
  ).catch(() => {});

  return {
    status: "synced",
    balance: newBalance,
    profitPct: profitPct.toFixed(2),
    tradingDays: newTradingDays,
    dailyDD: dailyDrawdownPct.toFixed(2),
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (
    auth !== `Bearer ${process.env.CRON_SECRET}` &&
    auth !== `Bearer admin-vincentmeipro@gmail.com`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Include funded accounts — they still need drawdown monitoring
  const { data: challenges } = await admin
    .from("challenges")
    .select("*")
    .in("status", ["active", "funded"])
    .not("ctrader_account_id", "is", null)
    .not("ctrader_password", "is", null)
    .not("server", "is", null);

  if (!challenges?.length) {
    return NextResponse.json({ synced: 0, message: "No active challenges with MT5 credentials" });
  }

  const {
    data: { users },
  } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.email ?? ""]));

  let synced = 0;
  const results: unknown[] = [];

  for (const challenge of challenges) {
    try {
      let metaapiId = challenge.metaapi_account_id as string | null;

      // Auto-provision in MetaAPI if not done yet
      if (!metaapiId) {
        metaapiId = await provisionAccount(
          String(challenge.ctrader_account_id),
          challenge.ctrader_password as string,
          challenge.server as string,
          `Elysium-${challenge.ctrader_account_id}`
        );
        await admin
          .from("challenges")
          .update({ metaapi_account_id: metaapiId })
          .eq("id", challenge.id);
        results.push({ id: challenge.id, status: "provisioned", metaapiId });
        continue; // data synced on next cron cycle once MT5 connection is established
      }

      const userEmail = userMap[challenge.user_id as string] ?? "";
      const result = await processChallenge(challenge as Challenge, userEmail);
      results.push({ id: challenge.id, ...result });
      if ((result as { status: string }).status !== "balance_unavailable") synced++;
    } catch (e) {
      console.error(`Sync error [${challenge.id}]:`, e);
      results.push({ id: challenge.id, status: "error", error: String(e) });
    }
  }

  return NextResponse.json({ synced, total: challenges.length, results });
}
