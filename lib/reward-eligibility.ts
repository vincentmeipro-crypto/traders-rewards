import { getV1RewardCap, getV1QualifyingDayMinUsd, V1_REWARD_QUAL, V1_CONSISTENCY_PCT, getTraderV1Level } from "./v1-engine";

export type RewardEligibility = { eligible: boolean; maximum: number; floor: number; qualifyingDays: number; consistency: number | null; rewardNumber: number | null; reasons: string[] };
export function evaluateReward(input: { start: number; balance: number; equity: number; phase: string; status: string; paidCount: number; terminated: boolean; pending: boolean; kyc: boolean; dailyProfits: number[] }): RewardEligibility {
  const floor = input.start * (1 + V1_REWARD_QUAL.profitTargetPct / 100);
  const level = getTraderV1Level(input.phase, input.paidCount);
  const cap = level.nextRewardNumber == null ? 0 : getV1RewardCap(input.start, level.nextRewardNumber) ?? 0;
  const maximum = Math.max(0, Math.floor((Math.min(input.balance, input.equity) - floor) * 100 + 1e-7) / 100);
  const total = input.dailyProfits.reduce((a, b) => a + b, 0);
  const consistency = total > 0 ? Math.max(0, ...input.dailyProfits) / total * 100 : null;
  const qualifyingDays = input.dailyProfits.filter(p => p >= getV1QualifyingDayMinUsd(input.start)).length;
  const reasons: string[] = [];
  if (![25000, 50000, 100000].includes(input.start)) reasons.push("unsupported");
  if (input.phase !== "funded" || !["active", "funded"].includes(input.status)) reasons.push("inactive");
  if (input.terminated || level.terminated) reasons.push("terminated");
  if (input.pending) reasons.push("pending");
  if (!input.kyc) reasons.push("kyc");
  if (![input.balance, input.equity, ...input.dailyProfits].every(Number.isFinite)) reasons.push("unavailable");
  if (qualifyingDays < V1_REWARD_QUAL.minQualifyingDays) reasons.push("days");
  if (consistency == null || consistency > V1_CONSISTENCY_PCT.reward) reasons.push("consistency");
  if (!Number.isFinite(maximum) || Math.min(maximum, cap) <= 0) reasons.push("floor");
  return { eligible: reasons.length === 0, maximum: Number.isFinite(maximum) ? Math.min(maximum, cap) : 0, floor, qualifyingDays, consistency, rewardNumber: level.nextRewardNumber, reasons };
}
export function validRewardAmount(amount: unknown, maximum: number): amount is number {
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0 && amount <= maximum && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7;
}
