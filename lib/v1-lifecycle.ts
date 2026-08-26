/**
 * ============================================================
 * TRADERS REWARDS V1 — Lifecycle helpers (TypeScript pur)
 * ============================================================
 *
 * Fonctions PURES sans import Supabase / MT5 / mailer.
 * Utilisées par les crons et routes pour décider du lifecycle
 * Challenge → Reward Account → R#1 à R#5 → Terminated.
 *
 * Groupes MT5 utilisés (ceux existants dans lib/mt5.ts GROUP_MAP) :
 *   Challenge   → HAR/MAN32/demoG2  (1-step challenge)
 *   Reward Acct → HAR/MAN32/demoG4  (funded 1-step) ← MÊME pendant tout R#1–R#5
 *   Terminé     → HAR/MAN32/demoG5  (désactivé)
 *
 * Discriminant V1 : challenges.dd_model = 'trailing_eod_lock'
 *
 * Séquence lifecycle :
 *   J0 (trading) : challenge passe → status='passed', challenge_passed_at=now()
 *   J+1 (cron)   : conversion → reset profit MT5 + changement groupe + status='funded'
 *   R#1 à R#5   : payouts successifs, même compte, pas de reset balance
 *   R#5 payé    : terminate → disable MT5 + groupe demoG5 + terminated_at=now()
 * ============================================================
 */

import {
  V1_DD_MODEL,
  V1_CHALLENGE,
  V1_MAX_REWARDS,
} from "./v1-engine";

// ── Constantes groupe MT5 ─────────────────────────────────────

/** Groupe MT5 pour le Reward Account V1 (= funded 1-step — demoG4) */
export const V1_REWARD_MT5_GROUP  = "HAR/MAN32/demoG4" as const;

/** Groupe MT5 pour les comptes désactivés / terminés */
export const V1_DISABLED_MT5_GROUP = "HAR/MAN32/demoG5" as const;

// ── Discriminant V1 ───────────────────────────────────────────

/**
 * Retourne true si le challenge est un compte V1 Apex EOD.
 * Source unique — ne pas hardcoder 'trailing_eod_lock' ailleurs.
 */
export function isV1Challenge(ddModel: string | null | undefined): boolean {
  return ddModel === V1_DD_MODEL;
}

// ── Journée de trading ────────────────────────────────────────

/**
 * Retourne le début de la journée de trading courante (22:00 UTC).
 *
 * Règle broker : la journée de trading commence à 22:00 UTC.
 *   - Si now < 22:00 UTC → le début est la veille à 22:00 UTC
 *   - Si now ≥ 22:00 UTC → le début est aujourd'hui à 22:00 UTC
 *
 * @param now  Date de référence (défaut : maintenant)
 */
export function getCurrentTradingDayStart(now: Date = new Date()): Date {
  const d = new Date(now);
  if (d.getUTCHours() < 22) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  d.setUTCHours(22, 0, 0, 0);
  return d;
}

// ── Pass du challenge ─────────────────────────────────────────

/**
 * Retourne true si le profit cible du Challenge V1 est atteint.
 *
 * Apex EOD — Challenge : 0 jours minimum, pas de consistency.
 * Cible = +6 % du capital initial.
 *
 * NB : la vérification breach (DD) est séparée (faite en amont).
 *
 * @param currentBalance  Balance courante en USD
 * @param startBalance    Capital initial en USD
 * @param baseTargetPct   Cible % (défaut V1_CHALLENGE.profitTargetPct = 6)
 */
export function isV1ProfitTargetMet(
  currentBalance: number,
  startBalance:   number,
  baseTargetPct:  number = V1_CHALLENGE.profitTargetPct,
): boolean {
  if (startBalance <= 0) return false;
  const profitPct = ((currentBalance - startBalance) / startBalance) * 100;
  return profitPct >= baseTargetPct;
}

// ── Éligibilité à la conversion (lendemain) ───────────────────

/**
 * Paramètres de challenge nécessaires pour tester l'éligibilité à la conversion.
 */
export interface V1ConversionEligibilityParams {
  /** Statut actuel du challenge ('passed' requis) */
  status: string;
  /** Horodatage du passage du challenge (NULL = pas encore passé) */
  challengePassedAt: string | null | undefined;
  /** Horodatage de la conversion (NULL = pas encore converti) */
  rewardConvertedAt: string | null | undefined;
  /** Statut de la conversion pour idempotence ('converting' = en cours ailleurs) */
  rewardConversionStatus: string | null | undefined;
  /** Début de la journée de trading courante (22:00 UTC) */
  currentTradingDayStart: Date;
}

/**
 * Retourne true si le challenge V1 est éligible à la conversion → Reward Account.
 *
 * Conditions (toutes requises simultanément) :
 *  1. status = 'passed'
 *  2. challenge_passed_at IS NOT NULL
 *  3. reward_converted_at IS NULL (pas encore converti)
 *  4. reward_conversion_status != 'converting' (pas en cours dans un autre process)
 *  5. passed_at < current_trading_day_start (challenge réussi sur une journée PRÉCÉDENTE)
 *
 * La condition 5 garantit que la bascule se fait au plus tôt le lendemain.
 */
