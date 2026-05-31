import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";
import { createMT5Account, getMT5Group } from "@/lib/mt5";

const PRODUCTS: Record<string, { accountSize: string; model: string; balance: number }> = {
  "10k-2step":  { accountSize: "$10,000",  model: "2step", balance: 10000 },
  "25k-2step":  { accountSize: "$25,000",  model: "2step", balance: 25000 },
  "50k-2step":  { accountSize: "$50,000",  model: "2step", balance: 50000 },
  "100k-2step": { accountSize: "$100,000", model: "2step", balance: 100000 },
  "10k-1step":  { accountSize: "$10,000",  model: "1step", balance: 10000 },
  "25k-1step":  { accountSize: "$25,000",  model: "1step", balance: 25000 },
  "50k-1step":  { accountSize: "$50,000",  model: "1step", balance: 50000 },
  "100k-1step": { accountSize: "$100,000", model: "1step", balance: 100000 },
};

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, promoCode } = await req.json();
    const product = PRODUCTS[productId];
    if (!product || !userId || !promoCode) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const admin = createAdminClient();

    // Re-validate the promo code server-side
    const { data: promo, error: promoErr } = await admin
      .from("promo_codes").select("*")
      .eq("code", promoCode.toUpperCase().trim()).single();

    if (promoErr || !promo) return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
    if (!promo.active) return NextResponse.json({ error: "Code revoked" }, { status: 400 });
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return NextResponse.json({ error: "Code expired" }, { status: 400 });
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return NextResponse.json({ error: "Code limit reached" }, { status: 400 });
    if (promo.discount_percent !== 100) return NextResponse.json({ error: "Not a 100% code" }, { status: 400 });

    // Get user info for MT5
    const { data: { user } } = await admin.auth.admin.getUserById(userId);
    const firstName = user?.user_metadata?.first_name || "Trader";
    const lastName  = user?.user_metadata?.last_name  || "";
    const email     = user?.email || "";

    // Create MT5 account
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
        group: getMT5Group(product.model),
        account_size: product.accountSize,
      });
      mt5Login            = mt5Account.login;
      mt5Password         = mt5Account.password;
      mt5PasswordInvestor = mt5Account.password_investor;
      mt5Server           = mt5Account.server;
    } catch (e) {
      console.error("MT5 account creation failed:", e);
    }

    // Create the challenge
    await admin.from("challenges").insert({
      user_id: userId,
      account_size: product.accountSize,
      model: product.model,
      status: "active",
      phase: "phase1",
      balance: product.balance,
      start_balance: product.balance,
      profit_target: 10,
      daily_drawdown_limit: product.model === "1step" ? 3 : 5,
      total_drawdown_limit: 10,
      trading_days: 0,
      amount_paid: 0,
      mt5_login:             mt5Login,
      mt5_password:          mt5Password,
      mt5_password_investor: mt5PasswordInvestor,
      mt5_server:            mt5Server,
    });

    // Increment used_count
    await admin.from("promo_codes").update({ used_count: promo.used_count + 1 }).eq("id", promo.id);

    // Send welcome email with MT5 credentials
    if (user?.email) {
      try {
        await sendWelcomeEmail(
          user.email, product.accountSize, product.model,
          mt5Login && mt5Password && mt5Server
            ? { login: mt5Login, password: mt5Password, server: mt5Server }
            : undefined
        );
      } catch (emailErr) {
        console.error("Welcome email failed:", emailErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
