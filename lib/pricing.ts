/**
 * ============================================================
 * lib/pricing.ts — Source de vérité unique pour les prix Traders Rewards
 * ============================================================
 * Offre A dès le 18 septembre, rotation A/B/C dès octobre, nouvelle grille en janvier 2027.
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

/** Q4 : semaines de sept jours à partir du 1er octobre 2026 à Paris. */
export const PROMOTIONS_Q4_2026 = [
  { name: "A", unitDiscount: 75, packDiscount: 85 },
  { name: "B", unitDiscount: 65, packDiscount: 75 },
  { name: "C", unitDiscount: 55, packDiscount: 65 },
] as const;

/** Scénario 1 : semaines de sept jours à partir du 1er janvier 2027 à Paris. */
export const PROMOTIONS_2027 = [
  { name: "A", unitDiscount: 65, packDiscount: 70 },
  { name: "B", unitDiscount: 60, packDiscount: 65 },
  { name: "C", unitDiscount: 55, packDiscount: 60 },
] as const;

export function getScheduledPromotion(now: Date = new Date()) {
  const { year, month, day } = toParisDate(now);
  const is2027 = year >= 2027;
  const anchor = is2027 ? Date.UTC(2027, 0, 1) : Date.UTC(2026, 9, 1);
  const promotions = is2027 ? PROMOTIONS_2027 : PROMOTIONS_Q4_2026;
  const days = Math.floor((Date.UTC(year, month - 1, day) - anchor) / 86400000);
  if (days < 0) {
    if (year === 2026 && month === 9 && day >= 18) {
      return { ...PROMOTIONS_Q4_2026[0], endsOn: "30/09/2026" };
    }
    return null;
  }
  const week = Math.floor(days / 7);
  const end = new Date(Math.min(anchor + (week * 7 + 6) * 86400000,
    is2027 ? Infinity : Date.UTC(2026, 11, 31)));
  const endsOn = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(end);
  return { ...promotions[week % promotions.length], endsOn };
}

// Tarifs historiques avant l'activation de l'offre le 18 septembre 2026.
const PRE_LAUNCH_PERIOD: PricingPeriod = {
  name: "pre-launch",
  fromYear: 2026, fromMonth: 1, fromDay: 1,
  toYear: 2026, toMonth: 9, toDay: 17,
  prices: {
    "rewards-25k": { unit: 3800, pack3: 5700 },
    "rewards-50k": { unit: 5800, pack3: 8700 },
    "rewards-100k": { unit: 11800, pack3: 17700 },
  },
};

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

/** Prix de pré-lancement avant octobre, puis rotation hebdomadaire A/B/C.
 * La rotation repart de A le 1er janvier 2027 avec la nouvelle grille.
 */
export function getActivePeriod(now: Date = new Date()): PricingPeriod {
  const { year, month, day } = toParisDate(now);
  const promotion = getScheduledPromotion(now);
  if (promotion) {
    const prices = Object.fromEntries(
      Object.entries(REF_PRICES).map(([slug, ref]) => [slug, {
        unit: Math.round(ref.unit * (100 - promotion.unitDiscount) / 100),
        pack3: Math.round(ref.pack3 * (100 - promotion.packDiscount) / 100),
      }])
    ) as Record<PricingSlug, PriceEntry>;
    return { name: `weekly-${promotion.name}`, fromYear: year, fromMonth: month, fromDay: day,
      toYear: year, toMonth: month, toDay: day, prices };
  }
  return PRE_LAUNCH_PERIOD;
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
