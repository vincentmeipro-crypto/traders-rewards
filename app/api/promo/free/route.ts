import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";
import {
  loadProductFullBySlug,
  buildRulesSnapshot,
  getPhase1Defaults,
} from "@/lib/product-engine";
import { consumePromoCode } from "@/lib/promo";

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, promoCode } = await req.json();
    if (!productId || !userId || !promoCode) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Normaliser le code AVANT de construire la référence (idempotence)
    const normalizedCode = (promoCode as string).toUpperCase().trim();

    // Charger le produit depuis la DB — lève une erreur si inactif ou introuvable
    const { product, phases, rules } = await loadProductFullBySlug(productId);

    const admin = createAdminClient();

    // Vérifier le plafond de cumul (max_cumul_usd depuis la DB)
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
          { error: `Plafond $${product.max_cumul_usd.toLocaleString()} atteint. Total actuel : $${currentTotal.toLocaleString()}` },
          { status: 400 }
        );
      }
    }

    // ── Référence idempotente deterministe ────────────────────────────
    // Format : "free:{userId}:{normalizedCode}:{productId}"
    // Garantit qu'un double-clic ne crée pas deux challenges.
    // Un même utilisateur peut utiliser la même promo sur des produits différents.
    const freeRef = `free:${userId}:${normalizedCode}:${product.id}`;

    // ── Consommation atomique promo code ──────────────────────────────
    // consumePromoCode valide + incrémente + insère promo_code_usages atomiquement.
    // Remplace la validation manuelle + UPDATE non-atomique de l'ancien code.
    //
    // Defense-in-depth : si le code n'est pas à 100%, on l'intercepte après le consume.
    const cr = await consumePromoCode({
      code:             normalizedCode,
      userId,
      provider:         "free",
      paymentReference: freeRef,
      discountApplied:  100,
      productId:        product.id,
    });

    if (cr.alreadyConsumed) {
      // Idempotence : la référence a déjà été traitée (double-clic ou webhook retry)
      // Si le challenge existe déjà → retourner ok: true directement
      if (cr.usageId) {
        const { data: existingUsage } = await admin
          .from("promo_code_usages")
          .select("challenge_id")
          .eq("id", cr.usageId)
          .single();
        if (existingUsage?.challenge_id) {
          return NextResponse.json({ ok: true });
        }
        // challenge_id null : le challenge n'a pas encore été créé (crash entre consume et insert)
        // → on continue pour créer le challenge et rattacher l'usage
      }
    }

    if (!cr.success && !cr.alreadyConsumed) {
      // Code invalide / révoqué / expiré / épuisé
      const errorMessages: Record<string, string> = {
        not_found:        "Code promo introuvable",
        revoked:          "Code révoqué",
        expired:          "Code expiré",
        exhausted:        "Limite d'utilisation atteinte",
        invalid_provider: "Fournisseur invalide",
      };
      return NextResponse.json(
        { error: errorMessages[cr.errorCode ?? ""] || "Code promo invalide" },
        { status: 400 }
      );
    }

    // Defense-in-depth : le chemin free ne doit traiter que les codes 100%
    if (cr.discountPct !== 100) {
      return NextResponse.json({ error: "Not a 100% code" }, { status: 400 });
    }

    // User info pour MT5 et email
    const { data: { user } } = await admin.auth.admin.getUserById(userId);
    const { data: profile } = await admin.from("profiles")
      .select("first_name, last_name").eq("user_id", userId).single();
    const firstName = user?.user_metadata?.first_name || profile?.first_name || "Trader";
    const lastName  = user?.user_metadata?.last_name  || profile?.last_name  || "";

    // Règles depuis la DB (corrige le bug des valeurs hardcodées)
    const phase1   = getPhase1Defaults(phases);
    const snapshot = buildRulesSnapshot(product, phases, rules, 0);  // 0 cents — challenge gratuit

    // ── Création du challenge ─────────────────────────────────────────
    const { data: challenge } = await admin.from("challenges").insert({
      user_id:              userId,
      account_size:         product.account_size,
      model:                product.model,
      status:               "active",
      phase:                "phase1",
      balance:              product.balance_usd,
      start_balance:        product.balance_usd,
      // Colonnes lues par metaapi/sync — JAMAIS nulles
      profit_target:        phase1.profit_target,
      daily_drawdown_limit: phase1.daily_drawdown_limit,
      total_drawdown_limit: phase1.total_drawdown_limit,
      trading_days:         0,
      amount_paid:          0,
      payment_method:       "promo",
      // Nouvelles colonnes Phase 2B
      product_id:           product.id,
      rules_snapshot:       snapshot,
    }).select("id").single();

    const challengeId = challenge?.id as string | undefined;

    // Attacher le challenge à l'usage promo (best-effort, non bloquant)
    if (cr.usageId && challengeId) {
      try {
        await admin.from("promo_code_usages")
          .update({ challenge_id: challengeId })
          .eq("id", cr.usageId);
      } catch (e) {
        console.error("[promo/free] usage challenge_id update error:", e);
      }
    }

    const mt5Url    = process.env.MT5_API_URL;
    const mt5Secret = process.env.MT5_API_SECRET;

    // ── Provision MT5 ─────────────────────────────────────────────────
    if (mt5Url && mt5Secret && challengeId) {
      try {
        const userEmail = user?.email || "";
        const mt5Res = await fetch(`${mt5Url}/provision-challenge`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": mt5Secret },
          body: JSON.stringify({
            challenge_id: challengeId,
            first_name:   firstName,
            last_name:    lastName,
            email:        userEmail,
            model:        product.model,
            balance:      product.balance_usd,
          }),
        });
        if (mt5Res.ok) {
          const mt5Data = await mt5Res.json();
          if (mt5Data.ok && mt5Data.login) {
            await admin.from("challenges").update({
              mt5_login:             mt5Data.login,
              mt5_password:          mt5Data.password,
              mt5_password_investor: mt5Data.password_investor,
              mt5_server:            mt5Data.server,
            }).eq("id", challengeId);
            if (userEmail) {
              try {
                await sendWelcomeEmail(userEmail, product.account_size, product.model, {
                  login:    mt5Data.login,
                  password: mt5Data.password,
                  server:   mt5Data.server,
                }, undefined, { userId: userId as string, challengeId });
              } catch (e) { console.error("[promo/free] Welcome email failed:", e); }
            }
          }
        }
      } catch (e) { console.error("[promo/free] MT5 provision error:", e); }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[promo/free]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
