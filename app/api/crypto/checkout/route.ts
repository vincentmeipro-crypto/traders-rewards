import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const PRODUCTS: Record<string, { name: string; amount: number; accountSize: string; model: string }> = {
  "10k-2step":  { name: "Challenge $10,000 — 2-Step", amount: 12900,  accountSize: "$10,000",  model: "2step" },
  "25k-2step":  { name: "Challenge $25,000 — 2-Step", amount: 21900,  accountSize: "$25,000",  model: "2step" },
  "50k-2step":  { name: "Challenge $50,000 — 2-Step", amount: 29900,  accountSize: "$50,000",  model: "2step" },
  "100k-2step": { name: "Challenge $100,000 — 2-Step",amount: 44900,  accountSize: "$100,000", model: "2step" },
  "200k-2step": { name: "Challenge $200,000 — 2-Step",amount: 89900,  accountSize: "$200,000", model: "2step" },
  "10k-1step":  { name: "Challenge $10,000 — 1-Step", amount: 6900,   accountSize: "$10,000",  model: "1step" },
  "25k-1step":  { name: "Challenge $25,000 — 1-Step", amount: 14900,  accountSize: "$25,000",  model: "1step" },
  "50k-1step":  { name: "Challenge $50,000 — 1-Step", amount: 24900,  accountSize: "$50,000",  model: "1step" },
  "100k-1step": { name: "Challenge $100,000 — 1-Step",amount: 39900,  accountSize: "$100,000", model: "1step" },
  "200k-1step": { name: "Challenge $200,000 — 1-Step",amount: 84900,  accountSize: "$200,000", model: "1step" },
};

function makeSign(body: Record<string, unknown>, apiKey: string): string {
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64");
  return crypto.createHash("md5").update(encoded + apiKey).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { productId, userId } = await req.json();
    const product = PRODUCTS[productId];
    if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    const orderId = `${userId.slice(0, 8)}-${productId}-${Date.now()}`;
    const amountEur = (product.amount / 100).toFixed(2);

    const body: Record<string, unknown> = {
      amount: amountEur,
      currency: "EUR",
      order_id: orderId,
      url_callback: `${process.env.NEXT_PUBLIC_SITE_URL}/api/crypto/webhook`,
      url_success: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?method=crypto`,
      url_return: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/cancel`,
      lifetime: 3600,
      additional_data: JSON.stringify({ userId, productId, accountSize: product.accountSize, model: product.model }),
    };

    const sign = makeSign(body, process.env.CRYPTOMUS_API_KEY!);

    const res = await fetch("https://api.cryptomus.com/v1/payment", {
      method: "POST",
      headers: {
        merchant: process.env.CRYPTOMUS_MERCHANT_ID!,
        sign,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || !data.result?.url) {
      console.error("Cryptomus error:", data);
      return NextResponse.json({ error: data.message || "Cryptomus error" }, { status: 500 });
    }

    return NextResponse.json({ url: data.result.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
