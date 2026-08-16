import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMT5Account, getMT5Positions } from "@/lib/mt5";

export const maxDuration = 60;

const POLL_INTERVAL_MS = 1_000;
const WATCH_DURATION_MS = 55_000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const watchdogSecret = process.env.MT5_WATCHDOG_SECRET || process.env.MT5_API_SECRET;
  if (!watchdogSecret) return NextResponse.json({ error: "Watchdog secret missing" }, { status: 500 });

  const admin = createAdminClient();
  const { data: challenges, error } = await admin.from("challenges")
    .select("id, mt5_login, balance, start_balance, daily_drawdown_limit, total_drawdown_limit, daily_start_balance, last_synced_at")
    .not("mt5_login", "is", null)
    .in("status", ["active", "funded"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const startedAt = Date.now();
  const now = new Date(startedAt);
  const tradingDayStart = new Date(now);
  if (now.getUTCHours() < 22) tradingDayStart.setUTCDate(tradingDayStart.getUTCDate() - 1);
  tradingDayStart.setUTCHours(22, 0, 0, 0);
  const latched = new Set<number>();
  const pending = new Map<number, number>();
  const dailyReferences = new Map<number, number>();
  let samples = 0;
  let errors = 0;

  while (Date.now() - startedAt < WATCH_DURATION_MS) {
    const iterationStartedAt = Date.now();

    await Promise.all((challenges ?? []).map(async challenge => {
      const login = Number(challenge.mt5_login);
      if (!Number.isSafeInteger(login) || latched.has(login)) return;
      try {
        const [account, positions] = await Promise.all([
          getMT5Account(login),
          getMT5Positions(login),
        ]);
        const balance = Number(account.balance ?? 0);
        const positionProfit = positions.reduce((sum, position) => sum + Number(position.profit ?? 0), 0);
        const equity = positions.length > 0
          ? balance + positionProfit
          : typeof account.profit === "number"
            ? balance + account.profit
            : Number(account.equity ?? balance);
        samples++;
        if (!Number.isFinite(equity) || equity <= 0) return;

        const startBalance = Number(challenge.start_balance);
        let dailyReference = dailyReferences.get(login);
        if (!dailyReference) {
          const storedDailyStart = Number(challenge.daily_start_balance);
          const lastSyncedAt = challenge.last_synced_at ? new Date(challenge.last_synced_at).getTime() : 0;
          dailyReference = lastSyncedAt >= tradingDayStart.getTime() && storedDailyStart > 0
            ? storedDailyStart
            : balance > 0
              ? balance
              : Number(challenge.balance ?? startBalance);
          if (dailyReference > 0) dailyReferences.set(login, dailyReference);
        }
        const dailyFloor = dailyReference * (1 - Number(challenge.daily_drawdown_limit ?? 5) / 100);
        const totalFloor = startBalance * (1 - Number(challenge.total_drawdown_limit ?? 10) / 100);
        if (equity <= dailyFloor || equity <= totalFloor) {
          pending.set(login, Math.min(pending.get(login) ?? equity, equity));
        }
      } catch (error) {
        errors++;
        console.error(`[vercel-watchdog:${login}] sample failed`, error);
      }
    }));

    // A breach sample is latched before this request. Recovery on a later sample
    // cannot remove it, and a failed report is retried until the invocation ends.
    await Promise.all([...pending.entries()].map(async ([login, equity]) => {
      if (latched.has(login)) return;
      try {
        const response = await fetch(`${new URL(req.url).origin}/api/internal/mt5-breach`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${watchdogSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ login, equity, daily_start_balance: dailyReferences.get(login), observed_at: new Date().toISOString() }),
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`breach endpoint returned ${response.status}`);
        const result = await response.json();
        if (result.breach || result.ignored) {
          latched.add(login);
          pending.delete(login);
        }
      } catch (error) {
        errors++;
        console.error(`[vercel-watchdog:${login}] breach report failed`, error);
      }
    }));

    const remainingDelay = POLL_INTERVAL_MS - (Date.now() - iterationStartedAt);
    if (remainingDelay > 0) await sleep(remainingDelay);
  }

  return NextResponse.json({
    monitored: challenges?.length ?? 0,
    samples,
    breaches: latched.size,
    pending: pending.size,
    errors,
    duration_ms: Date.now() - startedAt,
  });
}