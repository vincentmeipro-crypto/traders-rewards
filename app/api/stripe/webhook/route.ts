import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
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
    const { userId, accountSize, model } = session.metadata!;

    const supabase = await createClient();

    // Récupérer la taille numérique du compte
    const sizeMap: Record<string, number> = {
      "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
      "$100,000": 100000, "$200,000": 200000,
    };
    const size = sizeMap[accountSize] || 10000;

    // Créer le challenge dans Supabase
    await supabase.from("challenges").insert({
      user_id: userId,
      account_size: accountSize,
      model,
      status: "active",
      phase: "phase1",
      balance: size,
      start_balance: size,
      profit_target: model === "1step" ? 10 : 10,
      daily_drawdown_limit: model === "1step" ? 3 : 5,
      total_drawdown_limit: 10,
      trading_days: 0,
      stripe_session_id: session.id,
      amount_paid: (session.amount_total || 0) / 100,
    });

    // Envoyer l'email de confirmation
    const userEmail = session.customer_email || session.customer_details?.email;
    if (userEmail) {
      try {
        await sendWelcomeEmail(userEmail, accountSize, model);
      } catch (e) {
        console.error("Email error:", e);
      }
    }
  }

  return NextResponse.json({ received: true });
}
