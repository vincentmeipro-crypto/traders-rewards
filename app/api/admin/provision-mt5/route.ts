import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMT5Account, getMT5Group } from "@/lib/mt5";
import { sendWelcomeEmail } from "@/lib/mailer";


export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId } = await req.json();
  if (!challengeId) return NextResponse.json({ error: "Missing challengeId" }, { status: 400 });

  const admin = createAdminClient();

  // Get challenge info
  const { data: challenge, error: cErr } = await admin
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (cErr || !challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  if (challenge.mt5_login) return NextResponse.json({ error: "MT5 already provisioned", login: challenge.mt5_login }, { status: 400 });

  // Get user info
  const { data: { user } } = await admin.auth.admin.getUserById(challenge.user_id);
  const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", challenge.user_id).single();

  const firstName = user?.user_metadata?.first_name || profile?.first_name || "Trader";
  const lastName  = user?.user_metadata?.last_name  || profile?.last_name  || "";
  const email     = user?.email || "";

  // Create MT5 account
  try {
    const mt5Phase = challenge.model === "vip" ? "Algo | Phase 1" : "Trader | Phase 1";
    const mt5Account = await createMT5Account({
      firstName,
      lastName,
      email,
      leverage: 100,
      group: getMT5Group(challenge.model),
      account_size: challenge.account_size,
      label: mt5Phase,
    });

    // Update challenge with MT5 credentials
    await admin.from("challenges").update({
      mt5_login:             mt5Account.login,
      mt5_password:          mt5Account.password,
      mt5_password_investor: mt5Account.password_investor,
      mt5_server:            mt5Account.server,
    }).eq("id", challengeId);

    // Send welcome email with credentials
    if (email) {
      try {
        await sendWelcomeEmail(email, challenge.account_size, challenge.model, {
          login: mt5Account.login,
          password: mt5Account.password,
          server: mt5Account.server,
        });
      } catch (emailErr) {
        console.error("Welcome email failed:", emailErr);
      }
    }

    return NextResponse.json({
      ok: true,
      login: mt5Account.login,
      password: mt5Account.password,
      server: mt5Account.server,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
