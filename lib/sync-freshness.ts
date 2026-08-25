/**
 * TRADERS REWARDS — Sync Freshness Helper
 *
 * Determines data freshness from challenges.last_synced_at.
 *
 * IMPORTANT: Never expose internal infrastructure in user-facing labels.
 * "VPS", "MT5 server", "déconnecté" — NEVER shown to traders.
 * Pure TypeScript — client-safe.
 */

export type FreshnessState = "live" | "recent" | "old" | "stale" | "unknown";

export interface FreshnessInfo {
  state:   FreshnessState;
  label:   string;   // EN
  labelFr: string;   // FR
  /** True when data is likely outdated and should not be presented as live */
  isStale: boolean;
  /**
   * Accent color.
   * - Green  (<5 min): just synced
   * - Blue   (5–60 min): normal, no concern
   * - Amber  (>60 min): show staleness without alarming
   * RED is NEVER used here — red is reserved for real risk violations (DD breach).
   */
  color: string;
}

/**
 * Returns freshness info for a given last_synced_at timestamp.
 *
 * Thresholds:
 *   < 5 min  → "Données synchronisées"
 *   5–60 min → "Dernière synchronisation : X min"
 *   1–6 h    → "Dernière synchronisation : X h"
 *   > 6 h    → "Données de compte non synchronisées récemment"
 *   unknown  → "Synchronisation en attente"
 */
export function getSyncFreshness(
  lastSyncedAt: string | undefined | null,
): FreshnessInfo {
  if (!lastSyncedAt) {
    return {
      state:   "unknown",
      label:   "Sync pending",
      labelFr: "Synchronisation en attente",
      isStale: false,
      color:   "#9CCFEA",
    };
  }

  const minutes = Math.max(
    0,
    (Date.now() - new Date(lastSyncedAt).getTime()) / 60_000,
  );

  if (minutes < 5) {
    return {
      state:   "live",
      label:   "Data synchronized",
      labelFr: "Données synchronisées",
      isStale: false,
      color:   "#22c55e",
    };
  }

  if (minutes < 60) {
    const m = Math.floor(minutes);
    return {
      state:   "recent",
      label:   `Last sync: ${m} min`,
      labelFr: `Dernière synchronisation : ${m} min`,
      isStale: false,
      color:   "#9CCFEA",
    };
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 6) {
    return {
      state:   "old",
      label:   `Last sync: ${hours}h`,
      labelFr: `Dernière synchronisation : ${hours} h`,
      isStale: true,
      color:   "#f59e0b",
    };
  }

  return {
    state:   "stale",
    label:   "Account data not recently synchronized",
    labelFr: "Données de compte non synchronisées récemment",
    isStale: true,
    color:   "#f59e0b",
  };
}
