/**
 * ============================================================
 * lib/pricing.ts — Source de vérité unique pour les prix Traders Rewards
 * ============================================================
 * Calendrier promotionnel oct-déc 2026.
 * Importé par : api/products, api/stripe/checkout, api/crypto/checkout,
 *               api/stripe/webhook, api/crypto/webhook, frontend via /api/products.
 *
 * RÈGLES :
 *  - Toutes les périodes sont évaluées en Europe/Paris (UTC+1/UTC+2 selon DST).
 *  - Les frontières changent à minuit heure de Paris.
 *  - Frontend et backend importent la même fonction → même prix garanti partout.
 *  - "pack3" = 3 challenges de même taille, tarif propre (≠ 3 × unitaire).
 *  - Ne JAMAIS faire confiance au prix envoyé par le frontend : toujours
 *    recalculer server-side via getPriceForSlug(slug, quantity).
 * ============================================================
 */

export type PricingSlug = "rewards-25k" | "rewards-50k" | "rewards-100k";

export interface PriceEntry {
  /** Prix unitaire en centimes (1 challenge) */
  unit:  number;
  /** Prix pack ×3 en centimes (3 challenges, tarif propre) */
  pack3: number;
}

interface PricingPeriod {
  name:      string;
  fromYear:  number; // inclus
  fromMonth: number; // 1–12, inclus
  fromDay:   number; // 1–31, inclus
  toYear:    number; // inclus
  toMonth:   number; // 1–12, inclus
  toDay:     number; // 1–31, inclus
  prices:    Record<PricingSlug, PriceEntry>;
}

// ── Prix de référence barrés (affichage uniquement) ───────────────────────────
export const REF_PRICES: Record<PricingSlug, PriceEntry> = {
  "rewards-25k":  { unit: 19000, pack3:  57000 }, // 190€  /  570€
  "rewards-50k":  { unit: 29000, pack3:  87000 }, // 290€  /  870€
  "rewards-100k": { unit: 59000, pack3: 177000 }, // 590€  / 1 770€
};

// ── Calendrier promotionnel 2026 ──────────────────────────────────────────────
export const PRICING_PERIODS: PricingPeriod[] = [
  // Période 1 — 1 au 15 octobre 2026
  {
    name:      "oct-1-15",
    fromYear: 2026, fromMonth: 10, fromDay:  1,
    toYear:   2026, toMonth:   10, toDay:   15,
    prices: {
      "rewards-25k":  { unit:  3800, pack3:  5700 }, //  38€ /  57€
      "rewards-50k":  { unit:  5800, pack3:  8700 }, //  58€ /  87€
      "rewards-100k": { unit: 11800, pack3: 17700 }, // 118€ / 177€
    },
  },
  // Période 2 — 16 octobre au 15 novembre 2026
  {
    name:      "oct-16-nov-15",
    fromYear: 2026, fromMonth: 10, fromDay: 16,
    toYear:   2026, toMonth:   11, toDay:   15,
    prices: {
      "rewards-25k":  { unit:  5700, pack3: 11400 }, //  57€ / 114€
      "rewards-50k":  { unit:  8700, pack3: 17400 }, //  87€ / 174€
      "rewards-100k": { unit: 17700, pack3: 35400 }, // 177€ / 354€
    },
  },
  // Période 3 — 16 novembre au 15 décembre 2026
  {
    name:      "nov-16-dec-15",
    fromYear: 2026, fromMonth: 11, fromDay: 16,
    toYear:   2026, toMonth:   12, toDay:   15,
    prices: {
      "rewards-25k":  { unit:  7600, pack3: 17100 }, //  76€ / 171€
      "rewards-50k":  { unit: 11600, pack3: 26100 }, // 116€ / 261€
      "rewards-100k": { unit: 23600, pack3: 53100 }, // 236€ / 531€
    },
  },
  // Période 4 — 16 au 31 décembre 2026
  {
    name:      "dec-16-31",
    fromYear: 2026, fromMonth: 12, fromDay: 16,
    toYear:   2026, toMonth:   12, toDay:   31,
    prices: {
      "rewards-25k":  { unit:  9500, pack3: 22800 }, //  95€ / 228€
      "rewards-50k":  { unit: 14500, pack3: 34800 }, // 145€ / 348€
      "rewards-100k": { unit: 29500, pack3: 70800 }, // 295€ / 708€
    },
  },
];

/**
 * Retourne le {year, month, day} dans le fuseau Europe/Paris pour une date UTC.
 * Garantit que frontend et backend évaluent les frontières de manière identique.
 */
function toParisDate(utcDate: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
  }).formatToParts(utcDate);
  const get = (t: string) =>
    parseInt(parts.find(p => p.type === t)?.value ?? "0", 10);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Convertit année/mois/jour en entier comparable : 20261015 = 2026-10-15. */
function ymd(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}

/**
 * Retourne la période promotionnelle active pour une date donnée (heure Paris).
 *
 * Comportement hors plages définies (toutes liées à 2026) :
 *  - Avant le 1er oct 2026 → retourne la période 1 (prix d'entrée les plus bas).
 *  - Après le 31 déc 2026  → retourne la période 4 (dernière connue).
 */
export function getActivePeriod(now: Date = new Date()): PricingPeriod {
  const { year, month, day } = toParisDate(now);
  const cur = ymd(year, month, day);

  for (const p of PRICING_PERIODS) {
    const from = ymd(p.fromYear, p.fromMonth, p.fromDay);
    const to   = ymd(p.toYear,   p.toMonth,   p.toDay);
    if (cur >= from && cur <= to) return p;
  }

  // Avant la première période → retourner la première
  const firstFrom = ymd(
    PRICING_PERIODS[0].fromYear, PRICING_PERIODS[0].fromMonth, PRICING_PERIODS[0].fromDay
  );
  if (cur < firstFrom) return PRICING_PERIODS[0];

  // Après la dernière période (ou entre des périodes) → retourner la dernière
  return PRICING_PERIODS[PRICING_PERIODS.length - 1];
}

/**
 * Retourne le prix en centimes pour un slug et une quantité donnés.
 *  - quantity=1 → prix unitaire
 *  - quantity=3 → prix pack ×3 (tarif propre, ≠ 3 × unitaire)
 *
 * SÉCURITÉ : appelé uniquement server-side dans les routes de checkout et de webhook.
 * Le frontend obtient les prix via /api/products, jamais via cette fonction directement.
 */
export function getPriceForSlug(
  slug:     PricingSlug,
  quantity: 1 | 3,
  now:      Date = new Date()
): number {
  const period = getActivePeriod(now);
  const entry  = period.prices[slug];
  return quantity === 3 ? entry.pack3 : entry.unit;
}

/**
 * Retourne le plan de prix complet de la période active.
 * Utilisé par /api/products pour exposer les prix au frontend.
 */
export function getActivePricingPlan(now: Date = new Date()): {
  periodName: string;
  prices:     Record<PricingSlug, PriceEntry>;
} {
  const p = getActivePeriod(now);
  return { periodName: p.name, prices: p.prices };
}

/** Type-guard : vérifie que le slug est un PricingSlug valide. */
export function isPricingSlug(slug: string): slug is PricingSlug {
  return slug === "rewards-25k" || slug === "rewards-50k" || slug === "rewards-100k";
}
