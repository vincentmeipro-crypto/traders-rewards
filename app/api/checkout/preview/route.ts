/**
 * POST /api/checkout/preview
 * ============================================================
 * Retourne le prix final calculé CÔTÉ SERVEUR dans la devise
 * demandée, en utilisant la même source de taux que les routes
 * de paiement (fetchLiveRates — data cache 1h partagé).
 *
 * Garantie : si le paiement survient dans le même créneau de
 * cache (< 1h), le montant facturé = le montant affiché.
 *
 * Corps de la requête :
 *   { slug, qty, currency, discountPct? }
 *
 * Réponse :
 *   { formattedPrice, eurCents, convertedAmount, currency, rate }
 * ============================================================
 */
import { NextRequest, NextResponse } from "next/server";
import { getPriceForSlug, isPricingSlug } from "@/lib/pricing";
import {
  fetchLiveRates,
  convertEurCents,
  formatCurrencyAmount,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES,
} from "@/lib/fx-rates";
import type { FxCurrency } from "@/lib/fx-rates";

export async function POST(req: NextRequest) {
  try {
    const {
      slug,
      qty:         rawQty,
      currency:    rawCurrency,
      discountPct: rawDiscount,
    } = await req.json();

    // ── Valider le slug ────────────────────────────────────────────────────────
    if (!isPricingSlug(slug)) {
      return NextResponse.json({ error: "Produit invalide" }, { status: 400 });
    }

    // ── Valider la quantité ────────────────────────────────────────────────────
    const qty = Number(rawQty);
    if (qty !== 1 && qty !== 3) {
      return NextResponse.json({ error: "Quantité invalide (1 ou 3)" }, { status: 400 });
    }

    // ── Valider la devise ──────────────────────────────────────────────────────
    const currency: FxCurrency =
      rawCurrency && SUPPORTED_CURRENCIES.includes(rawCurrency as FxCurrency)
        ? (rawCurrency as FxCurrency)
        : "EUR";

    // ── Remise (pour affichage uniquement — jamais trustée pour le paiement réel) ──
    // Valeur bornée 0–99 ; le paiement re-valide le code promo côté serveur.
    const discountPct = Math.max(0, Math.min(99, Number(rawDiscount ?? 0)));

    // ── Prix EUR canonique (calendrier promo) ─────────────────────────────────
    const eurCentsBase = getPriceForSlug(slug, qty as 1 | 3);
    const eurCents = discountPct > 0
      ? Math.round(eurCentsBase * (100 - discountPct) / 100)
      : eurCentsBase;

    // ── Taux live (même data cache Next.js que les routes de paiement) ────────
    const rates = await fetchLiveRates();
    const rate  = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;

    // ── Conversion + formatage ─────────────────────────────────────────────────
    const convertedAmount = convertEurCents(eurCents, currency, rate);
    const formattedPrice  = formatCurrencyAmount(convertedAmount, currency);

    return NextResponse.json({
      formattedPrice,
      eurCents,
      convertedAmount,
      currency,
      rate,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
