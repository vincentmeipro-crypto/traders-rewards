import { NextRequest, NextResponse } from "next/server";

const PRODUCTS: Record<string, { name: string; amount: number; accountSize: string; model: string }> = {
  "10k-2step":  { name: "Challenge $10,000 — 2-Step", amount: 12900,  accountSize: "$10,000",  model: "2step" },
  "25k-2step":  { name: "Challenge $25,000 — 2-Step", amount: 21900,  accountSize: "$25,000",  model: "2step" },
  "50k-2step":  { name: "Challenge $50,000 — 2-Step", amount: 29900,  accountSize: "$50,000",  model: "2step" },
  "100k-2step": { name: "Challenge $100,000 — 2-Step",amount: 44900,  accountSize: "$100,000", model: "2step" },
  "10k-1step":  { name: "Challenge $10,000 — 1-Step", amount: 6900,   accountSize: "$10,000",  model: "1step" },
  "25k-1step":  { name: "Challenge $25,000 — 1-Step", amount: 14900,  accountSize: "$25,000",  model: "1step" },
  "50k-1step":  { name: "Challenge $50,000 — 1-Step", amount: 24900,  accountSize: "$50,000",  model: "1step" },
  "100k-1step": { name: "Challenge $100,000 — 1-Step",amount: 39900,  accountSize: "$100,000", model: "1step" },
};

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, promoCode, discount } = await req.json();
    const product = PRODUCTS[productId];
    if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    const discountPct = Number(discount) || 0;
    const finalAmount = discountPct > 0
      ? Math.round(product.amount * (100 - discountPct) / 100)
      : product.amount;

    // Encode promo code in order_id: "elysium~{userId}~{productId}~{timestamp}~{promoCode}"
    const orderId = `elysium~${userId}~${productId}~${Date.now()}~${promoCode || ""}`;
    const amountEur = (finalAmount / 100).toFixed(2);

    const siteUrl = "https://www.elysium-rewards.com";

    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: parseFloat(amountEur),
        price_currency: "eur",
        order_id: orderId,
        order_description: `Elysium — ${product.name}`,
        success_url: `${siteUrl}/checkout/success`,
        cancel_url: `${siteUrl}/checkout/cancel`,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.invoice_url) {
      console.error("NOWPayments error:", data);
      return NextResponse.json({ error: data.message || "NOWPayments error" }, { status: 500 });
    }

    return NextResponse.json({ url: data.invoice_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
