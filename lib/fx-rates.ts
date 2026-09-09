/**
 * ============================================================
 * lib/fx-rates.ts — Taux de change EUR-base, partagé client/server
 * ============================================================
 * Importé par :
 *  - app/api/fx-rates/route.ts           (exposition frontend)
 *  - app/api/checkout/preview/route.ts   (snapshot taux serveur)
 *  - lib/CurrencyContext.tsx             (contexte React client)
 *  - app/api/stripe/checkout/route.ts    (conversion Stripe)
 *  - app/api/crypto/checkout/route.ts    (conversion NOWPayments)
 * ============================================================
 */

export type FxCurrency = "EUR" | "USD" | "GBP" | "CZK" | "CAD" | "AUD" | "CHF";

export const SUPPORTED_CURRENCIES: FxCurrency[] = [
  "USD", "EUR", "GBP", "CHF", "CAD", "AUD", "CZK",
];

/** Taux de repli (EUR base) — mis à jour périodiquement dans le code */
export const FALLBACK_RATES: Record<FxCurrency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.86,
  CZK: 25.2,
  CAD: 1.47,
  AUD: 1.65,
  CHF: 0.95,
};

// ── Métadonnées d'affichage (partagées client + serveur) ──────────────────────

export const CURRENCY_DISPLAY: Record<
  FxCurrency,
  { symbol: string; position: "prefix" | "suffix"; flag: string }
> = {
  USD: { symbol: "$",    position: "prefix", flag: "🇺🇸" },
  EUR: { symbol: "€",    position: "prefix", flag: "🇪🇺" },
  GBP: { symbol: "£",    position: "prefix", flag: "🇬🇧" },
  CHF: { symbol: "CHF ", position: "prefix", flag: "🇨🇭" },
  CAD: { symbol: "CA$",  position: "prefix", flag: "🇨🇦" },
  AUD: { symbol: "A$",   position: "prefix", flag: "🇦🇺" },
  CZK: { symbol: " Kč",  position: "suffix", flag: "🇨🇿" },
};

/**
 * Séparateur milliers sans dépendance ICU (safe server + client).
 * Ex: 1460 → "1 460"
 */
function czFormatInt(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/**
 * Formate un montant (unité principale, déjà arrondi) dans la devise cible.
 * Utilisable côté serveur ET client.
 * Ex: formatCurrencyAmount(63, "USD") → "$63"
 *     formatCurrencyAmount(1460, "CZK") → "1 460 Kč"
 */
export function formatCurrencyAmount(amount: number, currency: FxCurrency): string {
  const { symbol, position } = CURRENCY_DISPLAY[currency];
  const rounded = Math.round(amount);
  const str = currency === "CZK" ? czFormatInt(rounded) : rounded.toString();
  return position === "prefix" ? `${symbol}${str}` : `${str}${symbol}`;
}

// ── NOWPayments — devises fiat supportées comme price_currency ────────────────

/**
 * Devises acceptées par NOWPayments dans le champ price_currency.
 * Source : docs.nowpayments.io (sept. 2026)
 * CZK absent → fallback EUR automatique dans /api/crypto/checkout.
 */
export const NOWPAYMENTS_FIAT_SUPPORTED: FxCurrency[] = [
  "USD", "EUR", "GBP", "AUD", "CAD", "CHF",
];

// ── Fonctions mathématiques ───────────────────────────────────────────────────

/**
 * Arrondi commercial :
 *  - CZK → multiple de 5 le plus proche (ex: 1461.6 → 1460)
 *  - Autres → entier le plus proche
 */
export function commercialRound(amount: number, currency: FxCurrency): number {
  if (currency === "CZK") return Math.round(amount / 5) * 5;
  return Math.round(amount);
}

/**
 * Convertit des centimes EUR en unité principale de la devise cible (arrondi commercial).
 * ex: 5800 EUR cents, taux 1.08 → 63 USD
 */
export function convertEurCents(
  eurCents: number,
  currency: FxCurrency,
  rate: number
): number {
  return commercialRound((eurCents / 100) * rate, currency);
}

/**
 * Montant en plus petite unité Stripe — toutes nos devises ont 2 décimales.
 * ex: 63 USD → 6300 (cents) ; 1460 CZK → 146000 (haler)
 */
export function stripeSmallestUnit(
  eurCents: number,
  currency: FxCurrency,
  rate: number
): number {
  return convertEurCents(eurCents, currency, rate) * 100;
}

// ── Taux live (server-side only) ──────────────────────────────────────────────

/**
 * Récupère les taux live depuis api.frankfurter.app.
 * Next.js met en cache ce fetch 1h (data cache partagé entre toutes les routes).
 * → preview/route.ts et stripe/route.ts voient TOUJOURS le même taux dans le même créneau.
 * En cas d'erreur réseau, retourne FALLBACK_RATES.
 */
export async function fetchLiveRates(): Promise<Record<FxCurrency, number>> {
  try {
    const others = SUPPORTED_CURRENCIES.filter(c => c !== "EUR").join(",");
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=EUR&to=${others}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { rates: Record<string, number> };
    return { EUR: 1, ...data.rates } as Record<FxCurrency, number>;
  } catch {
    return { ...FALLBACK_RATES };
  }
}
