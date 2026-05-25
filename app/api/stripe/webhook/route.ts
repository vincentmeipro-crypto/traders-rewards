import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";

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
    const { userId, accountSize, model, promoCode } = session.metadata!;

    const admin = createAdminClient();

    const sizeMap: Record<string, number> = {
      "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
      "$100,000": 100000,
    };
    const size = sizeMap[accountSize] || 10000;

    await admin.from("challenges").insert({
      user_id: userId,
      account_size: accountSize,
      model,
      status: "active",
      phase: "phase1",
      balance: size,
      start_balance: size,
      profit_target: 10,
      daily_drawdown_limit: model === "1step" ? 3 : 5,
      total_drawdown_limit: 10,
      trading_days: 0,
      stripe_session_id: session.id,
      amount_paid: (session.amount_total || 0) / 100,
    });

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
      try { await sendWelcomeEmail(userEmail, accountSize, model); } catch (e) { console.error("Email error:", e); }
    }
  }

  return NextResponse.json({ received: true });
}
