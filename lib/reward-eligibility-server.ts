import type { SupabaseClient } from "@supabase/supabase-js";
import { getMT5Account, getMT5History } from "./mt5";
import { isV1Challenge } from "./v1-display";
import { evaluateReward } from "./reward-eligibility";

export async function loadRewardAccounts(db: SupabaseClient, userId: string, onlyId?: string) {
  let query = db.from("challenges").select("*").eq("user_id", userId).eq("phase", "funded");
  if (onlyId) query = query.eq("id", onlyId);
  const [accounts, payouts, profile] = await Promise.all([
    query,
    db.from("payouts").select("challenge_id,status").eq("user_id", userId),
    db.from("profiles").select("kyc_status").eq("user_id", userId).single(),
  ]);
  if (accounts.error || payouts.error || profile.error) throw new Error("Eligibility data unavailable");
  const results = [];
  // Bound broker traffic; each failed account stays unavailable independently.
  for (const c of accounts.data ?? []) {
    const related = (payouts.data ?? []).filter(p => p.challenge_id === c.id);
    const base = { start: Number(c.start_balance), balance: Number(c.balance), equity: Number(c.balance), phase: c.phase, status: c.status, paidCount: related.filter(p => p.status === "paid").length, terminated: Boolean(c.terminated_at || c.breach_at), pending: related.some(p => ["pending", "approved", "processing"].includes(p.status)), kyc: profile.data?.kyc_status === "approved", dailyProfits: [] as number[] };
    let eligibility = evaluateReward(base);
    try {
      if (!isV1Challenge(c) || !c.mt5_login) throw new Error("Unavailable account");
      const [live, history] = await Promise.all([getMT5Account(c.mt5_login), getMT5History(c.mt5_login)]);
      if (live.balance == null || live.equity == null || !Array.isArray(history)) throw new Error("Invalid broker data");
      const days = new Map<string, number>();
      const seen = new Set<string>();
      const since = Date.parse(c.reward_converted_at ?? "");
      if (!Number.isFinite(since)) throw new Error("Missing account start");
      for (const raw of history) {
        const t = raw as Record<string, unknown>;
        const action = String(t.type ?? t.action).toLowerCase();
        if (!["0", "1", "buy", "sell"].includes(action)) continue;
        const id = String(t.ticket ?? t.deal ?? t.id ?? "");
        if (!id) throw new Error("Missing deal identifier");
        if (seen.has(id)) continue;
        seen.add(id);
        const rawTime = t.time ?? t.closed_at;
        const numericTime = Number(rawTime);
        const time = Number.isFinite(numericTime) ? (numericTime > 1e10 ? numericTime : numericTime * 1000) : Date.parse(String(rawTime));
        if (!Number.isFinite(time)) throw new Error("Missing deal time");
        if (time < since) continue;
        const pnl = Number(t.profit ?? 0) + Number(t.commission ?? 0) + Number(t.swap ?? 0) + Number(t.fee ?? 0);
        if (!Number.isFinite(pnl)) throw new Error("Invalid deal amount");
        // Trading day rolls over at 22:00 UTC, as specified by the EOD engine.
        const key = new Date(time + 2 * 60 * 60 * 1000).toISOString().slice(0, 10);
        days.set(key, (days.get(key) ?? 0) + pnl);
      }
      eligibility = evaluateReward({ ...base, balance: Number(live.balance), equity: Number(live.equity), dailyProfits: [...days.values()] });
    } catch {
      eligibility = { ...eligibility, eligible: false, maximum: 0, reasons: [...eligibility.reasons, "unavailable"] };
    }
    results.push({ id: c.id as string, accountSize: c.account_size as string, login: c.mt5_login as number | null, ...eligibility });
  }
  return results;
}
