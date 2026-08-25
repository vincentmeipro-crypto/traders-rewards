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

export async function POST(req: NextRequest) {
  try {
    // `discount` n'est intentionnellement PAS destructuré : jamais trusté depuis le frontend.
    const { productId, userId, promoCode, refCode, quantity: rawQuantity } = await req.json();
    const quantity = Number(rawQuantity ?? 1);
    if (quantity !== 1) return NextResponse.json({ error: "Un seul Challenge peut être acheté à la fois." }, { status: 400 });

    const admin   = createAdminClient();
    const siteUrl = await getStringConfig("branding.site_url");

    // ── Charger le produit depuis la DB (new path) ────────────────────────────
    //
    // Tenté en premier pour obtenir le UUID réel du produit.
    // Si le produit n'est pas en DB (VIP legacy) → productFromDB = null.
    // Le slug reste disponible dans productId pour le fallback VIP ci-dessous.
    type DbProduct = Awaited<ReturnType<typeof loadProductBySlug>>;
    let productFromDB: DbProduct | null = null;
    try {
      productFromDB = await loadProductBySlug(productId);
    } catch {
      // Produit non trouvé en DB → chemin VIP legacy
    }

    // ── Validation promo code côté serveur ────────────────────────────────────
    //
    // productId transmis = UUID réel si produit en DB, null sinon.
    //
    // Comportement pour produits legacy sans UUID :
    //   targeting_mode = 'all'
    //     → pas de restriction produit → OK
    //   targeting_mode = 'specific'
    //     → validatePromoCode retourne product_required (fail closed)
    //     → Le client doit utiliser une promo universelle pour les produits VIP legacy.
    //
    // Race checkout/webhook : ces checks sont non-atomiques.
    // L'enforcement final atomique reste consumePromoCode (RPC webhook).
    //
    let promoDiscount = 0;
    if (promoCode) {
      const promoResult = await validatePromoCode({
        code:      promoCode,
        userId,
        productId: productFromDB?.id ?? null,
      });
      if (!promoResult.valid) {
        return NextResponse.json(
          { error: `Code promo invalide : ${promoResult.message}` },
          { status: 400 }
        );
      }
      promoDiscount = promoResult.discountPercent;
    }

    const discountPct = promoDiscount;

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

    if (productFromDB) {
      // ── Nouveau chemin : produit en DB ────────────────────────────────────

      // Nouveau modèle : 10 Challenges actifs maximum. Le plafond de capital
      // reste uniquement appliqué aux anciens produits.
      if (productFromDB.slug.startsWith("rewards-")) {
        const { count } = await admin
          .from("challenges")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "active")
          .neq("phase", "funded");
        if ((count ?? 0) + quantity > 10) {
          return NextResponse.json(
            { error: `Vous pouvez avoir au maximum 10 Challenges actifs. Il vous reste ${Math.max(0, 10 - (count ?? 0))} place(s).` },
            { status: 400 }
          );
        }
      } else if (productFromDB.max_cumul_usd) {
        const { data: activeChallenges } = await admin
          .from("challenges")
          .select("start_balance")
          .eq("user_id", userId)
          .in("status", ["active", "funded"]);
        const currentTotal = (activeChallenges ?? []).reduce(
          (sum, c) => sum + (c.start_balance || 0),
          0
        );
        if (currentTotal + productFromDB.balance_usd * quantity > productFromDB.max_cumul_usd) {
          return NextResponse.json(
            {
              error: `Plafond de cumul atteint (max ${productFromDB.max_cumul_usd.toLocaleString()} USD)`,
            },
            { status: 400 }
          );
        }
      }

      const baseAmount = getEffectivePrice(productFromDB, "crypto");
      finalAmount = (discountPct > 0
        ? Math.round(baseAmount * (100 - discountPct) / 100)
        : baseAmount) * quantity;
      productName = productFromDB.name;

      // Encode UUID dans l'orderId → webhook détecte new path via isUUID()
      orderId = `elysium~${userId}~${productFromDB.id}~${Date.now()}~${promoCode || ""}~${refCode || ""}~${quantity}`;
    } else {
      // ── Fallback : produit VIP / legacy non en DB ─────────────────────────
      //
      // Note : les promos targeting_mode='specific' ont été rejetées ci-dessus
      // par validatePromoCode (product_required) — seules les promos 'all' arrivent ici.
      const legacy = VIP_PRODUCTS[productId as keyof typeof VIP_PRODUCTS];
      if (!legacy) {
        return NextResponse.json(
          { error: "Produit introuvable ou inactif" },
          { status: 400 }
        );
      }

      finalAmount = (discountPct > 0
        ? Math.round(legacy.amount * (100 - discountPct) / 100)
        : legacy.amount) * quantity;
      productName = legacy.name;

      // Slug dans l'orderId → webhook détecte legacy path
      orderId = `elysium~${userId}~${productId}~${Date.now()}~${promoCode || ""}~${refCode || ""}~${quantity}`;
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
