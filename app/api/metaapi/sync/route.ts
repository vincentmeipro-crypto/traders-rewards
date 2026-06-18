import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMT5Account, createMT5Account, changeMT5Group, disableMT5Account, closeAllPositions, changeMT5Password } from "@/lib/mt5";
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
      const acc = await createMT5Account({ firstName, lastName, email: userEmail, leverage: 100, group, account_size: accountSize });
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
  // Equity réelle = balance + profit flottant (a.Equity du Manager API n'est pas toujours temps réel)
  const floatingProfit = typeof info.profit === "number" ? info.profit : 0;
  const newEquity = newBalance + floatingProfit;

  // 2. Jours de trading
  const prevTradingDays  = challenge.trading_days as number;
  const lastSyncedAt     = challenge.last_synced_at as string | null;
  const lastSyncedDay    = lastSyncedAt ? new Date(lastSyncedAt).toDateString() : null;
  const today            = new Date().toDateString();
  const isNewDay         = lastSyncedDay !== today;
  // Use dedicated last_trading_day field so that a sync with no activity doesn't
  // block counting a day later when the trader opens a position the same day.
  const lastTradingDay   = (challenge.last_trading_day as string | null) ?? null;
  const alreadyCounted   = lastTradingDay === today;
  // Count trading day if balance changed (closed trade) OR there is floating P&L (open trade)
  const hadActivity      = Math.abs(newBalance - prevBalance) > 0.01 || Math.abs(floatingProfit) > 0.01;
  const dayWasCounted    = hadActivity && !alreadyCounted;
  const newTradingDays   = dayWasCounted ? prevTradingDays + 1 : prevTradingDays;
  const dayProfit        = newBalance - prevBalance;
  const prevBestDay      = (challenge.best_day_profit as number | null) ?? 0;
  const newBestDay       = Math.max(prevBestDay, dayProfit > 0 ? dayProfit : 0);

  // 3. Drawdown journalier — tracking du pire equity de la journee
  // 1-Step EOD trailing: highest_balance advances only at day rollover (not intraday)
  const safeHighest = prevHighest <= startBalance ? startBalance : prevHighest;
  const newHighest = is1Step
    ? (isNewDay ? Math.max(safeHighest, newBalance) : safeHighest)
    : Math.max(safeHighest, newBalance);
  const storedDailyLow = (challenge.daily_low_equity as number | null) ?? null;
  const dailyLowEquity = (isNewDay || storedDailyLow === null)
    ? newEquity
    : Math.min(storedDailyLow, newEquity);

  // Reference fixe au debut du jour: empeche qu un profit qui se retourne cree un faux DD
  const storedDailyRef  = (challenge.daily_start_balance as number | null) ?? null;
  const dailyRefBalance = (isNewDay || storedDailyRef === null) ? prevBalance : storedDailyRef;
  const dailyDD         = dailyRefBalance > 0 ? ((dailyRefBalance - dailyLowEquity) / dailyRefBalance) * 100 : 0;
  const dailyDDRounded  = parseFloat(dailyDD.toFixed(2));

  // 4. Mise Ã  jour balance dans Supabase
  const baseNow = new Date().toISOString();
  await admin.from("challenges").update({
    balance: newBalance,
    highest_balance: newHighest,
    trading_days: newTradingDays,
    last_synced_at: baseNow,
    daily_low_equity: dailyLowEquity,
    ...(dayWasCounted && { last_trading_day: today }),
  }).eq("id", id);
  try { await admin.from("challenges").update({ daily_dd: dailyDDRounded, best_day_profit: newBestDay, daily_start_balance: dailyRefBalance }).eq("id", id); } catch {}

  // 5. Breach drawdown journalier
  if (dailyDD >= dailyLimit) {
    await closeAllPositions(login).catch((e) => console.error(`[${login}] closeAllPositions failed:`, e));
    await changeMT5Group(login, "Starwave\\demo\\FX1\\grp5").catch((e) => console.error(`[${login}] changeMT5Group failed:`, e));
    await disableMT5Account(login).catch((e) => console.error(`[${login}] disableMT5Account failed:`, e));
    await changeMT5Password(login).catch((e) => console.error(`[${login}] changeMT5Password failed:`, e));
    const alreadyFailed = challenge.status === "failed";
    await admin.from("challenges").update({
      status: "failed",
      balance: dailyLowEquity,
      last_synced_at: baseNow,
      daily_low_equity: dailyLowEquity,
      ...(!alreadyFailed && { breach_at: baseNow, breach_reason: "daily_drawdown", breach_value: dailyDDRounded, breach_equity: dailyLowEquity }),
    }).eq("id", id);
    if (!alreadyFailed) {
      try { await sendFailedEmail(userEmail, accountSize, "daily_drawdown", login); }
      catch (e) { console.error("sendFailedEmail daily_drawdown error:", e); }
    }
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
    await closeAllPositions(login).catch((e) => console.error(`[${login}] closeAllPositions failed:`, e));
    await changeMT5Group(login, "Starwave\\demo\\FX1\\grp5").catch((e) => console.error(`[${login}] changeMT5Group failed:`, e));
    await disableMT5Account(login).catch((e) => console.error(`[${login}] disableMT5Account failed:`, e));
    await changeMT5Password(login).catch((e) => console.error(`[${login}] changeMT5Password failed:`, e));
    const alreadyFailed = challenge.status === "failed";
    await admin.from("challenges").update({
      status: "failed",
      balance: newEquity,
      last_synced_at: baseNow,
      ...(!alreadyFailed && { breach_at: baseNow, breach_reason: "total_drawdown", breach_value: parseFloat(totalDD.toFixed(2)), breach_equity: newEquity }),
    }).eq("id", id);
    if (!alreadyFailed) {
      try { await sendFailedEmail(userEmail, accountSize, "total_drawdown", login); }
      catch (e) { console.error("sendFailedEmail total_drawdown error:", e); }
    }
    return { status: "failed", reason: "total_drawdown", pct: totalDD.toFixed(2) };
  }

  // 7. Transitions de phase -- meme compte MT5, on retire le profit et on update la ligne
  const profitPct = startBalance > 0 ? ((newBalance - startBalance) / startBalance) * 100 : 0;
  const targetMet = profitPct >= profitTarget;
  const daysMet   = newTradingDays >= 5;
  const certDate  = new Date().toLocaleDateString("fr-FR");

  // 1-Step: phase1 -> certified
  if (is1Step && phase === "phase1" && targetMet && daysMet) {
    await changeMT5Group(login, FUNDED_GROUP["1step"]).catch(() => {});
    await admin.from("challenges").update({
      phase: "funded", status: "funded", trading_days: 0, profit_target: 0,
      balance: startBalance, highest_balance: startBalance,
    }).eq("id", id);
    await sendFundedEmail(userEmail, accountSize).catch(() => {});
    await sendChallengeCertificateEmail(userEmail, firstName, lastName, accountSize, certDate).catch(() => {});
    return { status: "synced", transition: "phase1->certified (1-step)" };
  }

  // 2-Step: phase1 -> phase2
  if (!is1Step && phase === "phase1" && targetMet && daysMet) {
    await admin.from("challenges").update({
      phase: "phase2", status: "active", trading_days: 0, profit_target: 5,
      balance: startBalance, highest_balance: startBalance,
    }).eq("id", id);
    await sendPhase2Email(userEmail, accountSize).catch(() => {});
    await sendPhase1CertificateEmail(userEmail, firstName, lastName, accountSize, certDate).catch(() => {});
    return { status: "synced", transition: "phase1->phase2" };
  }

  // 2-Step: phase2 -> certified
  if (!is1Step && phase === "phase2" && targetMet && daysMet) {
    await changeMT5Group(login, FUNDED_GROUP["2step"]).catch(() => {});
    await admin.from("challenges").update({
      phase: "funded", status: "funded", trading_days: 0, profit_target: 0,
      balance: startBalance, highest_balance: startBalance,
    }).eq("id", id);
    await sendFundedEmail(userEmail, accountSize).catch(() => {});
    await sendChallengeCertificateEmail(userEmail, firstName, lastName, accountSize, certDate).catch(() => {});
    return { status: "synced", transition: "phase2->certified" };
  }


  // 8. Email rÃ©cap journalier
  const createdAt = challenge.created_at as string | null;
  const alreadySentToday = lastSyncedAt ? new Date(lastSyncedAt).toDateString() === today : false;
  const purchasedToday   = createdAt ? new Date(createdAt).toDateString() === today : false;
  if (!alreadySentToday && !purchasedToday) {
    await sendDailyUpdateEmail(userEmail, accountSize, phase, newBalance, profitPct, newTradingDays, { model, highestBalance: newHighest, totalLimit, startBalance }).catch(() => {});
  }

  return { status: "synced", balance: newBalance, profitPct: profitPct.toFixed(2), tradingDays: newTradingDays, dailyDD: dailyDD.toFixed(2), rawBalance: info.balance, rawEquity: newEquity, rawProfit: info.profit, prevBalance };
}

// â”€â”€ Route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && auth !== `Bearer admin-vincentmeipro@gmail.com`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: challenges } = await admin
    .from("challenges")
    .select("*")
    .in("status", ["active", "funded"]);

  // Récupérer les payouts en attente pour bloquer la sync des comptes certified concernés
  const { data: pendingPayouts } = await admin
    .from("payouts")
    .select("challenge_id")
    .eq("status", "pending");
  const pendingChallengeIds = new Set((pendingPayouts || []).map((p: { challenge_id: string }) => p.challenge_id));

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
      // Ne pas syncer un compte certified qui a une récompense en attente d'approbation
      if (challenge.phase === "funded" && pendingChallengeIds.has(challenge.id)) {
        results.push({ id: challenge.id, status: "skipped_pending_reward" });
        continue;
      }

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

