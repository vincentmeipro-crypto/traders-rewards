import { NextResponse } from "next/server";
import { loadAllActiveProducts, getEffectivePrice } from "@/lib/product-engine";

/**
 * GET /api/products
 * Retourne tous les produits actifs avec leurs phases et règles.
 * Endpoint public — utilisé par le frontend (Pricing.tsx, checkout, etc.).
 */
export async function GET() {
  try {
    const products = await loadAllActiveProducts();

    return NextResponse.json(
      products.map(({ product, phases, rules }) => ({
        id:                    product.id,
        slug:                  product.slug,
        name:                  product.name,
        model:                 product.model,
        account_size:          product.account_size,
        balance_usd:           product.balance_usd,
        price_eur_cents:       product.price_eur_cents,
        price_crypto_cents:    product.price_crypto_cents,
        effective_price_cents: getEffectivePrice(product, "card"),
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
      }))
    );
  } catch (err) {
    console.error("[api/products] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
