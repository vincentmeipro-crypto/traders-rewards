import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPhase2Email, sendFundedEmail, sendFailedEmail, sendPhase1CertificateEmail, sendChallengeCertificateEmail, sendWelcomeEmail } from "@/lib/mailer";
import { createMT5Account, getMT5Group, disableMT5Account, withdrawMT5Balance, changeMT5Group } from "@/lib/mt5";

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

async function autoTransitionPhase(challenge: Record<string, unknown>, userEmail: string, firstName: string, lastName: string) {
  const admin = createAdminClient();
  const balance = challenge.balance as number;
  const startBalance = challenge.start_balance as number;
  const tradingDays = challenge.trading_days as number;
  const phase = challenge.phase as string;
  const model = ((challenge.model as string) ?? "2step").toLowerCase().replace(/[\s-]/g, "");
  const profitTarget = challenge.profit_target as number;
  const accountSize = challenge.account_size as string;
  const id = challenge.id as string;
  const userId = challenge.user_id as string;
  const dailyLimit = challenge.daily_drawdown_limit as number;
  const totalLimit = challenge.total_drawdown_limit as number;
  const oldLogin = challenge.mt5_login as number | null;
  const is1Step = model.includes("1step");

  const profitPct = ((balance - startBalance) / startBalance) * 100;
  const certDate = new Date().toLocaleDateString("fr-FR");

  const resetMT5Balance = async () => {
    if (!oldLogin) return;
    const profit = balance - startBalance;
    if (profit > 0) {
      try {
        await withdrawMT5Balance(oldLogin, profit, "Phase transition reset");
        console.log(`MT5 withdraw OK: login=${oldLogin} amount=${profit}`);
      } catch (e) {
        console.error(`MT5 withdraw FAILED: login=${oldLogin} amount=${profit}`, e);
      }
    } else {
      console.log(`MT5 withdraw skipped: profit=${profit} (no profit to withdraw)`);
    }
  };

  // 1-Step : Phase 1 -> Certified (meme compte, retrait profit + changement groupe)
  if (is1Step && phase === "phase1" && profitPct >= profitTarget && tradingDays >= 4) {
    await resetMT5Balance();
    if (oldLogin) await changeMT5Group(oldLogin, "Starwave\\demo\\FX1\\grp4").catch(() => {});
    await admin.from("challenges").update({
      phase: "funded", status: "funded", trading_days: 0, profit_target: 0,
      balance: startBalance, highest_balance: startBalance,
    }).eq("id", id);
    try { await sendFundedEmail(userEmail, accountSize); } catch {}
    try { await sendChallengeCertificateEmail(userEmail, firstName, lastName, accountSize, certDate); } catch {}
    return "funded";
  }

  // 2-Step : Phase 1 -> Phase 2 (meme compte, retrait profit)
  if (!is1Step && phase === "phase1" && profitPct >= profitTarget && tradingDays >= 4) {
    await resetMT5Balance();
    await admin.from("challenges").update({
      phase: "phase2", status: "active", trading_days: 0, profit_target: 5,
      balance: startBalance, highest_balance: startBalance,
    }).eq("id", id);
    try { await sendPhase2Email(userEmail, accountSize); } catch {}
    try { await sendPhase1CertificateEmail(userEmail, firstName, lastName, accountSize, certDate); } catch {}
    return "phase2";
  }

  // 2-Step : Phase 2 -> Certified (meme compte, retrait profit + changement groupe)
  if (!is1Step && phase === "phase2" && profitPct >= profitTarget && tradingDays >= 4) {
    await resetMT5Balance();
    if (oldLogin) await changeMT5Group(oldLogin, "Starwave\\demo\\FX1\\grp3").catch(() => {});
    await admin.from("challenges").update({
      phase: "funded", status: "funded", trading_days: 0, profit_target: 0,
      balance: startBalance, highest_balance: startBalance,
    }).eq("id", id);
    try { await sendFundedEmail(userEmail, accountSize); } catch {}
    try { await sendChallengeCertificateEmail(userEmail, firstName, lastName, accountSize, certDate); } catch {}
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

  const { data: profiles } = await admin.from("profiles").select("*");
  const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));

  const result = (challenges || []).map(c => ({
    ...c,
    user_email: userMap[c.user_id] || "-",
    client_first_name: profileMap[c.user_id]?.first_name || "",
    client_last_name: profileMap[c.user_id]?.last_name || "",
    client_phone: profileMap[c.user_id]?.phone || "",
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const check = await checkAdmin(req);
  if (!check.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userEmail, firstName: formFirstName, lastName: formLastName, accountSize, model, amountPaid, createMT5 } = await req.json();
  const admin = createAdminClient();

  const { data: { users } } = await admin.auth.admin.listUsers();
  let user = users.find(u => u.email === userEmail);

  if (!user) {
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!";
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: userEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: formFirstName || "", last_name: formLastName || "" },
    });
    if (createErr || !created.user) return NextResponse.json({ error: `Impossible de creer l'utilisateur : ${createErr?.message}` }, { status: 500 });
    user = created.user;
  }

  if (formFirstName || formLastName) {
    await admin.from("profiles").upsert(
      { user_id: user.id, first_name: formFirstName || "", last_name: formLastName || "" },
      { onConflict: "user_id" }
    );
  }

  const sizeMap: Record<string, number> = {
    "$10,000": 10000, "$25,000": 25000, "$50,000": 50000, "$100,000": 100000, "$200,000": 200000,
  };
  const size = sizeMap[accountSize] || 10000;
  const firstName = formFirstName || user.user_metadata?.first_name || "Trader";
  const lastName = formLastName || user.user_metadata?.last_name || "";

  let mt5Login: number | null = null;
  let mt5Password: string | null = null;
  let mt5PasswordInvestor: string | null = null;
  let mt5Server: string | null = null;

  if (createMT5) {
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
    } catch (e) { console.error("MT5 error:", e); }
  }

  const { data, error } = await admin.from("challenges").insert({
    user_id: user.id,
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
    amount_paid: amountPaid || 0,
    mt5_login: mt5Login,
    mt5_password: mt5Password,
    mt5_password_investor: mt5PasswordInvestor,
    mt5_server: mt5Server,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await sendWelcomeEmail(userEmail, accountSize, model,
      mt5Login && mt5Password && mt5Server ? { login: mt5Login, password: mt5Password, server: mt5Server } : undefined
    );
  } catch {}

  return NextResponse.json({ ok: true, challenge: data });
}

