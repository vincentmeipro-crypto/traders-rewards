/**
 * TRADERS REWARDS — Contract Rules Helper
 *
 * Extracts contractual rules from challenges.rules_snapshot with layered fallbacks.
 * Pure TypeScript — no server-side imports — safe for Client Components.
 *
 * Priority:
 *   1. rules_snapshot (immutable, built at purchase time by buildRulesSnapshot)
 *   2. challenges.* direct columns (fallback for old rows without snapshot)
 *   3. Hardcoded last resort only
 */

// ── Snapshot phase shape ──────────────────────────────────────────────────────

export interface SnapshotPhase {
  order:            number;
  label:            string;
  type:             string;        // "challenge" | "funded"
  profit_target:    number | null; // null for funded
  daily_drawdown:   number;
  total_drawdown:   number;
  min_trading_days: number;
  max_trading_days: number | null;
  profit_split:     number | null; // null for challenge phases
}

// ── Raw snapshot shape ────────────────────────────────────────────────────────

interface RawSnapshot {
  product_id?:       string;
  product_slug?:     string;
  product_name?:     string;
  model?:            string;
  account_size?:     string;
  balance_usd?:      number;
  price_paid_cents?: number;
  leverage?:         number;
  phases?:           SnapshotPhase[];
  rules?:            Record<string, unknown>;
  snapshot_at?:      string;
}

function parseRawSnapshot(raw: unknown): RawSnapshot | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as RawSnapshot;
}

// ── Phase resolution ──────────────────────────────────────────────────────────

function findSnapshotPhase(
  phases: SnapshotPhase[],
  challengePhase: string,
): SnapshotPhase | null {
  if (challengePhase === "phase1")
    return phases.find((p) => p.order === 1 && p.type === "challenge") ?? null;
  if (challengePhase === "phase2")
    return phases.find((p) => p.order === 2 && p.type === "challenge") ?? null;
  if (challengePhase === "funded")
    return phases.find((p) => p.type === "funded") ?? null;
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface ContractRules {
  /** Whether a valid snapshot was found */
  hasSnapshot: boolean;
  /** All phases from the snapshot */
  allPhases: SnapshotPhase[];
  /** Phase matching challenge.phase */
  currentPhase: SnapshotPhase | null;
  /** The funded phase (for profit_split) */
  fundedPhase: SnapshotPhase | null;
  /** Minimum trading days for the current phase — never null */
  minTradingDays: number;
  /** Profit split % for the funded phase (e.g. 80), or null */
  profitSplit: number | null;
  /** Account leverage from the snapshot, or null */
  leverage: number | null;
  /**
   * Best day rule value as a string (e.g. "50%"), or null.
   * Present only when the challenge contractually has this rule.
   * Never invent it — only show when explicitly in snapshot.rules.
   */
  bestDayRule: string | null;
  /** All raw rules as a key/value map */
  rules: Record<string, unknown>;
}

export interface ChallengeForRules {
  phase:                string;
  model:                string;
  daily_drawdown_limit: number;
  total_drawdown_limit: number;
  profit_target:        number;
  trading_days:         number;
}

/**
 * Extracts contractual rules from rules_snapshot with layered fallbacks.
 *
 * Fallback order for min_trading_days:
 *   1. snapshot.phases[currentPhase].min_trading_days
 *   2. Hardcoded: 5 (challenge) / 7 (funded)
 */
export function extractContractRules(
  rulesSnapshot: unknown,
  challenge: ChallengeForRules,
): ContractRules {
  const snap = parseRawSnapshot(rulesSnapshot);
  const hasSnapshot =
    snap != null &&
    Array.isArray(snap.phases) &&
    snap.phases.length > 0;

  const allPhases: SnapshotPhase[] = hasSnapshot ? (snap!.phases ?? []) : [];
  const rulesMap: Record<string, unknown> =
    hasSnapshot && snap!.rules ? snap!.rules! : {};

  const currentPhase = hasSnapshot
    ? findSnapshotPhase(allPhases, challenge.phase)
    : null;

  const fundedPhase = hasSnapshot
    ? (allPhases.find((p) => p.type === "funded") ?? null)
    : null;

  // min_trading_days: snapshot → hardcoded fallback
  const minTradingDays =
    currentPhase?.min_trading_days ??
    (challenge.phase === "funded" ? 7 : 5);

  // profit_split from funded phase
  const profitSplit = fundedPhase?.profit_split ?? null;

  // leverage from snapshot root
  const leverage =
    hasSnapshot && snap!.leverage != null ? snap!.leverage! : null;

  // best_day_rule: string like "50%" or number → formatted string, or null
  const rawBestDay = rulesMap["best_day_rule"];
  const bestDayRule =
    typeof rawBestDay === "string"
      ? rawBestDay
      : typeof rawBestDay === "number"
        ? `${rawBestDay}%`
        : null;

  return {
    hasSnapshot,
    allPhases,
    currentPhase,
    fundedPhase,
    minTradingDays,
    profitSplit,
    leverage,
    bestDayRule,
    rules: rulesMap,
  };
}
