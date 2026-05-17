import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRODUCTS = {
  "10k-2step":  { name: "Challenge $10,000 — 2-Step", amount: 12900,  accountSize: "$10,000",  model: "2step" },
  "25k-2step":  { name: "Challenge $25,000 — 2-Step", amount: 21900,  accountSize: "$25,000",  model: "2step" },
  "50k-2step":  { name: "Challenge $50,000 — 2-Step", amount: 29900,  accountSize: "$50,000",  model: "2step" },
  "100k-2step": { name: "Challenge $100,000 — 2-Step",amount: 44900,  accountSize: "$100,000", model: "2step" },
  "200k-2step": { name: "Challenge $200,000 — 2-Step",amount: 79900,  accountSize: "$200,000", model: "2step" },
  "10k-1step":  { name: "Challenge $10,000 — 1-Step", amount: 6900,   accountSize: "$10,000",  model: "1step" },
  "25k-1step":  { name: "Challenge $25,000 — 1-Step", amount: 14900,  accountSize: "$25,000",  model: "1step" },
  "50k-1step":  { name: "Challenge $50,000 — 1-Step", amount: 24900,  accountSize: "$50,000",  model: "1step" },
  "100k-1step": { name: "Challenge $100,000 — 1-Step",amount: 39900,  accountSize: "$100,000", model: "1step" },
  "200k-1step": { name: "Challenge $200,000 — 1-Step",amount: 74900,  accountSize: "$200,000", model: "1step" },
};

const SITE_URL = "https://elysiumfunded.eu";

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, userEmail, promoCode, discount } = await req.json();
    const product = PRODUCTS[productId as keyof typeof PRODUCTS];
    if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

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
            description: `Elysium Funded — ${product.model === "2step" ? "2-Step Challenge" : "1-Step Challenge"} — Fee refunded at first payout`,
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
