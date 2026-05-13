import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPhase2Email, sendFundedEmail } from "@/lib/mailer";

const ADMIN_EMAIL = "vincentmeipro@gmail.com";

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { ok: false, reason: "no token" };
  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { ok: false, reason: error?.message || "no user" };
  if (user.email !== ADMIN_EMAIL) return { ok: false, reason: `email mismatch: ${user.email}` };
  return { ok: true, reason: "ok" };
}

async function autoTransitionPhase(challenge: Record<string, unknown>, userEmail: string) {
  const admin = createAdminClient();
  const balance = challenge.balance as number;
  const startBalance = challenge.start_balance as number;
  const tradingDays = challenge.trading_days as number;
  const phase = challenge.phase as string;
  const profitTarget = challenge.profit_target as number;
  const accountSize = challenge.account_size as string;
  const id = challenge.id as string;

  const profitPct = ((balance - startBalance) / startBalance) * 100;

  // Phase 1 → Phase 2
  if (phase === "phase1" && profitPct >= profitTarget && tradingDays >= 4) {
    await admin.from("challenges").update({
      phase: "phase2",
      balance: startBalance,
      profit_target: 5,
      trading_days: 0,
      status: "active",
    }).eq("id", id);

    try { await sendPhase2Email(userEmail, accountSize); } catch (e) { console.error("Email error:", e); }
    return "phase2";
  }

  // Phase 2 → Funded
  if (phase === "phase2" && profitPct >= profitTarget && tradingDays >= 4) {
    await admin.from("challenges").update({
      phase: "funded",
      status: "funded",
    }).eq("id", id);

    try { await sendFundedEmail(userEmail, accountSize); } catch (e) { console.error("Email error:", e); }
    return "funded";
  }

  return null;
}

export async function GET(req: NextRequest) {
  const check = await checkAdmin(req);
  if (!check.ok) return NextResponse.json({ error: "Unauthorized", reason: check.reason }, { status: 401 });

  const admin = createAdminClient();
  const { data: challenges } = await admin
    .from("challenges")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));
  const result = (challenges || []).map(c => ({ ...c, user_email: userMap[c.user_id] || "—" }));

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const check = await checkAdmin(req);
  if (!check.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin.from("challenges").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user email for notifications
  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));
  const userEmail = userMap[data.user_id] || "";

  // Auto-transition check after update
  const transitioned = await autoTransitionPhase(data, userEmail);

  // Return updated challenge
  const { data: latest } = await admin.from("challenges").select("*").eq("id", id).single();
  return NextResponse.json({ ...latest, user_email: userEmail, transitioned });
}
