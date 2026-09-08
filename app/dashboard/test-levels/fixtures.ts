import type { CockpitChallenge } from "../TraderCockpit";
import { V1_DD_MODEL, getV1DdPctByBalance } from "@/lib/v1-engine";

// In-memory fixtures only. Never insert these records into Supabase.
export function createLevelFixtures(userId: string) {
  const base = {
    user_id: userId, is_test: true, account_size: "50K", model: "rewards-50k",
    start_balance: 50000, daily_drawdown_limit: 0,
    total_drawdown_limit: getV1DdPctByBalance(50000), dd_model: V1_DD_MODEL,
    trading_days: 0, best_day_profit: 0,
  };
  const challenges = [
    { ...base, id: "local-test-50k-n1", label: "TEST 50K — N1 CHALLENGER", phase: "phase1", status: "active", balance: 50000, highest_eod: 50000, profit_target: 6 },
    { ...base, id: "local-test-50k-n2", label: "TEST 50K — N2 COMPTE REWARD", phase: "funded", status: "funded", balance: 52500, highest_eod: 52500, profit_target: 0 },
    { ...base, id: "local-test-50k-n3", label: "TEST 50K — N3 TRADER REWARD", phase: "funded", status: "funded", balance: 52500, highest_eod: 53000, profit_target: 0 },
  ] satisfies (CockpitChallenge & { user_id: string; is_test: boolean; label: string })[];
  const payouts = [{ id: "local-test-reward-n3-paid-1", user_id: userId, challenge_id: "local-test-50k-n3", amount: 500, status: "paid", is_test: true, created_at: "2026-09-07T12:00:00Z" }];
  return { challenges, payouts };
}
