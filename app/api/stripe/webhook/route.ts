import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";
import { createMT5Account, getMT5Group, updateMT5AccountName } from "@/lib/mt5";

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

    // CrÃ©er le compte MT5
    let mt5Login: number | null = null;
    let mt5Password: string | null = null;
    let mt5PasswordInvestor: string | null = null;
    let mt5Server: string | null = null;

    try {
      const mt5Account = await createMT5Account({
        firstName,
        lastName,
        email,
        leverage: 100,
        group: getMT5Group(model),
        account_size: accountSize,
      });
      mt5Login           = mt5Account.login;
      mt5Password        = mt5Account.password;
      mt5PasswordInvestor = mt5Account.password_investor;
      mt5Server          = mt5Account.server;
      const label = model === "instant" ? "Reward" : "Phase 1";
      try { await updateMT5AccountName(mt5Account.login, firstName, lastName, label); } catch {}
    } catch (e) {
      console.error("MT5 account creation failed:", e);
    }

    const isInstant = model === "instant";
    await admin.from("challenges").insert({
      user_id: userId,
      account_size: accountSize,
      model,
      status: isInstant ? "funded" : "active",
      phase: isInstant ? "funded" : "phase1",
      balance: size,
      start_balance: size,
      profit_target: isInstant ? 0 : 10,
      daily_drawdown_limit: (model === "1step" || isInstant) ? 3 : 5,
      total_drawdown_limit: (model === "1step" || isInstant) ? 8 : 10,
      trading_days: 0,
      stripe_session_id: session.id,
      amount_paid: (session.amount_total || 0) / 100,
      payment_method: "card",
      mt5_login:            mt5Login,
      mt5_password:         mt5Password,
      mt5_password_investor: mt5PasswordInvestor,
      mt5_server:           mt5Server,
    });

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

    const userEmail = session.customer_email || session.customer_details?.email;
    if (userEmail) {
      try {
        await sendWelcomeEmail(
          userEmail, accountSize, model,
          mt5Login && mt5Password && mt5Server
            ? { login: mt5Login, password: mt5Password, server: mt5Server }
            : undefined
        );
      } catch (e) { console.error("Email error:", e); }
    }
  }

  return NextResponse.json({ received: true });
}
