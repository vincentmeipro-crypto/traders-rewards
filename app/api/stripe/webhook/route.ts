import { getChallengeProfitTargetPct } from "@/lib/program-rules";
import { NextRequest, NextResponse, after } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail, sendPurchaseConfirmationEmail } from "@/lib/mailer";
import { getChallengeDefaults, getStringConfig, getBrandingConfig } from "@/lib/config";
import {
  loadProductFull,
  buildRulesSnapshot,
  getPhase1Defaults,
  getEffectivePrice,
} from "@/lib/product-engine";
import { consumePromoCode } from "@/lib/promo";
import { TERMS_VERSION } from "@/lib/terms-config";
import { createInvoiceAtomic } from "@/lib/invoice-creation-atomic";
import { getSellerSnapshot } from "@/lib/invoice-config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/** Détecte si une chaîne est un UUID v4 (nouvelle session) ou un slug (ancienne session). */
function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const {
      userId, productId, accountSize, model, promoCode, refCode,
      termsVersion, agreedToTerms, agreedImmediateStart, language,
      clientIp, clientUserAgent,
    } = session.metadata!;
    // Supporte 1 (challenge unique), 3 (pack ×3) et 5 (VIP).
    const rawQty  = parseInt(session.metadata?.quantity ?? "1", 10);
    const quantity = ([1, 3, 5] as number[]).includes(rawQty) ? rawQty : 1;

    const admin = createAdminClient();

    // Idempotency check — évite le double traitement si Stripe renvoie l'événement
    const { data: existing } = await admin
      .from("challenges")
      .select("id")
      .eq("stripe_session_id", session.id)
      .single();
    if (existing) return NextResponse.json({ received: true, skipped: "duplicate" });

    // ── Enregistrer l'acceptation CGV (preuve légale) ─────────────────────────
    // Avant la création du challenge, pour que cette preuve soit complète
    try {
      await admin.from("terms_acceptances").insert({
        user_id: userId,
        payment_provider: "stripe",
        payment_reference: session.id,
        terms_version: termsVersion || TERMS_VERSION,
        terms_accepted: agreedToTerms === "true",
        immediate_performance_requested: agreedImmediateStart === "true",
        client_ip_address: clientIp || null,
        client_user_agent: clientUserAgent || null,
        language: (language as "fr" | "en" | "es") || "en",
        accepted_at: new Date(session.created * 1000).toISOString(),
      });
    } catch (e) {
      console.error("[stripe/webhook] terms_acceptances insert error:", e);
      // Ne pas bloquer la création du challenge si l'enregistrement échoue
    }

    const sizeMap: Record<string, number> = {
      "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
      "$100,000": 100000, "$200,000": 200000,
    };
    const size = sizeMap[accountSize] || 10000;

    // Récupérer les infos du user pour MT5
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const { data: profile }   = await admin.from("profiles").select("first_name, last_name").eq("user_id", userId).single();
    const firstName = userData?.user?.user_metadata?.first_name || profile?.first_name || session.customer_details?.name?.split(" ")[0] || "Trader";
    const lastName  = userData?.user?.user_metadata?.last_name  || profile?.last_name  || session.customer_details?.name?.split(" ").slice(1).join(" ") || "";
    const email     = userData?.user?.email || session.customer_details?.email || "";

    const amountPaidCents = session.amount_total || 0;
    const amountPaidPerChallengeCents = Math.round(amountPaidCents / quantity);

    // ── Règles du challenge ────────────────────────────────────────────
    //
    // NOUVELLE SESSION (productId = UUID) : charge depuis la DB → snapshot immuable.
    // ANCIENNE SESSION  (productId = slug) : fallback getChallengeDefaults() — rétrocompat
    //   pour les sessions Stripe ouvertes avant le déploiement de Phase 2B.
    //
    // discountApplied : calculé dans le path UUID (baseAmount connu),
    //   NULL dans le path slug (baseAmount non disponible sans produit).

    let challengeInsert: Record<string, unknown>;
    let discountApplied:    number | null = null;
    // UUID du produit — disponible dans le new path (Product Engine).
    // Null dans l'ancien path (slug) et dans le fallback Engine error.
    // Transmis à consumePromoCode pour l'enforcement product targeting.
    let challengeProductId: string | null = null;

    if (isUUID(productId)) {
      // ── Nouveau chemin : Product Engine ───────────────────────────────
      try {
        const { product, phases, rules } = await loadProductFull(productId);
        const phase1    = getPhase1Defaults(phases);
        const snapshot  = buildRulesSnapshot(product, phases, rules, amountPaidPerChallengeCents);

        // Discount effectif calculé depuis le montant réellement facturé vs prix DB
        const baseAmount = getEffectivePrice(product, "card");
        if (baseAmount > 0) {
          discountApplied = Math.max(0, Math.round((1 - amountPaidPerChallengeCents / baseAmount) * 100));
        }

        challengeProductId = product.id;

        challengeInsert = {
          user_id:              userId,
          account_size:         product.account_size,
          model:                product.model,
          status:               "active",
          phase:                "phase1",
          balance:              product.balance_usd,
          start_balance:        product.balance_usd,
          profit_target:        phase1.profit_target,
          daily_drawdown_limit: phase1.daily_drawdown_limit,
          total_drawdown_limit: phase1.total_drawdown_limit,
          trading_days:         0,
          stripe_session_id:    session.id,
          amount_paid:          amountPaidPerChallengeCents / 100,
          payment_method:       "card",
          product_id:           product.id,
          rules_snapshot:       snapshot,
        };
      } catch (engineErr) {
        console.error("[stripe/webhook] Product Engine error, fallback to defaults:", engineErr);
        const challengeDefaults = await getChallengeDefaults();
        challengeInsert = {
          user_id:              userId,
          account_size:         accountSize,
          model,
          status:               "active",
          phase:                "phase1",
          balance:              size,
          start_balance:        size,
          profit_target:        getChallengeProfitTargetPct(model, size, challengeDefaults.profitTarget),
          daily_drawdown_limit: model === "1step" ? challengeDefaults.dailyDd1step : challengeDefaults.dailyDd2step,
          total_drawdown_limit: challengeDefaults.totalDdDefault,
          trading_days:         0,
          stripe_session_id:    session.id,
          amount_paid:          amountPaidPerChallengeCents / 100,
          payment_method:       "card",
        };
        // discountApplied reste null : produit non chargé, baseAmount inconnu
      }
    } else {
      // ── Ancien chemin : session ouverte avant Phase 2B (slug dans metadata) ──
      const challengeDefaults = await getChallengeDefaults();
      challengeInsert = {
        user_id:              userId,
        account_size:         accountSize,
        model,
        status:               "active",
        phase:                "phase1",
        balance:              size,
        start_balance:        size,
        profit_target:        getChallengeProfitTargetPct(model, size, challengeDefaults.profitTarget),
        daily_drawdown_limit: model === "1step" ? challengeDefaults.dailyDd1step : challengeDefaults.dailyDd2step,
        total_drawdown_limit: challengeDefaults.totalDdDefault,
        trading_days:         0,
        stripe_session_id:    session.id,
        amount_paid:          amountPaidPerChallengeCents / 100,
        payment_method:       "card",
      };
      // discountApplied reste null : ancien path, baseAmount non disponible
    }

    // ── Consommation atomique promo code ──────────────────────────────
    // Exécuté AVANT l'INSERT challenge :
    //   - Si succès       → promo_code_usages créé, promoUsageId renseigné
    //   - Si already_consumed → idempotence webhook, on continue sans ré-incrémenter
    //   - Si exhausted/revoked/expired → le client a payé, on logue et on continue
    //   - Si erreur DB    → on logue, on continue (ne pas bloquer un achat légitime)
    let promoUsageId: string | null = null;
    if (promoCode) {
      try {
        const cr = await consumePromoCode({
          code:             promoCode,
          userId,
          provider:         "stripe",
          paymentReference: session.id,
          discountApplied,
          productId:        challengeProductId,
        });
        promoUsageId = cr.usageId;
        if (!cr.success && !cr.alreadyConsumed) {
          console.warn(`[stripe/webhook] promo consume non-bloquant: ${cr.errorCode} — code=${promoCode} session=${session.id}`);
        }
      } catch (e) {
        // Erreur DB : ne pas bloquer la création du challenge
        console.error("[stripe/webhook] consumePromoCode error:", e);
      }
    }

    // ── Création du challenge ─────────────────────────────────────────
    const challengeRows = Array.from({ length: quantity }, (_, index) => ({
      ...challengeInsert,
      stripe_session_id: index === 0 ? session.id : `${session.id}:${index + 1}`,
    }));
    const { data: inserted } = await admin
      .from("challenges")
      .insert(challengeRows)
      .select("id")
    const challengeIds = (inserted ?? []).map(row => row.id as string);
    const challengeId = challengeIds[0];

    // ── Créer facture (invoice) ATOMIQUEMENT ──────────────────────
    // Snapshot immuable des données de paiement
    // Utilise PostgreSQL pg_advisory_xact_lock pour garantir atomicité:
    // - 2 webhooks du même paiement → 1 facture, 1 numéro consommé
    let invoiceCreated = false;
    let invoiceNumber: string | null = null;
    try {
      const seller = getSellerSnapshot();
      const invoiceResult = await createInvoiceAtomic({
        user_id: userId,
        challenge_id: challengeId,
        payment_provider: "stripe",
        payment_reference: session.id,
        customer_email: email,
        customer_name: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null,
        customer_address: session.customer_details?.address?.line1 || null,
        customer_city: session.customer_details?.address?.city || null,
        customer_postal_code: session.customer_details?.address?.postal_code || null,
        customer_country: session.customer_details?.address?.country || null,
        customer_company: null,
        customer_vat_number: null,
        product_name: `Challenge ${accountSize}`,
        account_size: accountSize,
        product_description: null,
        quantity,
        promo_code_used: promoCode || null,
        affiliate_code: refCode || null,
        currency: session.currency?.toUpperCase() || "EUR",
        subtotal_cents: amountPaidPerChallengeCents,
        amount_paid_cents: amountPaidPerChallengeCents,
        seller_legal_name: seller.legal_name,
        seller_registration_number: seller.registration_number,
        seller_address: seller.address,
        seller_country: seller.country,
        seller_email: seller.email,
        seller_vat_number: seller.vat_number,
        language: (language as "fr" | "en" | "es") || "en",
      });

      if (invoiceResult.success && invoiceResult.invoice) {
        invoiceCreated = invoiceResult.invoice.created;
        invoiceNumber = invoiceResult.invoice.invoice_number;
      } else {
        console.error("[stripe/webhook] invoice creation failed:", invoiceResult.error);
      }
    } catch (invoiceErr) {
      console.error("[stripe/webhook] invoice creation exception:", invoiceErr);
    }

    // ── Répondre à Stripe immédiatement — MT5 + email + affiliation en arrière-plan ──
    // after() s'exécute après que la réponse HTTP a été envoyée, dans la même
    // invocation Vercel (maxDuration: 60). Stripe reçoit son 200 en ~2s et ne
    // tentera plus de retry à 5 minutes.
    after(async () => {
      // Attacher le challenge à l'usage promo (best-effort, non bloquant)
      if (promoUsageId && challengeId) {
        try {
          await admin.from("promo_code_usages")
            .update({ challenge_id: challengeId })
            .eq("id", promoUsageId);
        } catch (e) {
          console.error("[stripe/webhook] usage challenge_id update error:", e);
        }
      }

      // ── Provision MT5 ───────────────────────────────────────────────
      for (const currentChallengeId of challengeIds) {
        const challengeModel       = (challengeInsert.model       as string) || model;
        const challengeAccountSize = (challengeInsert.account_size as string) || accountSize;
        const challengeBalance     = (challengeInsert.balance      as number) || size;

        try {
          const mt5Res = await fetch(`${process.env.MT5_API_URL}/provision-challenge`, {
            method: "POST",
            headers: { "x-api-key": process.env.MT5_API_SECRET!, "Content-Type": "application/json" },
            body: JSON.stringify({
              challenge_id: currentChallengeId,
              first_name:   firstName,
              last_name:    lastName,
              email,
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
              if (email) {
                try {
                  await sendWelcomeEmail(email, challengeAccountSize, challengeModel, {
                    login:    mt5Data.login,
                    password: mt5Data.password,
                    server:   mt5Data.server,
                  }, undefined, { userId: userId as string, challengeId: currentChallengeId });
                } catch (e) { console.error("[stripe/webhook] Welcome email failed:", e); }
              }
            }
          }
        } catch (e) { console.error("[stripe/webhook] MT5 provision error:", e); }
      }

      // ── Affiliation ─────────────────────────────────────────────────
      if (refCode) {
        try {
          const { data: affiliate } = await admin
            .from("affiliates")
            .select("user_id, commission_rate, total_earned")
            .eq("code", refCode)
            .single();
          if (affiliate && affiliate.user_id !== userId) {
            const rate       = (affiliate.commission_rate || 10) / 100;
            const amountPaid = amountPaidCents / 100;
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
        } catch (e) { console.error("[stripe/webhook] Affiliate referral error:", e); }
      }

      // ── Email confirmation d'achat ─────────────────────────────────
      // ATOMIQUE: event_key + ON CONFLICT DO NOTHING garantit un seul envoi
      // Même si invoiceCreated=false (facture existait déjà), on envoie l'email
      // La DB s'occupe de garantir zéro doublon via ON CONFLICT.
      if (email && invoiceNumber) {
        try {
          const siteUrl = await getStringConfig("branding.site_url");
          const amountPaidFormatted = (amountPaidPerChallengeCents / 100).toLocaleString(
            (language as string) === "fr" ? "fr-FR" : (language as string) === "es" ? "es-ES" : "en-GB",
            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
          );

          await sendPurchaseConfirmationEmail(
            email,
            {
              firstName: firstName || undefined,
              email,
              challengeAccountSize: accountSize,
              invoiceNumber,
              amountPaid: `${amountPaidFormatted} EUR`,
              paymentReference: session.id,
              invoiceUrl: `${siteUrl}/invoices/${invoiceNumber}`,
              siteUrl,
              logoUrl: (await getBrandingConfig()).logoUrl,
              language: (language as "fr" | "en" | "es") || "en",
            },
            {
              userId,
              eventKey: `purchase_confirmation:stripe:${session.id}`,
            }
          );
        } catch (e) { console.error("[stripe/webhook] Purchase confirmation email error:", e); }
      }
    });
  }

  return NextResponse.json({ received: true });
}
