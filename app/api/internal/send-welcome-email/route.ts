import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-api-key") !== process.env.MT5_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { challenge_id } = await req.json();
  if (!challenge_id) return NextResponse.json({ error: "Missing challenge_id" }, { status: 400 });

  const admin = createAdminClient();
  const { data: challenge } = await admin.from("challenges").select("*").eq("id", challenge_id).single();
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: { user } } = await admin.auth.admin.getUserById(challenge.user_id);
  const email = user?.email;
  if (!email) return NextResponse.json({ ok: true, skipped: "no email" });

  const isVip = challenge.model === "vip";
  const clientPassword = isVip ? challenge.mt5_password_investor : challenge.mt5_password;

  await sendWelcomeEmail(
    email,
    challenge.account_size,
    challenge.model,
    challenge.mt5_login && clientPassword && challenge.mt5_server
      ? { login: challenge.mt5_login, password: clientPassword, server: challenge.mt5_server }
      : undefined,
  );

  return NextResponse.json({ ok: true });
}
