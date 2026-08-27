import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";
import { getChallengeDefaults } from "@/lib/config";
import {
  loadProductFull,
  buildRulesSnapshot,
  getPhase1Defaults,
  getEffectivePrice,
} from "@/lib/product-engine";
import { consumePromoCode } from "@/lib/promo";

// Anciens slugs (VIP + legacy) — fallback si parts[2] n'est pas un UUID
const PRODUCTS: Record<string, { accountSize: string; model: string }> = {
  "10k-2step":   { accountSize: "$10,000",  model: "2step" },
  "25k-2step":   { accountSize: "$25,000",  model: "2step" },
  "50k-2step":   { accountSize: "$50,000",  model: "2step" },
  "100k-2step":  { accountSize: "$100,000", model: "2step" },
  "200k-2step":  { accountSize: "$200,000", model: "2step" },
  "10k-1step":   { accountSize: "$10,000",  model: "1step" },
  "25k-1step":   { accountSize: "$25,000",  model: "1step" },
  "50k-1step":   { accountSize: "$50,000",  model: "1step" },
  "100k-1step":  { accountSize: "$100,000", model: "1step" },
  "200k-1step":  { accountSize: "$200,000", model: "1step" },
  "50k-instant": { accountSize: "$50,000",  model: "instant" },
  "25k-vip":     { accountSize: "$25,000",  model: "vip" },
  "50k-vip":     { accountSize: "$50,000",  model: "vip" },
  "100k-vip":    { accountSize: "$100,000", model: "vip" },
  "200k-vip":    { accountSize: "$200,000", model: "vip" },
};

const SIZE_MAP: Record<string, number> = {
  "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
  "$100,000": 100000, "$200,000": 200000,
};

/** Détecte si une chaîne est un UUID v4 (nouvelle session) ou un slug (ancienne session). */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function verifySignature(body: string, sig: string, ipnSecret: string): boolean {
  const hmac = crypto.createHmac("sha512", ipnSecret);
  hmac.update(body);
  return hmac.digest("hex") === sig;
}

