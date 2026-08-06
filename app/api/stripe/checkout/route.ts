import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStringConfig } from "@/lib/config";
import { loadProductBySlug, getEffectivePrice } from "@/lib/product-engine";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const SIZE_VALUES: Record<string, number> = {
  "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
  "$100,000": 100000, "$200,000": 200000,
};

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, userEmail, promoCode, discount, refCode } = await req.json();

    // Charger le produit depuis la DB par slug (le frontend envoie encore le slug)
    // loadProductBySlug lève une erreur si inactif ou introuvable
    const product = await loadProductBySlug(productId);

    const SITE_URL = await getStringConfig("branding.site_url");
    const admin = createAdminClient();

    // Vérifier le plafond de cumul (max_cumul_usd)
    if (product.max_cumul_usd) {
      const { data: activeChallenges } = await admin
        .from("challenges")
        .select("start_balance")
        .eq("user_id", userId)
        .in("status", ["active", "funded"]);

      const currentTotal = (activeChallenges ?? []).reduce(
        (sum, c) => sum + (c.start_balance || 0), 0
      );
      if (currentTotal + product.balance_usd > product.max_cumul_usd) {
        return NextResponse.json(
          { error: `Plafond de cumul atteint (max ${product.max_cumul_usd.toLocaleString()} USD)` },
          { status: 400 }
        );
      }
    }

    // Prix depuis la DB (jamais depuis le frontend)
    const baseAmount   = getEffectivePrice(product, "card");
    const discountPct  = Number(discount) || 0;
    const finalAmount  = discountPct > 0
      ? Math.round(baseAmount * (100 - discountPct) / 100)
      : baseAmount;

    const productName = discountPct > 0
      ? `${product.name} (${discountPct}% off)`
      : product.name;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      line_items: [{
        price_data: {
          currency: "eur",
          product_data: {
            name: productName,
            description: `Traders Rewards — ${product.model === "2step" ? "2-Step Challenge" : product.model === "1step" ? "1-Step Challenge" : "Instant Reward Account"}`,
            images: [],
          },
          unit_amount: finalAmount,
        },
        quantity: 1,
      }],
      metadata: {
        userId,
        productId:   product.id,          // UUID — utilisé par le webhook
        productSlug: product.slug,         // Slug — pour logs et affichage
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
