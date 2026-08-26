/**
 * ============================================================
 * V1 Display Helpers — Traders Rewards Apex EOD Model
 * ============================================================
 * Fonctions pures pour l'affichage UI des règles V1.
 * Aucun import Supabase / MT5. Safe pour Client Components.
 *
 * Consommé par : RewardReviewPanel, TraderCockpit, admin/page
 * ============================================================
 */

import {
  V1_DD_MODEL,
  V1_CHALLENGE,
  V1_REWARD_QUAL,
  V1_CONSISTENCY_PCT,
  V1_MAX_REWARDS,
  getV1DdUsdByBalance,
  getV1SafetyNet,
  getV1RewardCap,
  computeRewardRequestThreshold,
  getV1QualifyingDayMinUsd,
  getTraderV1Level,
} from "./v1-engine";

// ── Détection V1 ──────────────────────────────────────────────

/** Retourne true si le compte est un produit V1 Apex EOD */
export function isV1Product(ddModel: string | null | undefined): boolean {
  return ddModel === V1_DD_MODEL;
}

// ── Niveau métier ─────────────────────────────────────────────

/**
 * Label court du niveau V1 pour affichage admin/dashboard.
 * Exemples : "Challenge", "Reward #1", "Reward #3", "Terminé (5/5)"
 */
export function getV1LevelLabel(
  phase: string,
  paidRewardsCount: number,
  terminatedAt?: string | null,
): string {
  if (terminatedAt) return "Terminé (5/5)";
  const level = getTraderV1Level(phase, paidRewardsCount);
  if (level.terminated) return "Terminé (5/5)";
  if (phase !== "funded") return "Challenge";
  const rn = level.nextRewardNumber;
  return rn != null ? `Reward #${rn}` : "Terminé";
}

// ── DD EOD ────────────────────────────────────────────────────

/** Retourne le DD EOD fixe en USD (ex: "2 000 $") */
export function getV1DdDisplay(startBalance: number): string {
  return `${getV1DdUsdByBalance(startBalance).toLocaleString("fr-FR")} $`;
}

/** Retourne le DD EOD fixe en USD (valeur numérique) */
export function getV1DdUsd(startBalance: number): number {
  return getV1DdUsdByBalance(startBalance);
}

// ── Safety Net ────────────────────────────────────────────────

/** Retourne la Safety Net (ex: "52 100 $") */
export function getV1SafetyNetDisplay(startBalance: number): string {
  return `${getV1SafetyNet(startBalance).toLocaleString("fr-FR")} $`;
}

/** Retourne la Safety Net (valeur numérique) */
export function getV1SafetyNetUsd(startBalance: number): number {
  return getV1SafetyNet(startBalance);
}

// ── Seuil Reward ──────────────────────────────────────────────

/** Retourne le seuil du Reward courant (Safety Net + cap du niveau) */
export function getV1RewardThresholdDisplay(startBalance: number, rewardLevel: number): string {
  const threshold = computeRewardRequestThreshold(startBalance, rewardLevel);
  return `${threshold.toLocaleString("fr-FR")} $`;
}

/** Retourne le seuil du Reward courant (valeur numérique) */
export function getV1RewardThresholdUsd(startBalance: number, rewardLevel: number): number {
  return computeRewardRequestThreshold(startBalance, rewardLevel);
}

// ── Cap Reward ────────────────────────────────────────────────

/** Retourne le cap du Reward courant (ex: "500 $") */
export function getV1RewardCapDisplay(startBalance: number, rewardLevel: number): string {
  const cap = getV1RewardCap(startBalance, rewardLevel);
  if (cap == null) return "—";
  return `${cap.toLocaleString("fr-FR")} $`;
}

// ── Qualifying days ───────────────────────────────────────────

/** Retourne le minimum journalier qualifiant (ex: "250 $/jour") */
export function getV1QualDayDisplay(startBalance: number): string {
  return `${getV1QualifyingDayMinUsd(startBalance).toLocaleString("fr-FR")} $/jour`;
}

/** Retourne le minimum journalier qualifiant (valeur numérique) */
export function getV1QualDayUsd(startBalance: number): number {
  return getV1QualifyingDayMinUsd(startBalance);
}

// ── Consistance ───────────────────────────────────────────────

/**
 * Retourne le label de consistency pour un compte V1.
 *
 * Challenge V1  → "AUCUNE"  (Apex EOD supprime la consistency)
 * Reward V1     → "≤ 50%"   (was 33% pour les anciens contrats)
 */
export function getV1ConsistencyDisplay(phase: string): string {
  return phase === "funded"
    ? `≤ ${V1_CONSISTENCY_PCT.reward}%`
    : "AUCUNE";
}

// ── Constantes utiles ─────────────────────────────────────────

/** Nombre minimum de jours qualifiants pour le Reward Account */
export const V1_QUAL_DAYS_MIN = V1_REWARD_QUAL.minQualifyingDays as number;

/** Nombre minimum de jours de trading pour le Challenge V1 */
export const V1_CHALLENGE_MIN_DAYS = V1_CHALLENGE.minTradingDays as number;

/** Durée max du challenge V1 en jours calendaires */
export const V1_CHALLENGE_MAX_DAYS = V1_CHALLENGE.maxTradingDays as number;

/** Objectif de profit Challenge V1 en % */
export const V1_CHALLENGE_PROFIT_PCT = V1_CHALLENGE.profitTargetPct as number;

/** Objectif de profit Reward V1 en % */
export const V1_REWARD_PROFIT_PCT = V1_REWARD_QUAL.profitTargetPct as number;

/** Nombre maximum de Rewards dans le parcours V1 */
export const V1_MAX = V1_MAX_REWARDS as number;
