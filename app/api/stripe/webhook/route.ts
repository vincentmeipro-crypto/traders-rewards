import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";
import { getChallengeDefaults } from "@/lib/config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
    const { userId, accountSize, model, promoCode, refCode } = session.metadata!;

    const admin = createAdminClient();

    // Idempotency check — évite le double traitement si Stripe renvoie l'événement
    const { data: existing } = await admin.from("challenges").select("id").eq("stripe_session_id", session.id).single();
    if (existing) return NextResponse.json({ received: true, skipped: "duplicate" });

    const sizeMap: Record<string, number> = {
      "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
      "$100,000": 100000, "$200,000": 200000,
    };
    const size = sizeMap[accountSize] || 10000;

    // Récupérer les infos du user pour MT5
    const { data: userData } = await admin.auth.admin.getUserById(userId);
    const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", userId).single();
    const firstName = userData?.user?.user_metadata?.first_name || profile?.first_name || session.customer_details?.name?.split(" ")[0] || "Trader";
    const lastName  = userData?.user?.user_metadata?.last_name  || profile?.last_name  || session.customer_details?.name?.split(" ").slice(1).join(" ") || "";
    const email     = userData?.user?.email || session.customer_details?.email || "";

    // V2 Phase 1 : paramètres challenge depuis settings (fallback hardcodé si Supabase indisponible)
    const challengeDefaults = await getChallengeDefaults();

    const { data: inserted } = await admin.from("challenges").insert({
      user_id: userId,
      account_size: accountSize,
      model,
      status: "active",
      phase: "phase1",
      balance: size,
      start_balance: size,
      profit_target: challengeDefaults.profitTarget,
      daily_drawdown_limit: model === "1step" ? challengeDefaults.dailyDd1step : challengeDefaults.dailyDd2step,
      total_drawdown_limit: challengeDefaults.totalDdDefault,
      trading_days: 0,
      stripe_session_id: session.id,
      amount_paid: (session.amount_total || 0) / 100,
      payment_method: "card",
    }).select("id").single();

    const challengeId = inserted?.id as string | undefined;

    // Provision MT5 synchronously (after() requires Vercel Pro for guaranteed execution)
    if (challengeId) {
      try {
        const mt5Res = await fetch(`${process.env.MT5_API_URL}/provision-challenge`, {
          method: "POST",
          headers: { "x-api-key": process.env.MT5_API_SECRET!, "Content-Type": "application/json" },
          body: JSON.stringify({ challenge_id: challengeId, first_name: firstName, last_name: lastName, email, model, balance: size }),
        });
        if (mt5Res.ok) {
          const mt5Data = await mt5Res.json();
          if (mt5Data.ok && mt5Data.login) {
            // Update Supabase from Vercel as well (VPS _supabase_patch may fail if env vars not set)
            await admin.from("challenges").update({
              mt5_login:             mt5Data.login,
              mt5_password:          mt5Data.password,
              mt5_password_investor: mt5Data.password_investor,
              mt5_server:            mt5Data.server,
            }).eq("id", challengeId);
            if (email) {
              try {
                await sendWelcomeEmail(email, accountSize, model, {
                  login: mt5Data.login,
                  password: mt5Data.password,
                  server: mt5Data.server,
                });
              } catch (e) { console.error("Welcome email failed:", e); }
            }
          }
        }
      } catch (e) { console.error("MT5 provision error:", e); }
    }

    // Affiliate referral tracking
    if (refCode) {
      try {
        const { data: affiliate } = await admin.from("affiliates").select("user_id, commission_rate, total_earned").eq("code", refCode).single();
        if (affiliate && affiliate.user_id !== userId) {
          const rate = (affiliate.commission_rate || 10) / 100;
          const amountPaid = (session.amount_total || 0) / 100;
          const commission = Math.round(amountPaid * rate * 100) / 100;
          await admin.from("affiliate_referrals").insert({
            affiliate_user_id: affiliate.user_id,
            referred_user_id: userId,
            purchase_amount: amountPaid,
            commission_amount: commission,
            status: "pending",
          });
          await admin.from("affiliates").update({ total_earned: (affiliate.total_earned || 0) + commission }).eq("user_id", affiliate.user_id);
        }
      } catch (e) { console.error("Affiliate referral error:", e); }
    }

    // Increment promo code usage if applicable
    if (promoCode) {
      const { data: promo } = await admin
        .from("promo_codes").select("id, used_count")
        .eq("code", promoCode).single();
      if (promo) {
        await admin.from("promo_codes")
          .update({ used_count: promo.used_count + 1 })
          .eq("id", promo.id);
      }
    }

  }

  return NextResponse.json({ received: true });
}
