/** Allow-listed response shared with the authenticated mobile API. */
export type Account = {
  id: string; name: string; capital: number; equity: number | null;
  kind: 'challenge' | 'reward'; status: string;
  startedAt: string; expiresAt: string | null;
  targetProfit: number | null; drawdownFloor: number | null;
  drawdownRate: number | null; drawdownLabel: string;
  minDays: number | null; qualifiedDays: number | null;
  consistencyLimit: number | null; consistency: number | null;
  profit: number; rewardLevel: number | null; rewardCaps: number[];
  paidRewards: number; profitSplit: number | null;
  qualifyingDailyProfit: number | null; lastSyncedAt: string | null;
  historyState: 'ready' | 'not_loaded' | 'unavailable';
  daily: { date: string; profit: number }[];
  eligibility: { eligible: boolean; maximum: number; qualifyingDays: number;
    consistency: number | null; reasons: string[] } | null;
};
export type Trade = {
  id: string; accountId: string; symbol: string; side: 'Achat' | 'Vente';
  volume: number | null; openedAt: string | null; closedAt: string;
  tradingDate: string; netProfit: number;
};
export type Reward = {
  id: string; accountId: string; level: number | null; gross: number | null;
  net: number | null; status: string; date: string;
};
export interface DashboardSnapshot {
  version: 1; selectedAccountId: string | null; accounts: Account[];
  trades: Trade[]; rewards: Reward[];
  profile: { name: string; email: string; kycStatus: string };
  asOf: string;
}
