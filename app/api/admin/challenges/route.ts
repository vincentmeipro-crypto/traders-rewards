import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPhase2Email, sendFundedEmail, sendFailedEmail, sendPhase1CertificateEmail, sendChallengeCertificateEmail, sendWelcomeEmail } from "@/lib/mailer";
import { createMT5Account, getMT5Group, changeMT5Group, disableMT5Account } from "@/lib/mt5";

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

  const status = challenge.status as string;
  if (status === "passed" || status === "funded") return null;

  const profitPct = ((balance - startBalance) / startBalance) * 100;
  const certDate = new Date().toLocaleDateString("fr-FR");

  // Helper : retire le profit + change groupe + reset DB (même compte MT5, économie $8)
  const transitionAccount = async (newGroup: string, newPhase: string, newStatus: string, newProfitTarget: number) => {
    const { data: claimed } = await admin.from("challenges").update({ status: "passed" }).eq("id", id).eq("status", "active").select().single();
    if (!claimed) return false;
    // Changer le groupe MT5 (pas de retrait sur les comptes challenge)
    if (oldLogin) {
      try { await changeMT5Group(oldLogin, newGroup); } catch (e) { console.error("changeMT5Group error:", e); }
    }
    // Reset DB sur la même ligne — pas de nouveau compte
    await admin.from("challenges").update({
      phase: newPhase, status: newStatus,
      balance: startBalance, highest_balance: startBalance,
      trading_days: 0, profit_target: newProfitTarget,
      daily_dd: 0, best_day_profit: 0,
      last_synced_at: new Date().toISOString(),
    }).eq("id", id);
    return true;
  };

  // 1-Step : Phase 1 -> Certifié (même compte MT5)
  if (is1Step && phase === "phase1" && profitPct >= profitTarget && tradingDays >= 4) {
    const ok = await transitionAccount(getMT5Group("1step", "funded"), "funded", "funded", 0);
    if (!ok) return null;
    try { await sendFundedEmail(userEmail, accountSize); } catch {}
    try { await sendChallengeCertificateEmail(userEmail, firstName, lastName, accountSize, certDate); } catch {}
    return "funded";
  }

  // 2-Step : Phase 1 -> Phase 2 (même compte MT5)
  if (!is1Step && phase === "phase1" && profitPct >= profitTarget && tradingDays >= 4) {
    const ok = await transitionAccount(getMT5Group("2step", "challenge"), "phase2", "active", 5);
    if (!ok) return null;
    try { await sendPhase2Email(userEmail, accountSize); } catch {}
    try { await sendPhase1CertificateEmail(userEmail, firstName, lastName, accountSize, certDate); } catch {}
    return "phase2";
  }

  // 2-Step : Phase 2 -> Certifié (même compte MT5)
  if (!is1Step && phase === "phase2" && profitPct >= profitTarget && tradingDays >= 4) {
    const ok = await transitionAccount(getMT5Group("2step", "funded"), "funded", "funded", 0);
    if (!ok) return null;
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

  // Générer lien setup mot de passe si user nouvellement créé
  let setupLink: string | undefined;
  const isNewUser = !users.find(u => u.email === userEmail);
  if (isNewUser) {
    try {
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: userEmail,
        options: { redirectTo: "https://www.elysium-rewards.com/reset-password" },
      });
      if (linkErr) console.error("generateLink error:", linkErr);
      setupLink = (linkData as { properties?: { action_link?: string } })?.properties?.action_link || undefined;
      console.log("setupLink generated:", !!setupLink);
    } catch (e) {
      console.error("generateLink exception:", e);
    }
  }

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
    // Si nouveau user sans lien généré, fallback vers reset-password
    const finalSetupLink = isNewUser
      ? (setupLink || `https://www.elysium-rewards.com/reset-password`)
      : undefined;
    await sendWelcomeEmail(
      userEmail, accountSize, model,
      mt5Login && mt5Password && mt5Server ? { login: mt5Login, password: mt5Password, server: mt5Server } : undefined,
      finalSetupLink
    );
  } catch (e) { console.error("sendWelcomeEmail error:", e); }

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

  // Compte déjà failed : on bloque toute logique de sync (évite les flashs répétés sur MT5)
  if (current?.status === "failed") {
    // Bloquer uniquement les updates de statut vers active
    if (updates.status === "active") delete updates.status;
    const { data, error } = await admin.from("challenges").update(updates).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { data: { users } } = await admin.auth.admin.listUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));
    return NextResponse.json({ ...data, user_email: userMap[data.user_id] || "" });
  }

  // Auto-increment trading_days if balance changed — once per calendar day only
  if (current && updates.balance !== undefined && updates.balance !== current.balance) {
    const lastSyncedDay = current.last_synced_at ? new Date(current.last_synced_at).toDateString() : null;
    const alreadyCountedToday = lastSyncedDay === new Date().toDateString();
    if (!alreadyCountedToday) {
      updates.trading_days = (current.trading_days || 0) + 1;
    }
    updates.last_synced_at = new Date().toISOString();
  }

  const { data, error } = await admin.from("challenges").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Helper : désactiver le compte MT5 (groupe disabled + disable account)
  const failMT5 = async (login: number) => {
    try { await changeMT5Group(login, "Starwave\\demo\\FX1\\grp5"); } catch {}
    try { await disableMT5Account(login); } catch {}
  };

  // Disable MT5 if manually set to failed
  if (updates.status === "failed" && data.mt5_login) {
    await failMT5(data.mt5_login);
  }

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));
  const userEmail = userMap[data.user_id] || "";

  const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", data.user_id).single();
  const firstName = profile?.first_name || "";
  const lastName = profile?.last_name || "";

  // Check drawdown violations (uniquement si le compte est encore actif)
  if (updates.balance !== undefined && current) {
    const totalDrawdownPct = ((data.start_balance - data.balance) / data.start_balance) * 100;
    const dailyDrawdownPct = current.balance > 0 ? ((current.balance - data.balance) / current.balance) * 100 : 0;

    if (totalDrawdownPct >= data.total_drawdown_limit) {
      await admin.from("challenges").update({ status: "failed" }).eq("id", id);
      try { await sendFailedEmail(userEmail, data.account_size, "total_drawdown"); } catch {}
      if (data.mt5_login) await failMT5(data.mt5_login);
      const { data: latest } = await admin.from("challenges").select("*").eq("id", id).single();
      return NextResponse.json({ ...latest, user_email: userEmail, transitioned: "failed_total_drawdown" });
    }

    if (dailyDrawdownPct >= data.daily_drawdown_limit) {
      await admin.from("challenges").update({ status: "failed" }).eq("id", id);
      try { await sendFailedEmail(userEmail, data.account_size, "daily_drawdown"); } catch {}
      if (data.mt5_login) await failMT5(data.mt5_login);
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