function verifySignatureSorted(body: string, sig: string, ipnSecret: string): boolean {
  const parsed = JSON.parse(body);
  const sorted = Object.keys(parsed).sort().reduce((acc: Record<string, unknown>, key) => {
    acc[key] = parsed[key];
    return acc;
  }, {});
  const hmac = crypto.createHmac("sha512", ipnSecret);
  hmac.update(JSON.stringify(sorted));
  return hmac.digest("hex") === sig;
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sig = req.headers.get("x-nowpayments-sig") || "";

    const body = JSON.parse(rawBody);
    const status = body.payment_status as string;

    const sigValid = verifySignature(rawBody, sig, process.env.NOWPAYMENTS_IPN_SECRET!)
      || verifySignatureSorted(rawBody, sig, process.env.NOWPAYMENTS_IPN_SECRET!);
    if (!sigValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (status !== "finished" && status !== "confirmed" && status !== "partially_paid") {
      return NextResponse.json({ received: true });
    }

    // Parse order_id: "elysium~{userId}~{productId}~{timestamp}~{promoCode}~{refCode}"
    const orderId: string = body.order_id || "";
    const parts = orderId.split("~");
    if (parts.length < 3 || parts[0] !== "elysium") {
      return NextResponse.json({ received: true });
    }

    const userId    = parts[1];
    const productId = parts[2];  // UUID (new path) ou slug (legacy path)
    const promoCode = parts[4] || "";
    const refCode   = parts[5] || "";
    // Supporte 1 (challenge unique), 3 (pack ×3) et 5 (legacy VIP).
    const rawQty   = parseInt(parts[6] ?? "1", 10);
    const quantity = ([1, 3, 5] as number[]).includes(rawQty) ? rawQty : 1;

    if (!userId || !productId) return NextResponse.json({ received: true });

    const admin = createAdminClient();

    // Idempotency check
    const nowpaymentsId = body.payment_id?.toString() || "";
    if (nowpaymentsId) {
      const { data: existing } = await admin.from("challenges")
        .select("id").eq("stripe_session_id", nowpaymentsId).maybeSingle();
      if (existing) return NextResponse.json({ received: true, duplicate: true });
    }

    // price_amount est en EUR (prix de la facture NOWPayments)
    const amountPaid = Math.round(parseFloat(body.price_amount || "0") * 1e6) / 1e6;
    const amountPaidPerChallenge = amountPaid / quantity;

    // ── Règles du challenge ────────────────────────────────────────────
    //
    // NOUVEAU PATH (UUID) : charge depuis la DB → snapshot immuable.
    // ANCIEN PATH (slug)  : fallback PRODUCTS + getChallengeDefaults — rétrocompat.
    // Dans tous les cas les colonnes que metaapi/sync lit directement sont peuplées.
    //
    // discountApplied : calculé dans le path UUID (baseAmount connu),
    //   NULL dans le path slug legacy (baseAmount non disponible sans produit).
    //   getEffectivePrice retourne des centimes ; amountPaid est en EUR float
    //   → on compare amountPaid * 100 (centimes) à baseAmount (centimes).

    let challengeInsert: Record<string, unknown>;
    let challengeModel: string;
    let challengeAccountSize: string;
    let challengeBalance: number;
    let discountApplied:    number | null = null;
    // UUID du produit — disponible dans le new path (Product Engine).
    // Null dans le legacy path (slug sans UUID DB).
    // Transmis à consumePromoCode pour l'enforcement product targeting.
    // Pour le legacy : promos targeting_mode='specific' → RPC retourne product_required
    //   → log non-bloquant ; le client ayant payé reçoit quand même son challenge.
    let challengeProductId: string | null = null;

    if (isUUID(productId)) {
      // ── Nouveau chemin : Product Engine ───────────────────────────────
      // Les produits sont soft-deleted uniquement → loadProductFull par UUID
      // ne peut échouer que pour une erreur DB transitoire : on retourne 500
      // pour déclencher le retry NOWPayments plutôt que créer un challenge corrompu.
      const { product, phases, rules } = await loadProductFull(productId);
      const phase1   = getPhase1Defaults(phases);
      const snapshot = buildRulesSnapshot(product, phases, rules, Math.round(amountPaidPerChallenge * 100));

      // Discount effectif calculé depuis le montant réellement facturé vs prix DB
      // getEffectivePrice("crypto") → centimes ; amountPaid → EUR → * 100 = centimes
      const baseAmount = getEffectivePrice(product, "crypto");
      if (baseAmount > 0) {
        discountApplied = Math.max(0, Math.round((1 - (amountPaidPerChallenge * 100) / baseAmount) * 100));
      }

      challengeProductId   = product.id;
      challengeModel       = product.model;
      challengeAccountSize = product.account_size;
      challengeBalance     = product.balance_usd;

      challengeInsert = {
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
        stripe_session_id:    nowpaymentsId || null,
        amount_paid:          amountPaidPerChallenge,
        payment_method:       "crypto",
        // Nouvelles colonnes Phase 2B
        product_id:           product.id,
        rules_snapshot:       snapshot,
      };
    } else {
      // ── Ancien chemin : session ouverte avant Phase 2B (slug dans orderId) ──
      const product = PRODUCTS[productId];
      if (!product) return NextResponse.json({ received: true });

      const { accountSize, model } = product;
      const size = SIZE_MAP[accountSize] || 10000;

      const challengeDefaults = await getChallengeDefaults();

      challengeModel       = model;
      challengeAccountSize = accountSize;
      challengeBalance     = size;
      // discountApplied reste null : path legacy, baseAmount non disponible

      challengeInsert = {
        user_id:              userId,
        account_size:         accountSize,
        model,
        status:               "active",
        phase:                "phase1",
        balance:              size,
        start_balance:        size,
        profit_target:        challengeDefaults.profitTarget,
        daily_drawdown_limit: model === "1step" ? challengeDefaults.dailyDd1step : challengeDefaults.dailyDd2step,
        total_drawdown_limit: challengeDefaults.totalDdDefault,
        trading_days:         0,
        stripe_session_id:    nowpaymentsId || null,
        amount_paid:          amountPaidPerChallenge,
        payment_method:       "crypto",
      };
    }

    // ── Consommation atomique promo code ──────────────────────────────
    // Exécuté AVANT l'INSERT challenge :
    //   - Si succès        → promo_code_usages créé, promoUsageId renseigné
    //   - Si already_consumed → idempotence webhook retry, on continue sans ré-incrémenter
    //   - Si exhausted/revoked/expired → client a payé, on logue et on continue
    //   - Si erreur DB     → on logue, on continue (ne pas bloquer un achat légitime)
    let promoUsageId: string | null = null;
    if (promoCode) {
      try {
        const cr = await consumePromoCode({
          code:             promoCode,
          userId,
          provider:         "crypto",
          paymentReference: nowpaymentsId || null,
          discountApplied,
          productId:        challengeProductId,
        });
        promoUsageId = cr.usageId;
        if (!cr.success && !cr.alreadyConsumed) {
          console.warn(`[crypto/webhook] promo consume non-bloquant: ${cr.errorCode} — code=${promoCode} payment=${nowpaymentsId}`);
        }
      } catch (e) {
        // Erreur DB : ne pas bloquer la création du challenge
        console.error("[crypto/webhook] consumePromoCode error:", e);
      }
    }

    // ── Création du challenge ─────────────────────────────────────────
    const challengeRows = Array.from({ length: quantity }, (_, index) => ({
      ...challengeInsert,
      stripe_session_id: index === 0 ? (nowpaymentsId || null) : `${nowpaymentsId || orderId}:${index + 1}`,
    }));
    const { data: inserted, error: insertError } = await admin.from("challenges")
      .insert(challengeRows)
      .select("id")
      ;

    if (insertError) {
      console.error("[crypto/webhook] Challenge insert error:", insertError);
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }
    const challengeIds = (inserted ?? []).map(row => row.id as string);
    const challengeId = challengeIds[0];

    // Attacher le challenge à l'usage promo (best-effort, non bloquant)
    if (promoUsageId && challengeId) {
      try {
        await admin.from("promo_code_usages")
          .update({ challenge_id: challengeId })
          .eq("id", promoUsageId);
      } catch (e) {
        console.error("[crypto/webhook] usage challenge_id update error:", e);
      }
    }

    // ── Affiliation ───────────────────────────────────────────────────
    if (refCode) {
      try {
        const { data: affiliate } = await admin.from("affiliates")
          .select("user_id, commission_rate, total_earned")
          .eq("code", refCode)
          .single();
        if (affiliate && affiliate.user_id !== userId) {
          const rate       = (affiliate.commission_rate || 10) / 100;
          const commission = Math.round(amountPaid * rate * 100) / 100;
          await admin.from("affiliate_referrals").insert({
            affiliate_user_id: affiliate.user_id,
            referred_user_id:  userId,
            purchase_amount:   amountPaid,
            commission_amount: commission,
            status:            "pending",
          });
          await admin.from("affiliates")
            .update({ total_earned: (affiliate.total_earned || 0) + commission })
            .eq("user_id", affiliate.user_id);
        }
      } catch (e) { console.error("[crypto/webhook] Affiliate error:", e); }
    }

    // ── User info pour MT5 ────────────────────────────────────────────
    const { data: { users } } = await admin.auth.admin.listUsers();
    const user = users.find(u => u.id === userId);
    const userEmail = user?.email || "";
    const { data: profile } = await admin.from("profiles")
      .select("first_name, last_name")
      .eq("user_id", userId)
      .single();
    const firstName = user?.user_metadata?.first_name || profile?.first_name || "Trader";
    const lastName  = user?.user_metadata?.last_name  || profile?.last_name  || "";

    // ── Provision MT5 ─────────────────────────────────────────────────
    for (const currentChallengeId of challengeIds) try {
      const mt5Res = await fetch(`${process.env.MT5_API_URL}/provision-challenge`, {
        method: "POST",
        headers: { "x-api-key": process.env.MT5_API_SECRET!, "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: currentChallengeId,
          first_name:   firstName,
          last_name:    lastName,
          email:        userEmail,
          model:        challengeModel,
          balance:      challengeBalance,
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
          }).eq("id", currentChallengeId);
          if (userEmail) {
            try {
              await sendWelcomeEmail(userEmail, challengeAccountSize, challengeModel, {
                login:    mt5Data.login,
                password: mt5Data.password,
                server:   mt5Data.server,
              }, undefined, { userId: userId as string, challengeId: currentChallengeId });
            } catch (e) { console.error("[crypto/webhook] Welcome email failed:", e); }
          }
        }
      }
    } catch (e) { console.error("[crypto/webhook] MT5 provision error:", e); }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[crypto/webhook] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
