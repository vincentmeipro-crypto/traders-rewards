import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Account, DashboardSnapshot, Reward, Trade } from "../mobile/src/domain/types";
import { extractContractRules } from "./contract-rules";
import { isV1Challenge } from "./v1-display";
import { getEffectiveRewardFloor, getV1DdUsdByBalance, getV1DdPctByBalance, getV1RewardCap,
  getV1QualifyingDayMinUsd, V1_CHALLENGE, V1_REWARD_QUAL, V1_CONSISTENCY_PCT, V1_MAX_REWARDS } from "./v1-engine";
import { getMT5History } from "./mt5";
import { loadRewardAccounts } from "./reward-eligibility-server";

type Row = Record<string, unknown>;
// Passwords and withdrawal destinations must never reach this API.
export const MOBILE_CHALLENGE_FIELDS = "id,account_size,model,phase,status,balance,start_balance,profit_target,daily_drawdown_limit,total_drawdown_limit,trading_days,created_at,mt5_login,last_synced_at,breach_at,breach_equity,best_day_profit,highest_balance,highest_eod,rules_snapshot,dd_model,terminated_at,open_positions";
const PAYOUT_FIELDS = "id,challenge_id,amount,status,created_at,paid_at";

function number(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function requiredNumber(value: unknown): number {
  const n = number(value);
  if (n == null) throw new Error("Incomplete account data");
  return n;
}
function date(value: unknown): string | null {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  const ms = Number.isFinite(numeric) ? (numeric > 1e10 ? numeric : numeric * 1000) : Date.parse(String(value));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function mapMobileAccount(c: Row, payouts: Row[]): Account {
  const capital = requiredNumber(c.start_balance);
  if (capital <= 0) throw new Error("Invalid account capital");
  const balance = requiredNumber(c.balance);
  const created = date(c.created_at);
  if (!created) throw new Error("Missing account start");
  const isReward = c.phase === "funded";
  const v1 = isV1Challenge({ dd_model: c.dd_model as string | null, model: c.model as string | null, rules_snapshot: c.rules_snapshot });
  const supportedV1 = v1 && [25000, 50000, 100000].includes(capital);
  const paidCount = payouts.filter(p => p.challenge_id === c.id && p.status === "paid").length;
  const phase = String(c.phase ?? "");
  const rules = extractContractRules(c.rules_snapshot, {
    phase, model: String(c.model ?? ""), profit_target: number(c.profit_target) ?? 0,
    daily_drawdown_limit: number(c.daily_drawdown_limit) ?? 0,
    total_drawdown_limit: number(c.total_drawdown_limit) ?? 0, trading_days: number(c.trading_days) ?? 0,
  });
  const targetRate = supportedV1 ? Math.max(V1_CHALLENGE.profitTargetPct, number(c.profit_target) ?? 0)
    : number(rules.currentPhase?.profit_target ?? c.profit_target);
  const ddPct = supportedV1 ? getV1DdPctByBalance(capital) : number(rules.currentPhase?.total_drawdown ?? c.total_drawdown_limit);
  const highest = number(c.highest_eod) ?? capital;
  const floor = supportedV1
    ? isReward ? getEffectiveRewardFloor(capital, highest, getV1DdUsdByBalance(capital), paidCount).floor : highest - getV1DdUsdByBalance(capital)
    : null; // Legacy drawdown models must not be guessed.
  const maxDays = isReward ? null : supportedV1 ? V1_CHALLENGE.maxTradingDays : number(rules.currentPhase?.max_trading_days);
  const minDays = supportedV1 ? isReward ? V1_REWARD_QUAL.minQualifyingDays : V1_CHALLENGE.minTradingDays
    : number(rules.currentPhase?.min_trading_days);
  const bestRule = rules.bestDayRule == null ? null : number(rules.bestDayRule.replace("%", ""));
  const limit = supportedV1 ? V1_CONSISTENCY_PCT[isReward ? "reward" : "challenge"] / 100
    : bestRule == null ? null : bestRule / 100;
  const profit = balance - capital;
  const best = number(c.best_day_profit);
  const positions = Array.isArray(c.open_positions) ? c.open_positions as Row[] : null;
  const floating = positions?.reduce((sum, p) => sum + (number(p.profit) ?? 0) + (number(p.swap) ?? 0), 0);
  const equity = c.status === "failed" && number(c.breach_equity) != null ? number(c.breach_equity)
    : floating == null ? null : balance + floating;
  const rawStatus = String(c.status ?? "unknown");
  const status = c.terminated_at ? "terminated" : c.breach_at ? "failed"
    : ["active", "funded"].includes(rawStatus) && !c.mt5_login ? "preparing" : rawStatus;
  return {
    id: String(c.id), name: `${isReward ? "Compte Reward" : "Challenge"} ${String(c.account_size ?? capital)}`,
    capital, equity, kind: isReward ? "reward" : "challenge", status, startedAt: created,
    expiresAt: maxDays == null ? null : new Date(Date.parse(created) + maxDays * 86400000).toISOString(),
    targetProfit: isReward || targetRate == null ? null : capital * targetRate / 100,
    drawdownFloor: floor, drawdownRate: ddPct == null ? null : ddPct / 100,
    drawdownLabel: supportedV1 ? "Drawdown suiveur EOD" : "Limite de perte contractuelle",
    minDays, qualifiedDays: isReward ? null : number(c.trading_days), consistencyLimit: limit,
    consistency: !isReward && best != null && profit > 0 ? best / profit : null,
    profit, rewardLevel: isReward && supportedV1 && paidCount < V1_MAX_REWARDS ? paidCount + 1 : null,
    rewardCaps: supportedV1 ? Array.from({ length: V1_MAX_REWARDS }, (_, i) => getV1RewardCap(capital, i + 1)!) : [],
    paidRewards: paidCount, profitSplit: supportedV1 ? 0.9 : rules.profitSplit == null ? null : rules.profitSplit / 100,
    qualifyingDailyProfit: isReward && supportedV1 ? getV1QualifyingDayMinUsd(capital) : null,
    lastSyncedAt: date(c.last_synced_at), daily: [], historyState: "not_loaded", eligibility: null,
  };
}

export function mapMobileRewards(payouts: Row[]): Reward[] {
  const chronological = [...payouts].sort((a, b) => String(a.paid_at ?? a.created_at).localeCompare(String(b.paid_at ?? b.created_at)));
  const counts = new Map<string, number>();
  return chronological.map(p => {
    const accountId = String(p.challenge_id);
    const paid = p.status === "paid";
    const level = paid ? (counts.get(accountId) ?? 0) + 1 : null;
    if (level != null) counts.set(accountId, level);
    // Existing workflow replaces amount with NET once paid: never split twice.
    return { id: String(p.id), accountId, level, status: String(p.status),
      net: paid ? number(p.amount) : null, gross: paid ? null : number(p.amount),
      date: String(p.paid_at ?? p.created_at) };
  }).reverse();
}

export function mapMobileTrades(history: Row[], accountId: string): Trade[] {
  const seen = new Set<string>();
  const result: Trade[] = [];
  for (const t of history) {
    const action = String(t.type ?? t.action).toLowerCase();
    if (!["0", "1", "buy", "sell"].includes(action)) continue;
    if (t.entry == null || ![1, 2, 3].includes(Number(t.entry))) continue;
    const ticket = String(t.ticket ?? t.deal ?? t.id ?? "");
    const closed = date(t.closed_at ?? t.time);
    const profit = number(t.profit);
    if (!ticket || !closed || profit == null || seen.has(ticket)) continue;
    const charges = [t.commission, t.swap, t.fee].map(v => v == null ? 0 : number(v));
    if (charges.some(v => v == null)) continue;
    seen.add(ticket);
    const buyExecution = ["0", "buy"].includes(action);
    const positionBuy = !buyExecution; // OUT / INOUT / OUT_BY: closing leg is opposite the closed position.
    result.push({ id: `${accountId}:${ticket}`, accountId, symbol: String(t.symbol ?? "—"),
      side: positionBuy ? "Achat" : "Vente", volume: Number(t.entry) === 2 ? null : number(t.volume), openedAt: date(t.opened_at ?? t.open_time),
      closedAt: closed, tradingDate: new Date(Date.parse(closed) + 2 * 3600000).toISOString().slice(0, 10),
      netProfit: profit + charges.reduce<number>((sum, value) => sum + (value ?? 0), 0) });
  }
  return result.sort((a, b) => b.closedAt.localeCompare(a.closedAt));
}

export class MobileAccountNotFound extends Error {}

export async function loadMobileDashboard(db: SupabaseClient, user: Pick<User, "id" | "email">, requestedId?: string | null): Promise<DashboardSnapshot> {
  const [accountsResult, rewardsResult, profileResult] = await Promise.all([
    db.from("challenges").select(MOBILE_CHALLENGE_FIELDS).eq("user_id", user.id).order("created_at", { ascending: false }),
    db.from("payouts").select(PAYOUT_FIELDS).eq("user_id", user.id).order("created_at", { ascending: false }),
    db.from("profiles").select("first_name,last_name,kyc_status").eq("user_id", user.id).maybeSingle(),
  ]);
  if (accountsResult.error || rewardsResult.error || profileResult.error) throw new Error("Dashboard unavailable");
  const rawAccounts = (accountsResult.data ?? []) as unknown as Row[];
  const payouts = (rewardsResult.data ?? []) as unknown as Row[];
  const accounts = rawAccounts.map(c => mapMobileAccount(c, payouts));
  const selected = requestedId ? accounts.find(a => a.id === requestedId)
    : accounts.find(a => ["active", "funded", "preparing"].includes(a.status)) ?? accounts[0];
  if (requestedId && !selected) throw new MobileAccountNotFound();
  let trades: Trade[] = [];
  if (selected) {
    const raw = rawAccounts.find(c => c.id === selected.id)!;
    if (raw.mt5_login) {
      try {
        const history = await getMT5History(Number(raw.mt5_login));
        if (!Array.isArray(history)) throw new Error("History unavailable");
        trades = mapMobileTrades(history as Row[], selected.id);
        const daily = new Map<string, number>();
        for (const t of trades) daily.set(t.tradingDate, (daily.get(t.tradingDate) ?? 0) + t.netProfit);
        selected.daily = [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, profit]) => ({ date, profit }));
        selected.historyState = "ready";
      } catch { selected.historyState = "unavailable"; }
    } else selected.historyState = "unavailable";
    if (selected.kind === "reward") {
      try {
        const [result] = await loadRewardAccounts(db, user.id, selected.id);
        if (result) {
          const unavailable = result.reasons.includes("unavailable");
          selected.eligibility = { eligible: result.eligible, maximum: result.maximum,
            qualifyingDays: result.qualifyingDays, consistency: result.consistency, reasons: result.reasons };
          selected.qualifiedDays = unavailable ? null : result.qualifyingDays;
          selected.consistency = unavailable || result.consistency == null ? null : result.consistency / 100;
        }
      } catch { selected.eligibility = null; }
    }
  }
  const p = profileResult.data;
  return { version: 1, selectedAccountId: selected?.id ?? null, accounts, trades,
    rewards: mapMobileRewards(payouts), asOf: new Date().toISOString(),
    profile: { name: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "Votre compte",
      email: user.email ?? "", kycStatus: p?.kyc_status ?? "not_submitted" } };
}
