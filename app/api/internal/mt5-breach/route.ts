import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { changeMT5Group, changeMT5Password, closeAllPositions, disableMT5Account } from "@/lib/mt5";
import { sendFailedEmail } from "@/lib/mailer";

function authorized(req: NextRequest): boolean {
  const secret = process.env.MT5_WATCHDOG_SECRET || process.env.MT5_API_SECRET;
  return Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("challenges")
    .select("id, mt5_login, start_balance, daily_drawdown_limit, total_drawdown_limit, daily_start_balance")
    .not("mt5_login", "is", null)
    .in("status", ["active", "funded"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { login?: unknown; equity?: unknown; daily_start_balance?: unknown; observed_at?: unknown } | null;
  const login = Number(body?.login);
  const equity = Number(body?.equity);
  if (!Number.isSafeInteger(login) || !Number.isFinite(equity) || equity <= 0) {
    return NextResponse.json({ error: "Invalid login or equity" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: challenge, error } = await admin.from("challenges")
    .select("id, user_id, account_size, start_balance, daily_drawdown_limit, total_drawdown_limit, daily_start_balance, status")
    .eq("mt5_login", login)
    .in("status", ["active", "funded"])
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!challenge) return NextResponse.json({ breach: false, ignored: true });

  const startBalance = Number(challenge.start_balance);
  const dailyLimit = Number(challenge.daily_drawdown_limit ?? 5);
  const totalLimit = Number(challenge.total_drawdown_limit ?? 10);
  const reportedDailyStart = Number(body?.daily_start_balance);
  const storedDailyStart = Number(challenge.daily_start_balance);
  const dailyReference = reportedDailyStart > 0
    ? reportedDailyStart
    : storedDailyStart > 0
      ? storedDailyStart
      : startBalance;
  const dailyFloor = dailyReference * (1 - dailyLimit / 100);
  const totalFloor = startBalance * (1 - totalLimit / 100);
  const reason = equity <= totalFloor ? "total_drawdown" : equity <= dailyFloor ? "daily_drawdown" : null;
  if (!reason) return NextResponse.json({ breach: false });

  const observedAt = typeof body?.observed_at === "string" && !Number.isNaN(Date.parse(body.observed_at))
    ? new Date(body.observed_at).toISOString()
    : new Date().toISOString();
  const breachReference = reason === "daily_drawdown" ? dailyReference : startBalance;
  const breachValue = Number((((breachReference - equity) / breachReference) * 100).toFixed(2));

  // Safety actions are intentionally attempted before the DB claim: if Supabase is
  // temporarily unavailable, stopping the account is safer than leaving it tradable.
  await closeAllPositions(login).catch(error => console.error(`[watchdog:${login}] close failed`, error));
  await changeMT5Group(login, "HAR/MAN32/demoG5").catch(error => console.error(`[watchdog:${login}] group failed`, error));
  await disableMT5Account(login).catch(error => console.error(`[watchdog:${login}] disable failed`, error));
  await changeMT5Password(login).catch(error => console.error(`[watchdog:${login}] password failed`, error));

  const { data: claimed, error: claimError } = await admin.from("challenges").update({
    status: "failed",
    balance: equity,
    equity,
    daily_start_balance: dailyReference,
    daily_low_equity: equity,
    breach_equity: equity,
    breach_at: observedAt,
    breach_reason: reason,
    breach_value: breachValue,
    last_synced_at: new Date().toISOString(),
  }).eq("id", challenge.id).in("status", ["active", "funded"]).select("id").maybeSingle();
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  if (!claimed) return NextResponse.json({ breach: true, already_claimed: true });

  const { data: { user } } = await admin.auth.admin.getUserById(challenge.user_id);
  if (user?.email) {
    await sendFailedEmail(user.email, challenge.account_size, reason, login, { userId: challenge.user_id, challengeId: challenge.id })
      .catch(error => console.error(`[watchdog:${login}] failure email failed`, error));
  }
  return NextResponse.json({ breach: true, reason, equity, observed_at: observedAt });
}