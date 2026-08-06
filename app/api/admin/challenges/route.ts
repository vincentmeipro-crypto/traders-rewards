import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFundedEmail, sendFailedEmail, sendWelcomeEmail, sendPhase1CertificateEmail, sendChallengeCertificateEmail, sendPhase2Email } from "@/lib/mailer";
import { createMT5Account, getMT5Group, changeMT5Group, disableMT5Account, getMT5Account, updateMT5AccountName, addMT5Balance, withdrawMT5Balance, enableMT5Account } from "@/lib/mt5";

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

async function autoTransitionPhase(challenge: Record<string, unknown>) {
  const admin = createAdminClient();
  const balance = challenge.balance as number;
  const startBalance = challenge.start_balance as number;
  const tradingDays = challenge.trading_days as number;
  const phase = challenge.phase as string;
  const model = ((challenge.model as string) ?? "2step").toLowerCase().replace(/[\s-]/g, "");
  const profitTarget = challenge.profit_target as number;
  const id = challenge.id as string;
  const is1Step = model.includes("1step");

  const status = challenge.status as string;
  if (status === "passed" || status === "funded") return null;

  const profitPct = ((balance - startBalance) / startBalance) * 100;
  const conditionsMet = profitPct >= profitTarget && tradingDays >= 5;

  if (!conditionsMet) return null;

  // Phase passée : on marque uniquement "passed", sans créer de compte ni changer de groupe
  const isPhase1 = phase === "phase1";
  const isPhase2 = !is1Step && phase === "phase2";
  if (!isPhase1 && !isPhase2) return null;

  const { data: claimed } = await admin.from("challenges").update({ status: "passed" }).eq("id", id).eq("status", "active").select().single();
  if (!claimed) return null;

  return "passed";
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

  const { userEmail, firstName: formFirstName, lastName: formLastName, accountSize, model, amountPaid, createMT5, type } = await req.json();
  const isReward = type === "reward";
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

  // Toujours générer un lien de création/reset de mot de passe (nouveau ET existant)
  let setupLink: string | undefined;
  try {
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: userEmail,
      options: { redirectTo: "https://www.traders-rewards.eu/reset-password" },
    });
    if (linkErr) console.error("generateLink error:", linkErr);
    setupLink = (linkData as { properties?: { action_link?: string } })?.properties?.action_link || undefined;
  } catch (e) {
    console.error("generateLink exception:", e);
  }

  let mt5Login: number | null = null;
  let mt5Password: string | null = null;
  let mt5PasswordInvestor: string | null = null;
  let mt5Server: string | null = null;

  if (createMT5) {
    try {
      const label = isReward ? "Reward" : "Phase 1";
      const mt5NameLabel = model === "vip" ? `Algo | ${label}` : `Trader | ${label}`;
      const mt5Account = await createMT5Account({
        firstName, lastName, email: userEmail,
        leverage: 100,
        group: isReward ? getMT5Group(model, "funded") : getMT5Group(model),
        account_size: accountSize,
        label: mt5NameLabel,
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
    status: isReward ? "funded" : "active",
    phase: isReward ? "funded" : "phase1",
    balance: size,
    start_balance: size,
    profit_target: isReward ? 0 : 10,
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

  const finalSetupLink = setupLink || `https://www.traders-rewards.eu/reset-password`;
  const certDate = new Date().toLocaleDateString("fr-FR");
  try {
    if (isReward) {
      await sendFundedEmail(userEmail, accountSize, mt5Login && mt5Password && mt5Server ? { login: mt5Login, password: mt5Password, server: mt5Server } : undefined, finalSetupLink, model);
      // sendChallengeCertificateEmail(userEmail, firstName, lastName, accountSize, certDate);
    } else {
      await sendWelcomeEmail(
        userEmail, accountSize, model,
        mt5Login && mt5Password && mt5Server ? { login: mt5Login, password: mt5Password, server: mt5Server } : undefined,
        finalSetupLink
      );
    }
  } catch (e) { console.error("sendEmail error:", e); }

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
    // Si la balance descend sous daily_low_equity, mettre à jour le plancher du jour
    if (updates.daily_low_equity === undefined) {
      const curLow = current.daily_low_equity ?? current.balance;
      if (updates.balance < curLow) {
        updates.daily_low_equity = updates.balance;
      }
    }
  }


  // Transition manuelle passed → phase2 ou funded : reset balance + trading_days + status
  const isPhaseTransition = updates.phase && updates.phase !== current?.phase && (current?.status === "passed" || current?.status === "active");
  if (isPhaseTransition) {
    updates.balance = current!.start_balance;
    updates.trading_days = 0;
    if (updates.phase === "phase2") { updates.status = "active"; updates.profit_target = 5; }
    if (updates.phase === "funded") updates.status = "funded";
  }

  // Garantir qu'il y a toujours au moins un champ à mettre à jour (évite l'erreur Supabase sur update vide)
  if (Object.keys(updates).length === 0) {
    updates.last_synced_at = current?.last_synced_at ?? new Date().toISOString();
  }

  const { data, error } = await admin.from("challenges").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Reset balance MT5 réelle lors d'une transition de phase
  if (isPhaseTransition && data.mt5_login) {
    try {
      const mt5Info = await getMT5Account(data.mt5_login);
      const realBalance = mt5Info.balance ?? 0;
      const target = current!.start_balance;
      const diff = realBalance - target;
      if (diff > 0.01) await withdrawMT5Balance(data.mt5_login, diff, "Phase transition reset");
      else if (diff < -0.01) await addMT5Balance(data.mt5_login, Math.abs(diff), "Phase transition reset");
      if (updates.phase === "funded") {
        try { await enableMT5Account(data.mt5_login); } catch {}
        try { await changeMT5Group(data.mt5_login, getMT5Group(data.model, "funded")); } catch {}
      }
    } catch (e) { console.error("MT5 phase reset error:", e); }
  }

  // Disable MT5 + sync balance réelle si passage en failed
  if (updates.status === "failed" && data.mt5_login) {
    try { await changeMT5Group(data.mt5_login, "HAR/MAN32/demoG5"); } catch (e) { console.error("changeMT5Group failed:", e); }
    try { await disableMT5Account(data.mt5_login); } catch (e) { console.error("disableMT5Account failed:", e); }
    // Sync balance réelle depuis MT5 (affiche la vraie perte dans les dashboards)
    try {
      const mt5Info = await getMT5Account(data.mt5_login);
      const realBalance = mt5Info.equity ?? mt5Info.balance;
      if (realBalance != null) {
        await admin.from("challenges").update({ balance: realBalance, last_synced_at: new Date().toISOString() }).eq("id", id);
      }
    } catch {}
  }

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));
  const userEmail = userMap[data.user_id] || "";

  const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", data.user_id).single();
  const firstName = profile?.first_name || "";
  const lastName = profile?.last_name || "";

  // Check drawdown violations (ignoré lors d'un reset de phase)
  if (updates.balance !== undefined && current && !isPhaseTransition) {
    const totalDrawdownPct = ((data.start_balance - data.balance) / data.start_balance) * 100;
    const dailyDrawdownPct = current.balance > 0 ? ((current.balance - data.balance) / current.balance) * 100 : 0;

    if (totalDrawdownPct >= data.total_drawdown_limit) {
      await admin.from("challenges").update({ status: "failed" }).eq("id", id);
      try { await sendFailedEmail(userEmail, data.account_size, "total_drawdown"); } catch {}
      if (data.mt5_login) {
        try { await changeMT5Group(data.mt5_login, "HAR/MAN32/demoG5"); } catch (e) { console.error("changeMT5Group total_drawdown failed:", e); }
        try { await disableMT5Account(data.mt5_login); } catch (e) { console.error("disableMT5Account total_drawdown failed:", e); }
      }
      const { data: latest } = await admin.from("challenges").select("*").eq("id", id).single();
      return NextResponse.json({ ...latest, user_email: userEmail, transitioned: "failed_total_drawdown" });
    }

    if (dailyDrawdownPct >= data.daily_drawdown_limit) {
      await admin.from("challenges").update({ status: "failed" }).eq("id", id);
      try { await sendFailedEmail(userEmail, data.account_size, "daily_drawdown"); } catch {}
      if (data.mt5_login) {
        try { await changeMT5Group(data.mt5_login, "HAR/MAN32/demoG5"); } catch (e) { console.error("changeMT5Group daily_drawdown failed:", e); }
        try { await disableMT5Account(data.mt5_login); } catch (e) { console.error("disableMT5Account daily_drawdown failed:", e); }
      }
      const { data: latest } = await admin.from("challenges").select("*").eq("id", id).single();
      return NextResponse.json({ ...latest, user_email: userEmail, transitioned: "failed_daily_drawdown" });
    }
  }

  // Emails automatiques lors d'une transition manuelle passed → phase suivante
  if (isPhaseTransition && userEmail) {
    const certDate = new Date().toLocaleDateString("fr-FR");
    if (data.phase === "phase2") {
      try { await sendPhase1CertificateEmail(userEmail, firstName, lastName, data.account_size, certDate); } catch (e) { console.error("sendPhase1CertificateEmail error:", e); }
      try { await sendPhase2Email(userEmail, data.account_size); } catch (e) { console.error("sendPhase2Email error:", e); }
    } else if (data.phase === "funded") {
      try { await sendChallengeCertificateEmail(userEmail, firstName, lastName, data.account_size, certDate); } catch (e) { console.error("sendChallengeCertificateEmail error:", e); }
      try { await sendFundedEmail(userEmail, data.account_size, undefined, undefined, data.model); } catch (e) { console.error("sendFundedEmail error:", e); }
    }
  }

  // Synchroniser le nom MT5 à chaque sauvegarde admin (phase actuelle + nom du profil)
  if (data.mt5_login && (firstName || lastName)) {
    const phaseLabel: Record<string, string> = { phase1: "Phase 1", phase2: "Phase 2", funded: "Reward" };
    const label = phaseLabel[data.phase] || "Phase 1";
    const isVip = data.model === "vip";
    const mt5Label = isVip ? `Algo | ${label}` : `Trader | ${label}`;
    try { await updateMT5AccountName(data.mt5_login, firstName, lastName, mt5Label); } catch {}
  }

  // Auto-transition — jamais sur un compte failed
  const transitioned = data.status !== "failed"
    ? await autoTransitionPhase(data)
    : null;

  const { data: latest } = await admin.from("challenges").select("*").eq("id", id).single();
  return NextResponse.json({ ...latest, user_email: userEmail, transitioned });
}
