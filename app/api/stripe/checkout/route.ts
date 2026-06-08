import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const SIZE_VALUES: Record<string, number> = {
  "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
  "$100,000": 100000, "$200,000": 200000,
};
const MAX_CUMUL = 400000;

const PRODUCTS = {
  "10k-2step":  { name: "Challenge $10,000 — 2-Step", amount: 9900,   accountSize: "$10,000",  model: "2step" },
  "25k-2step":  { name: "Challenge $25,000 — 2-Step", amount: 19900,  accountSize: "$25,000",  model: "2step" },
  "50k-2step":  { name: "Challenge $50,000 — 2-Step", amount: 29900,  accountSize: "$50,000",  model: "2step" },
  "100k-2step": { name: "Challenge $100,000 — 2-Step",amount: 43900,  accountSize: "$100,000", model: "2step" },
  "200k-2step": { name: "Challenge $200,000 — 2-Step",amount: 79900,  accountSize: "$200,000", model: "2step" },
  "10k-1step":  { name: "Challenge $10,000 — 1-Step", amount: 7900,   accountSize: "$10,000",  model: "1step" },
  "25k-1step":  { name: "Challenge $25,000 — 1-Step", amount: 16900,  accountSize: "$25,000",  model: "1step" },
  "50k-1step":  { name: "Challenge $50,000 — 1-Step", amount: 24900,  accountSize: "$50,000",  model: "1step" },
  "100k-1step": { name: "Challenge $100,000 — 1-Step",amount: 42900,  accountSize: "$100,000", model: "1step" },
  "200k-1step": { name: "Challenge $200,000 — 1-Step",amount: 74900,  accountSize: "$200,000", model: "1step" },
};

const SITE_URL = "https://www.elysium-rewards.com";

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, userEmail, promoCode, discount, refCode } = await req.json();
    const product = PRODUCTS[productId as keyof typeof PRODUCTS];
    if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    // Vérification plafond $400K
    const admin = createAdminClient();
    const { data: activeChallenges } = await admin.from("challenges").select("account_size").eq("user_id", userId).in("status", ["active", "funded"]);
    const currentTotal = (activeChallenges || []).reduce((sum, c) => sum + (SIZE_VALUES[c.account_size] || 0), 0);
    const newSize = SIZE_VALUES[product.accountSize] || 0;
    if (currentTotal + newSize > MAX_CUMUL) {
      return NextResponse.json({ error: `Plafond $400,000 atteint. Total actuel : $${currentTotal.toLocaleString()}` }, { status: 400 });
    }

    const discountPct = Number(discount) || 0;
    const finalAmount = discountPct > 0
      ? Math.round(product.amount * (100 - discountPct) / 100)
      : product.amount;

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
            description: `Traders Rewards — ${product.model === "2step" ? "2-Step Challenge" : "1-Step Challenge"}`,
            images: [],
          },
          unit_amount: finalAmount,
        },
        quantity: 1,
      }],
      metadata: {
        userId,
        productId,
        accountSize: product.accountSize,
        model: product.model,
        promoCode: promoCode || "",
        refCode: refCode || "",
      },
      success_url: `${SITE_URL}/checkout/success`,
      cancel_url: `${SITE_URL}/checkout/cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
