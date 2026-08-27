import { NextResponse } from "next/server";
import { loadAllActiveProducts } from "@/lib/product-engine";
import { getActivePricingPlan, REF_PRICES, isPricingSlug } from "@/lib/pricing";

/**
 * GET /api/products
 * Retourne tous les produits actifs avec leurs phases et règles.
 * Endpoint public — utilisé par le frontend (PricingV1.tsx, checkout, etc.).
 *
 * Champs de prix exposés :
 *   effective_price_cents   — prix unitaire de la période active (= unit_price_cents)
 *   unit_price_cents        — prix unitaire de la période active
 *   pack3_price_cents       — prix pack ×3 de la période active
 *   ref_price_cents         — prix de référence barré (unitaire)
 *   ref_pack3_price_cents   — prix de référence barré (pack ×3)
 */
export async function GET() {
  try {
    const products = await loadAllActiveProducts();
    const { prices: currentPrices } = getActivePricingPlan();

    return NextResponse.json(
      products.map(({ product, phases, rules }) => {
        const slug      = product.slug;
        const pricing   = isPricingSlug(slug) ? currentPrices[slug] : null;
        const refPricing = isPricingSlug(slug) ? REF_PRICES[slug]   : null;

        // effective_price_cents : prix unitaire de la période active si disponible,
        // sinon prix DB (rétrocompatibilité avec les anciens produits non en calendrier).
        const effectivePriceCents = pricing?.unit ?? product.price_eur_cents;

        return {
          id:                    product.id,
          slug,
          name:                  product.name,
          model:                 product.model,
          account_size:          product.account_size,
          balance_usd:           product.balance_usd,
          price_eur_cents:       effectivePriceCents,
          price_crypto_cents:    product.price_crypto_cents,
          effective_price_cents: effectivePriceCents,
          // ── Tarification dynamique (calendrier promotionnel) ─────────
          unit_price_cents:      pricing?.unit    ?? null,
          pack3_price_cents:     pricing?.pack3   ?? null,
          ref_price_cents:       refPricing?.unit ?? null,
          ref_pack3_price_cents: refPricing?.pack3 ?? null,
          // ─────────────────────────────────────────────────────────────
          leverage:              product.leverage,
          max_cumul_usd:         product.max_cumul_usd,
          display_order:         product.display_order,
          phases: phases.map(ph => ({
            phase_order:      ph.phase_order,
            phase_label:      ph.phase_label,
            phase_type:       ph.phase_type,
            profit_target:    ph.profit_target,
            daily_drawdown:   ph.daily_drawdown,
            total_drawdown:   ph.total_drawdown,
            min_trading_days: ph.min_trading_days,
            max_trading_days: ph.max_trading_days,
            profit_split:     ph.profit_split,
          })),
          rules: rules.map(r => ({
            rule_key:    r.rule_key,
            rule_value:  r.rule_value,
            enabled:     r.enabled,
            description: r.description,
          })),
        };
      })
    );
  } catch (err) {
    console.error("[api/products] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
