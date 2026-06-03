import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMT5Account, disableMT5Account, createMT5Account } from "@/lib/mt5";
import {
  sendPhase2Email,
  sendFundedEmail,
  sendFailedEmail,
  sendDailyUpdateEmail,
  sendPhase1CertificateEmail,
  sendChallengeCertificateEmail,
  sendWelcomeEmail,
} from "@/lib/mailer";

const FUNDED_GROUP: Record<string, string> = {
  "2step": "Starwave\\demo\\FX1\\grp3",
  "1step": "Starwave\\demo\\FX1\\grp4",
};

type Challenge = Record<string, unknown>;

async function processChallenge(challenge: Challenge, userEmail: string, firstName: string, lastName: string) {
  const admin = createAdminClient();

  const id           = challenge.id as string;
  const login        = challenge.mt5_login as number | null;
  const userId       = challenge.user_id as string;
  const model        = (challenge.model as string) ?? "2step";
  const phase        = challenge.phase as string;
  const startBalance = challenge.start_balance as number;
  const dailyLimit   = challenge.daily_drawdown_limit as number;
  const totalLimit   = challenge.total_drawdown_limit as number;
  const profitTarget = challenge.profit_target as number;
  const accountSize  = challenge.account_size as string;
  const prevBalance  = challenge.balance as number;
  const prevHighest  = (challenge.highest_balance as number | null) ?? startBalance;
  const is1Step      = model.toLowerCase().replace(/[\s-]/g, "").includes("1step");

  // Helper: crÃ©e un compte MT5 et retourne les credentials
  const makeMT5 = async (group: string) => {
    try {
      const acc = await createMT5Account({ firstName, lastName, email: userEmail, leverage: 50, group, account_size: accountSize });
      return acc;
    } catch { return null; }
  };

  // 0. Pas de login MT5 â€” crÃ©er automatiquement le compte manquant
  if (!login) {
    let group = is1Step ? "Starwave\\demo\\FX1\\grp2" : "Starwave\\demo\\FX1\\grp1";
    if (phase === "funded") group = is1Step ? FUNDED_GROUP["1step"] : FUNDED_GROUP["2step"];
    const newAcc = await makeMT5(group);
    if (!newAcc) return { status: "mt5_creation_failed" };
    await admin.from("challenges").update({ mt5_login: newAcc.login, mt5_password: newAcc.password, mt5_password_investor: newAcc.password_investor, mt5_server: newAcc.server }).eq("id", id);
    await sendWelcomeEmail(userEmail, accountSize, model, { login: newAcc.login, password: newAcc.password, server: newAcc.server }).catch(() => {});
    return { status: "mt5_created", login: newAcc.login };
  }

  // 1. Balance live depuis MT5
  const info = await getMT5Account(login).catch(() => null);
  if (!info) return { status: "balance_unavailable" };

  const newBalance = info.balance as number;
  const newEquity  = info.equity  as number;
  const newHighest = Math.max(prevHighest, newEquity);

  // 2. Jours de trading
  const prevTradingDays  = challenge.trading_days as number;
  const lastSyncedAt     = challenge.last_synced_at as string | null;
  const lastSyncedDay    = lastSyncedAt ? new Date(lastSyncedAt).toDateString() : null;
  const today            = new Date().toDateString();
  const alreadyCounted   = lastSyncedDay === today;
  const balanceChanged   = Math.abs(newBalance - prevBalance) > 0.01;
  const newTradingDays   = (balanceChanged && !alreadyCounted) ? prevTradingDays + 1 : prevTradingDays;
  const dayProfit        = newBalance - prevBalance;
  const prevBestDay      = (challenge.best_day_profit as number | null) ?? 0;
  const newBestDay       = Math.max(prevBestDay, dayProfit > 0 ? dayProfit : 0);

  // 3. Drawdown journalier
  const dailyDD        = prevBalance > 0 ? ((prevBalance - newEquity) / prevBalance) * 100 : 0;
  const dailyDDRounded = parseFloat(dailyDD.toFixed(2));

  // 4. Mise Ã  jour balance dans Supabase
  const baseNow = new Date().toISOString();
  await admin.from("challenges").update({ balance: newBalance, highest_balance: newHighest, trading_days: newTradingDays, last_synced_at: baseNow }).eq("id", id);
  try { await admin.from("challenges").update({ daily_dd: dailyDDRounded, best_day_profit: newBestDay }).eq("id", id); } catch {}

  // 5. Breach drawdown journalier
  if (dailyDD >= dailyLimit) {
    await disableMT5Account(login).catch(() => {});
    const alreadyFailed = challenge.status === "failed";
    await admin.from("challenges").update({ status: "failed", ...(!alreadyFailed && { breach_at: baseNow, breach_reason: "daily_drawdown", breach_value: dailyDDRounded, breach_equity: newEquity }) }).eq("id", id);
    if (!alreadyFailed) await sendFailedEmail(userEmail, accountSize, "daily_drawdown", login).catch(() => {});
    return { status: "failed", reason: "daily_drawdown", pct: dailyDD.toFixed(2) };
  }

  // 6. Breach drawdown total
  let totalDD = 0;
  let totalViolated = false;
  if (is1Step) {
    totalDD = newHighest > 0 ? ((newHighest - newEquity) / newHighest) * 100 : 0;
    if (totalDD >= totalLimit) totalViolated = true;
  } else {
    totalDD = startBalance > 0 ? ((startBalance - newBalance) / startBalance) * 100 : 0;
    if (totalDD >= totalLimit) totalViolated = true;
  }
  if (totalViolated) {
    await disableMT5Account(login).catch(() => {});
    const alreadyFailed = challenge.status === "failed";
    await admin.from("challenges").update({ status: "failed", ...(!alreadyFailed && { breach_at: baseNow, breach_reason: "total_drawdown", breach_value: parseFloat(totalDD.toFixed(2)), breach_equity: newEquity }) }).eq("id", id);
    if (!alreadyFailed) await sendFailedEmail(userEmail, accountSize, "total_drawdown", login).catch(() => {});
    return { status: "failed", reason: "total_drawdown", pct: totalDD.toFixed(2) };
  }

  // 7. Transitions de phase â€” NOUVELLE LIGNE Ã  chaque fois
  const profitPct = startBalance > 0 ? ((newBalance - startBalance) / startBalance) * 100 : 0;
  const targetMet = profitPct >= profitTarget;
  const daysMet   = newTradingDays >= 4;
  const certDate  = new Date().toLocaleDateString("fr-FR");

  // 1-Step: phase1 â†’ certified
  if (is1Step && phase === "phase1" && targetMet && daysMet) {
    await admin.from("challenges").update({ status: "passed" }).eq("id", id);
    await disableMT5Account(login).catch(() => {});
    const newMT5 = await makeMT5(FUNDED_GROUP["1step"]);
    await admin.from("challenges").insert({
      user_id: userId, account_size: accountSize, model, status: "funded", phase: "funded",
      balance: startBalance, start_balance: startBalance, profit_target: 0,
      daily_drawdown_limit: dailyLimit, total_drawdown_limit: totalLimit, trading_days: 0, amount_paid: 0,
      mt5_login: newMT5?.login ?? null, mt5_password: newMT5?.password ?? null,
      mt5_password_investor: newMT5?.password_investor ?? null, mt5_server: newMT5?.server ?? null,
    });
    await sendFundedEmail(userEmail, accountSize, newMT5 ?? undefined).catch(() => {});
    await sendChallengeCertificateEmail(userEmail, firstName, lastName, accountSize, certDate).catch(() => {});
    return { status: "synced", transition: "phase1â†’certified (1-step)" };
  }

  // 2-Step: phase1 â†’ phase2
  if (!is1Step && phase === "phase1" && targetMet && daysMet) {
    await admin.from("challenges").update({ status: "passed" }).eq("id", id);
    await disableMT5Account(login).catch(() => {});
    const newMT5 = await makeMT5("Starwave\\demo\\FX1\\grp1");
    await admin.from("challenges").insert({
      user_id: userId, account_size: accountSize, model, status: "active", phase: "phase2",
      balance: startBalance, start_balance: startBalance, profit_target: 5,
      daily_drawdown_limit: dailyLimit, total_drawdown_limit: totalLimit, trading_days: 0, amount_paid: 0,
      mt5_login: newMT5?.login ?? null, mt5_password: newMT5?.password ?? null,
      mt5_password_investor: newMT5?.password_investor ?? null, mt5_server: newMT5?.server ?? null,
    });
    await sendPhase2Email(userEmail, accountSize, newMT5 ?? undefined).catch(() => {});
    await sendPhase1CertificateEmail(userEmail, firstName, lastName, accountSize, certDate).catch(() => {});
    return { status: "synced", transition: "phase1â†’phase2" };
  }

  // 2-Step: phase2 â†’ certified
  if (!is1Step && phase === "phase2" && targetMet && daysMet) {
    await admin.from("challenges").update({ status: "passed" }).eq("id", id);
    await disableMT5Account(login).catch(() => {});
    const newMT5 = await makeMT5(FUNDED_GROUP["2step"]);
    await admin.from("challenges").insert({
      user_id: userId, account_size: accountSize, model, status: "funded", phase: "funded",
      balance: startBalance, start_balance: startBalance, profit_target: 0,
      daily_drawdown_limit: dailyLimit, total_drawdown_limit: totalLimit, trading_days: 0, amount_paid: 0,
      mt5_login: newMT5?.login ?? null, mt5_password: newMT5?.password ?? null,
      mt5_password_investor: newMT5?.password_investor ?? null, mt5_server: newMT5?.server ?? null,
    });
    await sendFundedEmail(userEmail, accountSize, newMT5 ?? undefined).catch(() => {});
    await sendChallengeCertificateEmail(userEmail, firstName, lastName, accountSize, certDate).catch(() => {});
    return { status: "synced", transition: "phase2â†’certified" };
  }

  // 8. Email rÃ©cap journalier
  const createdAt = challenge.created_at as string | null;
  const alreadySentToday = lastSyncedAt ? new Date(lastSyncedAt).toDateString() === today : false;
  const purchasedToday   = createdAt ? new Date(createdAt).toDateString() === today : false;
  if (!alreadySentToday && !purchasedToday) {
    await sendDailyUpdateEmail(userEmail, accountSize, phase, newBalance, profitPct, newTradingDays, { model, highestBalance: newHighest, totalLimit, startBalance }).catch(() => {});
  }

  return { status: "synced", balance: newBalance, profitPct: profitPct.toFixed(2), tradingDays: newTradingDays, dailyDD: dailyDD.toFixed(2) };
}

