import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStringConfig } from "@/lib/config";
import { loadProductBySlug } from "@/lib/product-engine";
import { validatePromoCode } from "@/lib/promo";
import { getPriceForSlug, isPricingSlug } from "@/lib/pricing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  try {
    // `discount` n'est intentionnellement PAS destructuré : jamais trusté depuis le frontend.
    // Le prix est recalculé exclusivement côté serveur via getPriceForSlug().
    const { productId, userId, userEmail, promoCode, refCode, quantity: rawQuantity } = await req.json();

    // Quantité autorisée : 1 (challenge unique) ou 3 (pack ×3).
    const quantity = Number(rawQuantity ?? 1);
    if (quantity !== 1 && quantity !== 3) {
      return NextResponse.json(
        { error: "La quantité doit être 1 (challenge unique) ou 3 (pack ×3)." },
        { status: 400 }
      );
    }
    const qty = quantity as 1 | 3;

    // Charger le produit depuis la DB — valide qu'il est actif
    const product = await loadProductBySlug(productId);

    // Vérifier que le slug est dans le calendrier promotionnel
    if (!isPricingSlug(product.slug)) {
      return NextResponse.json(
        { error: "Ce produit n'est pas disponible à la vente actuellement." },
        { status: 400 }
      );
    }

    const SITE_URL = await getStringConfig("branding.site_url");
    const admin = createAdminClient();

    // ── Limite : 10 Challenges actifs max ────────────────────────────────────
    if (product.slug.startsWith("rewards-")) {
      const { count } = await admin
        .from("challenges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "active")
        .neq("phase", "funded");

      if ((count ?? 0) + qty > 10) {
        return NextResponse.json(
          { error: `Vous pouvez avoir au maximum 10 Challenges actifs. Il vous reste ${Math.max(0, 10 - (count ?? 0))} place(s).` },
          { status: 400 }
        );
      }
    } else if (product.max_cumul_usd) {
      const { data: activeChallenges } = await admin
        .from("challenges")
        .select("start_balance")
        .eq("user_id", userId)
        .in("status", ["active", "funded"]);

      const currentTotal = (activeChallenges ?? []).reduce(
        (sum, c) => sum + (c.start_balance || 0),
        0
      );
      if (currentTotal + product.balance_usd * qty > product.max_cumul_usd) {
        return NextResponse.json(
          { error: `Plafond de cumul atteint (max ${product.max_cumul_usd.toLocaleString()} USD)` },
          { status: 400 }
        );
      }
    }

    // ── Validation promo code côté serveur ────────────────────────────────────
    let promoDiscount = 0;
    if (promoCode) {
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

    const discountPct = promoDiscount;

    // ── Les codes 100% passent exclusivement par /api/promo/free ─────────────
    if (discountPct === 100) {
      return NextResponse.json(
        { error: "Utilisez le formulaire d'accès gratuit.", code: "USE_FREE_PATH" },
        { status: 400 }
      );
    }

    // ── Prix depuis le calendrier promotionnel (server-side, jamais le frontend) ──
    // qty=1 → prix unitaire ; qty=3 → prix pack ×3 propre (≠ 3 × unitaire)
    const baseAmount  = getPriceForSlug(product.slug, qty);
    const finalAmount = discountPct > 0
      ? Math.round(baseAmount * (100 - discountPct) / 100)
      : baseAmount;

    // ── Nommage Stripe ────────────────────────────────────────────────────────
    const baseLabel = product.account_size
      ? `Challenge ${product.account_size}`
      : product.name;
    const packLabel = qty === 3 ? `Pack ×3 — ${baseLabel}` : baseLabel;
    const productName = discountPct > 0
      ? `${packLabel} (${discountPct}% off)`
      : packLabel;

    const description = qty === 3
      ? `Traders Rewards — Pack ×3 Challenges ${product.account_size} · 3 comptes activés`
      : "Traders Rewards — Challenge en 1 étape";

    // ── Stripe Checkout Session ───────────────────────────────────────────────
    // Toujours quantity:1 dans line_items — la quantité réelle (1 ou 3) est dans metadata.
    // Raison : le tarif pack ×3 est un prix propre (≠ 3 × unitaire), donc on facture
    // le total en une seule ligne plutôt qu'un prix unitaire multiplié.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency:     "eur",
            product_data: { name: productName, description, images: [] },
            unit_amount:  finalAmount,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        productId:   product.id,
        productSlug: product.slug,
        accountSize: product.account_size,
        model:       product.model,
        promoCode:   promoCode || "",
        refCode:     refCode   || "",
        quantity:    String(qty),   // "1" ou "3" — utilisé par le webhook
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
