import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PRODUCTS: Record<string, { accountSize: string; model: string; balance: number }> = {
  "25k-2step":  { accountSize: "$25,000",  model: "2step", balance: 25000 },
  "50k-2step":  { accountSize: "$50,000",  model: "2step", balance: 50000 },
  "100k-2step": { accountSize: "$100,000", model: "2step", balance: 100000 },
  "200k-2step": { accountSize: "$200,000", model: "2step", balance: 200000 },
  "25k-1step":  { accountSize: "$25,000",  model: "1step", balance: 25000 },
  "50k-1step":  { accountSize: "$50,000",  model: "1step", balance: 50000 },
  "100k-1step": { accountSize: "$100,000", model: "1step", balance: 100000 },
  "200k-1step": { accountSize: "$200,000", model: "1step", balance: 200000 },
  "25k-vip":    { accountSize: "$25,000",  model: "vip",   balance: 25000 },
  "50k-vip":    { accountSize: "$50,000",  model: "vip",   balance: 50000 },
  "100k-vip":   { accountSize: "$100,000", model: "vip",   balance: 100000 },
  "200k-vip":   { accountSize: "$200,000", model: "vip",   balance: 200000 },
};

export async function POST(req: NextRequest) {
  try {
    const { productId, userId, promoCode } = await req.json();
    const product = PRODUCTS[productId];
    if (!product || !userId || !promoCode) return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const admin = createAdminClient();

    if (product.model !== "vip") {
      const SIZE_VALUES: Record<string, number> = { "$10,000": 10000, "$25,000": 25000, "$50,000": 50000, "$100,000": 100000, "$200,000": 200000 };
      const { data: activeChallenges } = await admin.from("challenges").select("account_size, model").eq("user_id", userId).in("status", ["active", "funded"]);
      const traderChallenges = (activeChallenges || []).filter((c: { model: string }) => c.model !== "vip");
      const currentTotal = traderChallenges.reduce((sum: number, c: { account_size: string }) => sum + (SIZE_VALUES[c.account_size] || 0), 0);
      if (currentTotal + (SIZE_VALUES[product.accountSize] || 0) > 200000) {
        return NextResponse.json({ error: `Plafond $200,000 atteint. Total actuel : $${currentTotal.toLocaleString()}` }, { status: 400 });
      }
    }

    // Re-validate the promo code server-side
    const { data: promo, error: promoErr } = await admin
      .from("promo_codes").select("*")
      .eq("code", promoCode.toUpperCase().trim()).single();

    if (promoErr || !promo) return NextResponse.json({ error: "Invalid promo code" }, { status: 400 });
    if (!promo.active) return NextResponse.json({ error: "Code revoked" }, { status: 400 });
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return NextResponse.json({ error: "Code expired" }, { status: 400 });
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return NextResponse.json({ error: "Code limit reached" }, { status: 400 });
    if (promo.discount_percent !== 100) return NextResponse.json({ error: "Not a 100% code" }, { status: 400 });

    // Get user info
    const { data: { user } } = await admin.auth.admin.getUserById(userId);
    const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", userId).single();
    const firstName = user?.user_metadata?.first_name || profile?.first_name || "Trader";
    const lastName  = user?.user_metadata?.last_name  || profile?.last_name  || "";

    // Create the challenge
    const { data: challenge } = await admin.from("challenges").insert({
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
    }).select("id").single();

    // Increment used_count
    await admin.from("promo_codes").update({ used_count: promo.used_count + 1 }).eq("id", promo.id);

    const challengeId = challenge?.id as string | undefined;
    const mt5Url = process.env.MT5_API_URL;
    const mt5Secret = process.env.MT5_API_SECRET;

    // Provision MT5 synchronously (after() requires Vercel Pro for guaranteed execution)
    if (mt5Url && mt5Secret && challengeId) {
      try {
        await fetch(`${mt5Url}/provision-challenge`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": mt5Secret },
          body: JSON.stringify({
            challenge_id: challengeId,
            first_name: firstName,
            last_name: lastName,
            email: user?.email || "",
            model: product.model,
            balance: product.balance,
          }),
        });
      } catch (e) { console.error("MT5 provision error:", e); }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
