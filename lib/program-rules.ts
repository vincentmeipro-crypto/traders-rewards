/** Current Traders Rewards policy, shared by the engine, displays and provisioning. */
export const CHALLENGE_PROFIT_TARGET_PCT = 9;

/** Gross USD caps before the trader's 90% split. Rows: 25K, 50K, 100K. */
export const REWARD_AMOUNTS = [
  [300, 400, 500, 600, 750],
  [500, 650, 800, 1000, 1250],
  [1000, 1400, 1800, 2000, 3000],
] as const;

export function challengeProfitTargetUsd(balance: number): number {
  return balance * CHALLENGE_PROFIT_TARGET_PCT / 100;
}

/** Manual creation and legacy checkout paths do not carry a product snapshot. */
export function getChallengeProfitTargetPct(model: string, balance: number, legacyTarget: number): number {
  const currentProduct = ['rewards-25k', 'rewards-50k', 'rewards-100k'].includes(model);
  const currentOneStep = model === '1step' && [25000, 50000, 100000].includes(balance);
  return currentProduct || currentOneStep ? CHALLENGE_PROFIT_TARGET_PCT : legacyTarget;
}
