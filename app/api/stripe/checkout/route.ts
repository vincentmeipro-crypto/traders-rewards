import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStringConfig } from "@/lib/config";
import { loadProductBySlug, getEffectivePrice } from "@/lib/product-engine";
import { validatePromoCode } from "@/lib/promo";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Remise fidélité — identique à la constante frontend, calculée côté serveur
const LOYALTY_PCT = 20;

export async function POST(req: NextRequest) {
  try {
    // `discount` n'est intentionnellement PAS destructuré : jamais trusté depuis le frontend.
    // La valeur réelle est recalculée exclusivement côté serveur ci-dessous.
    const { productId, userId, userEmail, promoCode, refCode } = await req.json();

    // Charger le produit depuis la DB par slug
    // loadProductBySlug lève une erreur si inactif ou introuvable
    const product = await loadProductBySlug(productId);

    const SITE_URL = await getStringConfig("branding.site_url");
    const admin = createAdminClient();

    // ── Plafond de cumul (max_cumul_usd) ─────────────────────────────────────
    if (product.max_cumul_usd) {
      const { data: activeChallenges } = await admin
        .from("challenges")
        .select("start_balance")
        .eq("user_id", userId)
        .in("status", ["active", "funded"]);

      const currentTotal = (activeChallenges ?? []).reduce(
        (sum, c) => sum + (c.start_balance || 0),
        0
      );
      if (currentTotal + product.balance_usd > product.max_cumul_usd) {
        return NextResponse.json(
          {
            error: `Plafond de cumul atteint (max ${product.max_cumul_usd.toLocaleString()} USD)`,
          },
          { status: 400 }
        );
      }
    }

    // ── Loyalty — calculé côté serveur, jamais depuis le frontend ────────────
    const { count: challengeCount } = await admin
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const loyaltyDiscount = (challengeCount ?? 0) >= 1 ? LOYALTY_PCT : 0;

    // ── Validation promo code côté serveur ────────────────────────────────────
    let promoDiscount = 0;
    if (promoCode) {
      // product.id (UUID) transmis → targeting et single_use vérifiés côté serveur
      const promoResult = await validatePromoCode({
        code:      promoCode,
        userId,
        productId: product.id,
      });
      if (!promoResult.valid) {
        return NextResponse.json(
          { error: `Code promo invalide : ${promoResult.message}` },
          { status: 400 }
        );
      }
      promoDiscount = promoResult.discountPercent;
    }

    // ── Best discount (loyalty vs promo) — server-side ────────────────────────
    const discountPct = Math.max(loyaltyDiscount, promoDiscount);

    // ── Les codes 100% passent exclusivement par /api/promo/free ─────────────
    if (discountPct === 100) {
      return NextResponse.json(
        {
          error: "Utilisez le formulaire d'accès gratuit.",
          code: "USE_FREE_PATH",
        },
        { status: 400 }
      );
    }

    // ── Prix depuis la DB uniquement ──────────────────────────────────────────
    const baseAmount  = getEffectivePrice(product, "card");
    const finalAmount = discountPct > 0
      ? Math.round(baseAmount * (100 - discountPct) / 100)
      : baseAmount;

    const productName = discountPct > 0
      ? `${product.name} (${discountPct}% off)`
      : product.name;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: productName,
              description: `Traders Rewards — ${
                product.model === "2step"
                  ? "2-Step Challenge"
                  : product.model === "1step"
                  ? "1-Step Challenge"
                  : "Instant Reward Account"
              }`,
              images: [],
            },
            unit_amount: finalAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        productId:   product.id,           // UUID — utilisé par le webhook
        productSlug: product.slug,          // Slug — pour logs et affichage
        accountSize: product.account_size,
        model:       product.model,
        promoCode:   promoCode || "",
        refCode:     refCode   || "",
      },
      success_url: `${SITE_URL}/checkout/success`,
      cancel_url:  `${SITE_URL}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
