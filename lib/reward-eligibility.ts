import {
  getV1RewardCap,
  getV1QualifyingDayMinUsd,
  V1_REWARD_QUAL,
  V1_CONSISTENCY_PCT,
  getTraderV1Level,
} from "./v1-engine";

export type RewardEligibility = {
  eligible:       boolean;
  maximum:        number;
  /** Plancher effectif = start_balance (toujours, R1 à R5) */
  floor:          number;
  qualifyingDays: number;
  consistency:    number | null;
  rewardNumber:   number | null;
  reasons:        string[];
};

/**
 * Évalue les conditions d'éligibilité pour une Reward V1.
 *
 * ── Plancher canonique ────────────────────────────────────────
 *   floor = start_balance (pour R1 à R5).
 *   - R1 : anticipe le verrouillage du plancher post-paiement (CAS B).
 *   - R2-R5 : plancher déjà fixé depuis R1.
 *
 * ── Montant retirable (SOURCE CANONIQUE) ─────────────────────
 *   available = min(balance, equity) − start_balance
 *     (profit total non retiré ; la balance MT5 reflète déjà les retraits)
 *   maximum   = min(available, cap_du_niveau)
 *
 * ── Condition "floor" ─────────────────────────────────────────
 *   maximum < 100 $ → raison "floor" (montant insuffisant pour la demande)
 *   ⚠️  AUCUN seuil "trailingLockBalance + cap" n'intervient ici.
 *       Le cap sert UNIQUEMENT à plafonner le maximum retirable.
 *
 * ── dailyProfits ──────────────────────────────────────────────
 *   Doit couvrir UNIQUEMENT le cycle en cours :
 *   depuis paid_at du dernier Reward payé (ou reward_converted_at si aucun).
 *   Le filtrage est effectué côté serveur (reward-eligibility-server.ts).
 */
export function evaluateReward(input: {
  start:        number;
  balance:      number;
  equity:       number;
  phase:        string;
  status:       string;
  paidCount:    number;
  terminated:   boolean;
  pending:      boolean;
  kyc:          boolean;
  /** Profits journaliers du cycle courant (filtrés depuis le dernier paiement) */
  dailyProfits: number[];
}): RewardEligibility {
  // ── Niveau et prochain numéro de Reward ──────────────────────────────────
  const level = getTraderV1Level(input.phase, input.paidCount);

  // ── Plancher canonique : toujours start_balance pour R1-R5 ───────────────
  const floor = input.start;

  // ── Cap du niveau ────────────────────────────────────────────────────────
  const cap = level.nextRewardNumber == null
    ? 0
    : (getV1RewardCap(input.start, level.nextRewardNumber) ?? 0);

  // ── Montant retirable ────────────────────────────────────────────────────
  // available = min(balance, equity) − start_balance
  // maximum   = min(available, cap)
  // Le cap PLAFONNE le maximum, il n'est PAS un seuil d'accès.
  const balanceEq = Math.min(input.balance, input.equity);
  const available = Math.max(0, Math.floor((balanceEq - floor) * 100 + 1e-7) / 100);
  const maximum   = cap > 0 ? Math.min(available, cap) : 0;

  // ── Consistance (cycle en cours) ─────────────────────────────────────────
  // dailyProfits est filtré côté serveur depuis paid_at du dernier paiement.
  const total       = input.dailyProfits.reduce((a, b) => a + b, 0);
  const consistency = total > 0
    ? Math.max(0, ...input.dailyProfits) / total * 100
    : null;

  // ── Jours qualifiants (cycle en cours) ──────────────────────────────────
  const qualifyingDayMin = getV1QualifyingDayMinUsd(input.start);
  const qualifyingDays   = input.dailyProfits.filter(p => p >= qualifyingDayMin).length;

  // ── Motifs d'inéligibilité ───────────────────────────────────────────────
  const reasons: string[] = [];
  if (![25000, 50000, 100000].includes(input.start))                             reasons.push("unsupported");
  if (input.phase !== "funded" || !["active", "funded"].includes(input.status))  reasons.push("inactive");
  if (input.terminated || level.terminated)                                       reasons.push("terminated");
  if (input.pending)                                                              reasons.push("pending");
  if (!input.kyc)                                                                 reasons.push("kyc");
  if (![input.balance, input.equity, ...input.dailyProfits].every(Number.isFinite)) reasons.push("unavailable");
  if (qualifyingDays < V1_REWARD_QUAL.minQualifyingDays)                         reasons.push("days");
  if (consistency == null || consistency > V1_CONSISTENCY_PCT.reward)            reasons.push("consistency");
  // Montant insuffisant : available < 100$ (minimum absolu de retrait)
  if (maximum < 100)                                                              reasons.push("floor");

  return {
    eligible:       reasons.length === 0,
    maximum:        Number.isFinite(maximum) ? maximum : 0,
    floor,
    qualifyingDays,
    consistency,
    rewardNumber:   level.nextRewardNumber,
    reasons,
  };
}

/**
 * Valide qu'un montant de Reward est acceptable.
 *
 * Règles :
 *  - nombre fini
 *  - ≥ 100 (minimum absolu)
 *  - ≤ maximum (calculé par evaluateReward)
 *  - centimes exacts (pas de fraction < 0,01 $)
 */
export function validRewardAmount(amount: unknown, maximum: number): amount is number {
  return (
    typeof amount === "number" &&
    Number.isFinite(amount) &&
    amount >= 100 &&
    amount <= maximum &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7
  );
}