export async function DELETE(req: NextRequest) {
  const check = await checkAdmin(req);
  if (!check.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("challenges").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const check = await checkAdmin(req);
  if (!check.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await req.json();
  const admin = createAdminClient();

  const { data: current } = await admin.from("challenges").select("*").eq("id", id).single();

  // Auto-increment trading_days if balance changed — once per calendar day only
  if (current && updates.balance !== undefined && updates.balance !== current.balance) {
    const lastSyncedDay = current.last_synced_at ? new Date(current.last_synced_at).toDateString() : null;
    const alreadyCountedToday = lastSyncedDay === new Date().toDateString();
    if (!alreadyCountedToday) {
      updates.trading_days = (current.trading_days || 0) + 1;
    }
    updates.last_synced_at = new Date().toISOString();
  }

  // Proteger le statut "failed" contre un ecrasement accidentel
  if (current?.status === "failed" && updates.status === "active") {
    delete updates.status;
  }

  const { data, error } = await admin.from("challenges").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Disable MT5 if manually set to failed
  if (updates.status === "failed" && data.mt5_login) {
    try { await disableMT5Account(data.mt5_login); } catch {}
  }

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));
  const userEmail = userMap[data.user_id] || "";

  const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", data.user_id).single();
  const firstName = profile?.first_name || "";
  const lastName = profile?.last_name || "";

  // Check drawdown violations
  if (updates.balance !== undefined && current) {
    const totalDrawdownPct = ((data.start_balance - data.balance) / data.start_balance) * 100;
    const dailyDrawdownPct = current.balance > 0 ? ((current.balance - data.balance) / current.balance) * 100 : 0;

    if (totalDrawdownPct >= data.total_drawdown_limit) {
      await admin.from("challenges").update({ status: "failed" }).eq("id", id);
      try { await sendFailedEmail(userEmail, data.account_size, "total_drawdown"); } catch {}
      if (data.mt5_login) try { await disableMT5Account(data.mt5_login); } catch {}
      const { data: latest } = await admin.from("challenges").select("*").eq("id", id).single();
      return NextResponse.json({ ...latest, user_email: userEmail, transitioned: "failed_total_drawdown" });
    }

    if (dailyDrawdownPct >= data.daily_drawdown_limit) {
      await admin.from("challenges").update({ status: "failed" }).eq("id", id);
      try { await sendFailedEmail(userEmail, data.account_size, "daily_drawdown"); } catch {}
      if (data.mt5_login) try { await disableMT5Account(data.mt5_login); } catch {}
      const { data: latest } = await admin.from("challenges").select("*").eq("id", id).single();
      return NextResponse.json({ ...latest, user_email: userEmail, transitioned: "failed_daily_drawdown" });
    }
  }

  // Auto-transition — jamais sur un compte failed
  const transitioned = data.status !== "failed"
    ? await autoTransitionPhase(data, userEmail, firstName, lastName)
    : null;

  const { data: latest } = await admin.from("challenges").select("*").eq("id", id).single();
  return NextResponse.json({ ...latest, user_email: userEmail, transitioned });
}