export function isV1ConversionEligible(
  params: V1ConversionEligibilityParams,
): boolean {
  const {
    status,
    challengePassedAt,
    rewardConvertedAt,
    rewardConversionStatus,
    currentTradingDayStart,
  } = params;

  // 1. Doit être en statut 'passed'
  if (status !== "passed") return false;

  // 2. Doit avoir un horodatage de passage
  if (!challengePassedAt) return false;

  // 3. Pas encore converti
  if (rewardConvertedAt) return false;

  // 4. Pas en cours dans un autre process (idempotence)
  if (rewardConversionStatus === "converting") return false;

  // 5. Le passage doit être antérieur au début de la journée de trading courante
  const passedAtDate = new Date(challengePassedAt);
  return passedAtDate < currentTradingDayStart;
}

// ── Montant à retirer lors de la conversion ───────────────────

/**
 * Calcule le montant à retirer de MT5 lors de la bascule Challenge → Reward Account.
 *
 * "Remettre à zéro" = PROFIT = 0, donc balance = capital initial.
 * Withdraw = currentBalance − startBalance (uniquement si positif).
 *
 * Exemples :
 *   currentBalance=26500, startBalance=25000 → withdraw=1500
 *   currentBalance=25000, startBalance=25000 → withdraw=0
 *   currentBalance=25100, startBalance=25000 → withdraw=100
 *
 * @param currentBalance  Balance MT5 actuelle (avant retrait)
 * @param startBalance    Capital initial du challenge (25000/50000/100000)
 */
export function computeV1ChallengeResetWithdrawal(
  currentBalance: number,
  startBalance:   number,
): number {
  const profit = currentBalance - startBalance;
  return Math.max(0, parseFloat(profit.toFixed(2)));
}

// ── Montant retiré lors d'une Reward ─────────────────────────

/**
 * Calcule le montant à retirer de MT5 pour un paiement de Reward V1.
 *
 * Pour les Rewards #1 à #5 : on retire UNIQUEMENT le montant de la Reward,
 * PAS tout le profit (pas de reset au capital initial entre les Rewards).
 *
 * postBalance = preBalance - rewardAmount (hors MT5 withdrawal)
 *
 * @param rewardAmount  Montant de la Reward à verser (en USD)
 */
export function computeV1RewardWithdrawal(rewardAmount: number): number {
  return Math.max(0, parseFloat(rewardAmount.toFixed(2)));
}

// ── Termination (après R#5) ───────────────────────────────────

/**
 * Retourne true si le parcours Reward est terminé (≥ V1_MAX_REWARDS Rewards payées).
 *
 * Après le Reward #5 (paidRewardsCount = 5) :
 *  - Le compte doit être désactivé définitivement.
 *  - Aucun Reward #6 n'est possible.
 *
 * @param paidRewardsCount  Nombre de payouts avec status='paid' sur ce challenge
 */
export function isV1Terminated(paidRewardsCount: number): boolean {
  return paidRewardsCount >= V1_MAX_REWARDS;
}

/**
 * Retourne true si un Reward supplémentaire est bloqué (Reward #6 impossible).
 * Alias sémantique de isV1Terminated pour les guards de payout.
 */
export function isV1NextRewardBlocked(paidRewardsCount: number): boolean {
  return paidRewardsCount >= V1_MAX_REWARDS;
}

// ── Calcul du numéro de Reward suivant ───────────────────────

/**
 * Retourne le numéro de la prochaine Reward (1 à 5), ou null si parcours terminé.
 *
 * @param paidRewardsCount  Nombre de Rewards déjà payées (0 = aucune)
 */
export function getV1NextRewardNumber(paidRewardsCount: number): number | null {
  if (paidRewardsCount >= V1_MAX_REWARDS) return null;
  return paidRewardsCount + 1;
}

// ── Type de résultat de la vérification de conversion ────────

/**
 * Résultat d'une tentative de conversion Challenge → Reward Account.
 */
export interface V1ConversionResult {
  /** true si la conversion a réussi (ou était déjà faite — idempotent) */
  success: boolean;
  /** 'done' = succès, 'error' = erreur MT5, 'skipped' = déjà converti / non éligible */
  status: "done" | "error" | "skipped";
  /** Message descriptif */
  reason: string;
  /** Login MT5 utilisé (inchangé — même pendant tout le parcours R#1–R#5) */
  mt5Login?: number;
}

// ── Label lisible du statut de conversion ────────────────────

/**
 * Retourne un label lisible pour le statut de conversion.
 */
export function getV1ConversionStatusLabel(
  rewardConversionStatus: string | null | undefined,
): string {
  switch (rewardConversionStatus) {
    case "done":       return "Converti en Reward Account";
    case "converting": return "Conversion en cours…";
    case "error":      return "Erreur de conversion — retry en cours";
    case "pending":    return "En attente de conversion";
    default:           return "Non converti";
  }
}
