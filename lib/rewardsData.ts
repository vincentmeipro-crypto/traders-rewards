// ══════════════════════════════════════════════════════════════
//  lib/rewardsData.ts — Source de vérité FRONTEND uniquement
//  ⚠  NE PAS utiliser pour les règles métier DB / API / Stripe
//  Consommé par : RewardLevels, TraderMarquee, JourneyBanner…
// ══════════════════════════════════════════════════════════════

// Tailles de comptes disponibles (affichage frontend uniquement)
export const ACCOUNT_SIZES = [
  { label: "25K",  usdBal: 25_000,  slug: "rewards-25k",  challengeEur: 19, refEur: 190, activEur: 99  },
  { label: "50K",  usdBal: 50_000,  slug: "rewards-50k",  challengeEur: 29, refEur: 290, activEur: 99  },
  { label: "100K", usdBal: 100_000, slug: "rewards-100k", challengeEur: 59, refEur: 590, activEur: 149 },
] as const;

// Niveaux de Rewards (1 → 5)
export const REWARD_LEVELS = [
  { num: 1, label: "REWARD START",  shortLabel: "START",  isTrader: false },
  { num: 2, label: "REWARD PLUS",   shortLabel: "PLUS",   isTrader: false },
  { num: 3, label: "REWARD PRO",    shortLabel: "PRO",    isTrader: false },
  { num: 4, label: "REWARD PRIME",  shortLabel: "PRIME",  isTrader: false },
  { num: 5, label: "TRADER REWARD", shortLabel: "TRADER", isTrader: true  },
] as const;

// Plafonds MAX par taille × niveau
// REWARD_AMOUNTS[sizeIndex][levelIndex]  (0=25K · 1=50K · 2=100K)
export const REWARD_AMOUNTS = [
  [ 300,  400,  500,  600,  750 ],  // 25K  R1 → R5
  [ 500,  650,  800, 1000, 1250 ],  // 50K  R1 → R5
  [ 750, 1000, 1250, 1500, 1750 ],  // 100K R1 → R5
] as const;

// Seuils journée qualifiante (USD) — [25K, 50K, 100K] — APEX EOD MODEL
// ATTENTION : ce sont des SEUILS de qualification, PAS des montants de reward
// Apex EOD : montants relevés (was [50, 100, 150])
export const QUAL_DAY_USD = [100, 250, 300] as const;