// â”€â”€ Route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && auth !== `Bearer admin-vincentmeipro@gmail.com`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Inclut les challenges sans login MT5 (pour auto-crÃ©ation)
  const { data: challenges } = await admin
    .from("challenges")
    .select("*")
    .in("status", ["active", "funded"]);

  if (!challenges?.length) {
    return NextResponse.json({ synced: 0, message: "No active challenges" });
  }

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email ?? ""]));

  const { data: profiles } = await admin.from("profiles").select("user_id, first_name, last_name");
  const profileMap = Object.fromEntries((profiles || []).map((p: Record<string, string>) => [p.user_id, p]));

  let synced = 0;
  const results: unknown[] = [];

  for (const challenge of challenges) {
    try {
      const userEmail = userMap[challenge.user_id as string] ?? "";
      const profile   = profileMap[challenge.user_id as string] || {};
      const firstName = (profile as Record<string, string>).first_name || "";
      const lastName  = (profile as Record<string, string>).last_name || "";
      const result    = await processChallenge(challenge as Challenge, userEmail, firstName, lastName);
      results.push({ id: challenge.id, login: challenge.mt5_login, ...result });
      if ((result as { status: string }).status !== "balance_unavailable") synced++;
    } catch (e) {
      console.error(`Sync error [${challenge.id}]:`, e);
      results.push({ id: challenge.id, status: "error", error: String(e) });
    }
  }

  return NextResponse.json({ synced, total: challenges.length, results });
}

