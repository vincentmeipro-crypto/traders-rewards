import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";

function verifySign(body: Record<string, unknown>, apiKey: string): boolean {
  const { sign, ...rest } = body;
  const encoded = Buffer.from(JSON.stringify(rest)).toString("base64");
  const expected = crypto.createHash("md5").update(encoded + apiKey).digest("hex");
  return expected === sign;
}

export async function POST(req: NextRequest) {
  try {
    const body: Record<string, unknown> = await req.json();

    if (!verifySign(body, process.env.CRYPTOMUS_API_KEY!)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const status = body.status as string;
    if (status !== "paid" && status !== "paid_over") {
      return NextResponse.json({ received: true });
    }

    let additionalData: Record<string, string> = {};
    try {
      additionalData = JSON.parse(body.additional_data as string || "{}");
    } catch { /* ignore */ }

    const { userId, accountSize, model } = additionalData;
    if (!userId || !accountSize || !model) {
      return NextResponse.json({ received: true });
    }

    const admin = createAdminClient();

    const sizeMap: Record<string, number> = {
      "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
      "$100,000": 100000, "$200,000": 200000,
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
      amount_paid: parseFloat(body.amount as string || "0"),
    });

    const { data: { users } } = await admin.auth.admin.listUsers();
    const user = users.find(u => u.id === userId);
    if (user?.email) {
      try { await sendWelcomeEmail(user.email, accountSize, model); } catch {}
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Crypto webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
