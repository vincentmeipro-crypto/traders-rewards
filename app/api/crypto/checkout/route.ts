import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SIZE_VALUES: Record<string, number> = {
  "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
  "$100,000": 100000, "$200,000": 200000,
};
const MAX_CUMUL = 400000;

const PRODUCTS: Record<string, { name: string; amount: number; accountSize: string; model: string }> = {
  "25k-2step":  { name: "Challenge $25,000 — 2-Step", amount: 21900,  accountSize: "$25,000",  model: "2step" },
  "50k-2step":  { name: "Challenge $50,000 — 2-Step", amount: 29900,  accountSize: "$50,000",  model: "2step" },
  "100k-2step": { name: "Challenge $100,000 — 2-Step",amount: 44900,  accountSize: "$100,000", model: "2step" },
  "200k-2step": { name: "Challenge $200,000 — 2-Step",amount: 84900,  accountSize: "$200,000", model: "2step" },
  "25k-1step":  { name: "Challenge $25,000 — 1-Step", amount: 14900,  accountSize: "$25,000",  model: "1step" },
  "50k-1step":  { name: "Challenge $50,000 — 1-Step", amount: 24900,  accountSize: "$50,000",  model: "1step" },
  "100k-1step":  { name: "Challenge $100,000 — 1-Step",  amount: 39900,  accountSize: "$100,000", model: "1step" },
  "50k-instant": { name: "Compte Reward $50,000 — Instant", amount: 130000, accountSize: "$50,000",  model: "instant" },
};

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, promoCode, discount, refCode } = await req.json();
    const product = PRODUCTS[productId as keyof typeof PRODUCTS];
    if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    // Plafond $400K : uniquement sur les comptes reward/funded (challenges illimités)
    const admin = createAdminClient();
    if (product.model === "instant") {
      const { data: fundedAccounts } = await admin.from("challenges").select("account_size").eq("user_id", userId).eq("status", "funded");
      const currentTotal = (fundedAccounts || []).reduce((sum: number, c: { account_size: string }) => sum + (SIZE_VALUES[c.account_size] || 0), 0);
      const newSize = SIZE_VALUES[product.accountSize] || 0;
      if (currentTotal + newSize > MAX_CUMUL) {
        return NextResponse.json({ error: `Plafond $400,000 de comptes Reward atteint. Total actuel : $${currentTotal.toLocaleString()}` }, { status: 400 });
      }
    }
    // product already defined above
    if (!product) return NextResponse.json({ error: "Invalid product" }, { status: 400 });

    const discountPct = Number(discount) || 0;
    const finalAmount = discountPct > 0
      ? Math.round(product.amount * (100 - discountPct) / 100)
      : product.amount;

    // Encode promo code in order_id: "elysium~{userId}~{productId}~{timestamp}~{promoCode}"
    const orderId = `elysium~${userId}~${productId}~${Date.now()}~${promoCode || ""}~${refCode || ""}`;
    const amountEur = parseFloat((finalAmount / 100).toFixed(6));

    const siteUrl = "https://www.traders-rewards.eu";

    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount: amountEur,
        price_currency: "eur",
        order_id: orderId,
        order_description: `Traders Rewards — ${product.name}`,
        ipn_callback_url: `${siteUrl}/api/crypto/webhook`,
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
