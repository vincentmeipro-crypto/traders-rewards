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

// ── Slugs produit V1 ──────────────────────────────────────────
// Ces slugs correspondent aux colonnes challenges.model pour les
// produits Apex EOD (rewards-25k / rewards-50k / rewards-100k).
const V1_PRODUCT_SLUGS = new Set(["rewards-25k", "rewards-50k", "rewards-100k"]);

// ── Détection V1 ──────────────────────────────────────────────

/**
 * Retourne true si le compte est un produit V1 Apex EOD.
 * Accepte uniquement la valeur dd_model string.
 * Préférer isV1Challenge() quand l'objet complet est disponible.
 */
export function isV1Product(ddModel: string | null | undefined): boolean {
  return ddModel === V1_DD_MODEL;
}

/**
 * Détection V1 robuste — lit dans l'ordre :
 *  1. challenges.dd_model        (colonne directe, présente si peuplée)
 *  2. rules_snapshot.rules.dd_model  (snapshot JSON de l'achat — toujours présent
 *     pour les achats Produit Engine ; c'est ici qu'est l'info réelle)
 *  3. challenges.model           (slug produit — fallback garanti)
 *
 * ROOT CAUSE historique : challenges.dd_model était NULL pour les
 * challenges créés avant que le POST /api/admin/challenges ne le peuple.
 * Utiliser cette fonction partout à la place de isV1Product(c.dd_model).
 */
export function isV1Challenge(c: {
  dd_model?:       string | null | undefined;
  rules_snapshot?: unknown;
  model?:          string | null | undefined;
}): boolean {
  if (c.dd_model === V1_DD_MODEL) return true;

  // Lire depuis le snapshot JSON (path Product Engine)
  const snap  = c.rules_snapshot as Record<string, unknown> | null | undefined;
  const rules = snap?.rules as Record<string, unknown> | undefined;
  if (rules?.dd_model === V1_DD_MODEL) return true;

  // Fallback sur le slug modèle (toujours fiable)
  if (c.model != null && V1_PRODUCT_SLUGS.has(c.model)) return true;

  return false;
}

// ── Niveau métier ─────────────────────────────────────────────

/**
 * Label canonique du niveau V1 (admin + dashboard).
 *
 * Mapping :
 *   phase1                           → "Challenger"
 *   phase=funded, paid=0             → "Compte Reward"   (en cours vers R#1)
 *   phase=funded, paid=1             → "Trader Reward #2"
 *   …
 *   phase=funded, paid=4             → "Trader Reward #5"
 *   paidCount ≥ 5 ou terminatedAt    → "Terminé"
 *   (status=failed géré en amont par l'appelant)
 */
export function getV1LevelLabel(
  phase: string,
  paidRewardsCount: number,
  terminatedAt?: string | null,
): string {
  if (terminatedAt) return "Terminé";
  const level = getTraderV1Level(phase, paidRewardsCount);
  if (level.terminated) return "Terminé";
  if (phase !== "funded") return "Challenger";
  const rn = level.nextRewardNumber;
  if (rn == null) return "Terminé";
  if (rn === 1)   return "Compte Reward";
  return `Trader Reward #${rn}`;
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
 * Challenger V1  → "AUCUNE"  (Apex EOD supprime la consistency)
 * Compte Reward  → "≤ 50%"   (was 33% pour les anciens contrats)
 */
export function getV1ConsistencyDisplay(_phase: string): string {
  return `≤ ${V1_CONSISTENCY_PCT.reward}%`;
}

// ── Constantes utiles ─────────────────────────────────────────

/** Nombre minimum de jours qualifiants pour le Compte Reward */
export const V1_QUAL_DAYS_MIN = V1_REWARD_QUAL.minQualifyingDays as number;

/** Nombre minimum de jours de trading pour le Challenge V1 */
export const V1_CHALLENGE_MIN_DAYS = V1_CHALLENGE.minTradingDays as number;

/** Durée max du challenge V1 en jours calendaires */
export const V1_CHALLENGE_MAX_DAYS = V1_CHALLENGE.maxTradingDays as number;

/** Objectif de profit Challenge V1 en % */
export const V1_CHALLENGE_PROFIT_PCT = V1_CHALLENGE.profitTargetPct as number;

/** Objectif de profit Compte Reward V1 en % */
export const V1_REWARD_PROFIT_PCT = V1_REWARD_QUAL.profitTargetPct as number;

/** Nombre maximum de Rewards dans le parcours V1 */
export const V1_MAX = V1_MAX_REWARDS as number;
