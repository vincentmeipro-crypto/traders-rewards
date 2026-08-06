import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";
import {
  loadProductFullBySlug,
  buildRulesSnapshot,
  getPhase1Defaults,
} from "@/lib/product-engine";

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, promoCode } = await req.json();
    if (!productId || !userId || !promoCode) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

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

    // Re-valider le code promo côté serveur (actif, non expiré, non épuisé, 100% discount)
    const { data: promo, error: promoErr } = await admin
      .from("promo_codes").select("*")
      .eq("code", promoCode.toUpperCase().trim()).single();

    if (promoErr || !promo) return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
    if (!promo.active) return NextResponse.json({ error: "Code revoked" }, { status: 400 });
    if (promo.expires_at && new Date(promo.expires_at) < new Date())
      return NextResponse.json({ error: "Code expired" }, { status: 400 });
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses)
      return NextResponse.json({ error: "Code limit reached" }, { status: 400 });
    if (promo.discount_percent !== 100)
      return NextResponse.json({ error: "Not a 100% code" }, { status: 400 });

    // User info pour MT5 et email
    const { data: { user } } = await admin.auth.admin.getUserById(userId);
    const { data: profile } = await admin.from("profiles")
      .select("first_name, last_name").eq("user_id", userId).single();
    const firstName = user?.user_metadata?.first_name || profile?.first_name || "Trader";
    const lastName  = user?.user_metadata?.last_name  || profile?.last_name  || "";

    // Règles depuis la DB (corrige le bug des valeurs hardcodées)
    const phase1   = getPhase1Defaults(phases);
    const snapshot = buildRulesSnapshot(product, phases, rules, 0);  // 0 cents — challenge gratuit

    // Créer le challenge
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

    // Incrémenter le compteur du code promo
    await admin.from("promo_codes")
      .update({ used_count: promo.used_count + 1 })
      .eq("id", promo.id);

    const challengeId = challenge?.id as string | undefined;
    const mt5Url    = process.env.MT5_API_URL;
    const mt5Secret = process.env.MT5_API_SECRET;

    // Provision MT5
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
                });
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
