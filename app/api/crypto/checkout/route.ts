import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStringConfig } from "@/lib/config";
import { loadProductBySlug, getEffectivePrice } from "@/lib/product-engine";
import { validatePromoCode } from "@/lib/promo";

// VIP/legacy products non en DB — conservés pour rétrocompatibilité
const VIP_PRODUCTS: Record<
  string,
  { name: string; amount: number; accountSize: string; model: string }
> = {
  "25k-vip":  { name: "Challenge Algo $25,000",  amount: 125000,  accountSize: "$25,000",  model: "vip" },
  "50k-vip":  { name: "Challenge Algo $50,000",  amount: 250000,  accountSize: "$50,000",  model: "vip" },
  "100k-vip": { name: "Challenge Algo $100,000", amount: 500000,  accountSize: "$100,000", model: "vip" },
  "200k-vip": { name: "Challenge Algo $200,000", amount: 1000000, accountSize: "$200,000", model: "vip" },
};

// Remise fidélité — identique à la constante frontend, calculée côté serveur
const LOYALTY_PCT = 20;

export async function POST(req: NextRequest) {
  try {
    // `discount` n'est intentionnellement PAS destructuré : jamais trusté depuis le frontend.
    // La valeur réelle est recalculée exclusivement côté serveur ci-dessous.
    const { productId, userId, promoCode, refCode } = await req.json();

    const admin    = createAdminClient();
    const siteUrl  = await getStringConfig("branding.site_url");

    // ── Loyalty — calculé côté serveur avant toute décision de prix ──────────
    const { count: challengeCount } = await admin
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    const loyaltyDiscount = (challengeCount ?? 0) >= 1 ? LOYALTY_PCT : 0;

    // ── Validation promo code côté serveur ────────────────────────────────────
    let promoDiscount = 0;
    if (promoCode) {
      const promoResult = await validatePromoCode(promoCode);
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

    let orderId: string;
    let finalAmount: number;
    let productName: string;

    try {
      // ── Nouveau chemin : produit dans la DB ───────────────────────────────
      const product = await loadProductBySlug(productId);

      // Vérifier le plafond de cumul (max_cumul_usd depuis la DB)
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

      const baseAmount = getEffectivePrice(product, "crypto");
      finalAmount  = discountPct > 0
        ? Math.round(baseAmount * (100 - discountPct) / 100)
        : baseAmount;
      productName  = product.name;

      // Encode UUID dans l'orderId → webhook détecte new path via isUUID()
      orderId = `elysium~${userId}~${product.id}~${Date.now()}~${promoCode || ""}~${refCode || ""}`;
    } catch {
      // ── Fallback : produit VIP / legacy non en DB ─────────────────────────
      const legacy = VIP_PRODUCTS[productId as keyof typeof VIP_PRODUCTS];
      if (!legacy) {
        return NextResponse.json(
          { error: "Produit introuvable ou inactif" },
          { status: 400 }
        );
      }

      finalAmount = discountPct > 0
        ? Math.round(legacy.amount * (100 - discountPct) / 100)
        : legacy.amount;
      productName = legacy.name;

      // Slug dans l'orderId → webhook détecte legacy path
      orderId = `elysium~${userId}~${productId}~${Date.now()}~${promoCode || ""}~${refCode || ""}`;
    }

    const amountEur = parseFloat((finalAmount / 100).toFixed(6));

    const res = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key":    process.env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount:      amountEur,
        price_currency:    "eur",
        order_id:          orderId,
        order_description: `Traders Rewards — ${productName}`,
        ipn_callback_url:  `${siteUrl}/api/crypto/webhook`,
        success_url:       `${siteUrl}/checkout/success`,
        cancel_url:        `${siteUrl}/checkout/cancel`,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.invoice_url) {
      console.error("[crypto/checkout] NOWPayments error:", data);
      return NextResponse.json(
        { error: data.message || "NOWPayments error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.invoice_url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[crypto/checkout]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
