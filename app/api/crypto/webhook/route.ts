import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";
import { createMT5Account, getMT5Group, updateMT5AccountName } from "@/lib/mt5";

const PRODUCTS: Record<string, { accountSize: string; model: string }> = {
  "10k-2step":  { accountSize: "$10,000",  model: "2step" },
  "25k-2step":  { accountSize: "$25,000",  model: "2step" },
  "50k-2step":  { accountSize: "$50,000",  model: "2step" },
  "100k-2step": { accountSize: "$100,000", model: "2step" },
  "10k-1step":  { accountSize: "$10,000",  model: "1step" },
  "25k-1step":  { accountSize: "$25,000",  model: "1step" },
  "50k-1step":  { accountSize: "$50,000",  model: "1step" },
  "100k-1step": { accountSize: "$100,000", model: "1step" },
  "50k-instant": { accountSize: "$50,000",  model: "instant" },
};

const SIZE_MAP: Record<string, number> = {
  "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
  "$100,000": 100000, "$200,000": 200000,
};

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

    // Parse order_id: "elysium~{userId}~{productId}~{timestamp}~{promoCode}"
    const orderId: string = body.order_id || "";
    const parts = orderId.split("~");
    if (parts.length < 3 || parts[0] !== "elysium") {
      return NextResponse.json({ received: true });
    }

    const userId = parts[1];
    const productId = parts[2];
    const promoCode = parts[4] || "";
    const refCode = parts[5] || "";
    const product = PRODUCTS[productId];

    if (!userId || !product) return NextResponse.json({ received: true });

    const { accountSize, model } = product;
    const size = SIZE_MAP[accountSize] || 10000;
    const admin = createAdminClient();

    // Prevent duplicate challenge creation for the same NowPayments payment
    const nowpaymentsId = body.payment_id?.toString() || "";
    if (nowpaymentsId) {
      const { data: existing } = await admin.from("challenges")
        .select("id").eq("stripe_session_id", nowpaymentsId).maybeSingle();
      if (existing) return NextResponse.json({ received: true, duplicate: true });
    }

    const isInstant = model === "instant";
    const { data: inserted, error: insertError } = await admin.from("challenges").insert({
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
      stripe_session_id: nowpaymentsId || null,
      amount_paid: Math.round(parseFloat(body.price_amount || "0") * 1e6) / 1e6,
      payment_method: "crypto",
    }).select("id").single();

    if (insertError) {
      console.error("Challenge insert error:", insertError);
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }
    const challengeId = inserted?.id as string;

    // Affiliate referral tracking
    if (refCode) {
      try {
        const { data: affiliate } = await admin.from("affiliates").select("user_id, commission_rate, total_earned").eq("code", refCode).single();
        if (affiliate && affiliate.user_id !== userId) {
          const rate = (affiliate.commission_rate || 10) / 100;
          const amountPaid = parseFloat(body.price_amount || "0");
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

    const { data: { users } } = await admin.auth.admin.listUsers();
    const user = users.find(u => u.id === userId);
    const userEmail = user?.email || "";
    const firstName = user?.user_metadata?.first_name || "Trader";
    const lastName = user?.user_metadata?.last_name || "";

    let mt5Login: number | null = null;
    let mt5Password: string | null = null;
    let mt5PasswordInvestor: string | null = null;
    let mt5Server: string | null = null;

    try {
      const mt5Account = await createMT5Account({
        firstName, lastName, email: userEmail,
        leverage: 100,
        group: getMT5Group(model),
        account_size: accountSize,
      });
      mt5Login = mt5Account.login;
      mt5Password = mt5Account.password;
      mt5PasswordInvestor = mt5Account.password_investor;
      mt5Server = mt5Account.server;
      const label = model === "instant" ? "Reward" : "Phase 1";
      try { await updateMT5AccountName(mt5Account.login, firstName, lastName, label); } catch {}
    } catch (e) { console.error("MT5 creation error:", e); }

    await admin.from("challenges").update({
      mt5_login: mt5Login,
      mt5_password: mt5Password,
      mt5_password_investor: mt5PasswordInvestor,
      mt5_server: mt5Server,
    }).eq("id", challengeId);

    if (userEmail) {
      try {
        await sendWelcomeEmail(userEmail, accountSize, model,
          mt5Login && mt5Password && mt5Server
            ? { login: mt5Login, password: mt5Password, server: mt5Server }
            : undefined
        );
      } catch {}
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Crypto webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
