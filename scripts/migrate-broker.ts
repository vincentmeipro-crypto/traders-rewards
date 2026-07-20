/**
 * Script de migration vers un nouveau serveur broker
 * Usage: npx tsx --env-file=.env.local scripts/migrate-broker.ts
 *
 * Pour chaque compte sur l'ancien serveur :
 *  1. Lit la balance réelle MT5 (avec profit/perte)
 *  2. Crée un nouveau compte MT5 sur le nouveau serveur
 *  3. Reporte la balance exacte (start_balance + profit ou - perte)
 *  4. Met à jour le nom MT5 avec la phase (ex: Bruno Penard | Phase 1)
 *  5. Met à jour Supabase (login, password, server, balance)
 *  6. Envoie l'email au client avec les nouveaux identifiants
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MT5_URL    = process.env.MT5_API_URL!;
const MT5_SECRET = process.env.MT5_API_SECRET!;
const NEW_SERVER = "XyloMarkets-Server";

const PHASE_LABEL: Record<string, string> = {
  phase1:  "Phase 1",
  phase2:  "Phase 2",
  funded:  "Reward",
  instant: "Reward",
};

const GROUP_MAP: Record<string, string> = {
  "2step":        "HAR\\MAN32\\demoG1",
  "1step":        "HAR\\MAN32\\demoG2",
  "funded_2step": "HAR\\MAN32\\demoG3",
  "funded_1step": "HAR\\MAN32\\demoG4",

  "disabled":     "HAR\\MAN32\\demoG5",
};

const SIZE_LABELS: Record<number, string> = {
  10000: "$10,000", 25000: "$25,000", 50000: "$50,000",
  100000: "$100,000", 200000: "$200,000",
};

function getGroup(model: string, phase: string): string {
  if (phase === "funded") return GROUP_MAP[`funded_${model}`] ?? GROUP_MAP["2step"];
  return GROUP_MAP[model] ?? GROUP_MAP["2step"];
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── MT5 API helpers ──────────────────────────────────────────────────────────

async function mt5Get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${MT5_URL}${path}`, { headers: { "x-api-key": MT5_SECRET } });
    if (!res.ok) return null;
    return res.json() as T;
  } catch { return null; }
}

async function mt5Post<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${MT5_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": MT5_SECRET },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MT5 ${path} failed: ${await res.text()}`);
  return res.json() as T;
}

async function getMT5Balance(login: number): Promise<number | null> {
  const data = await mt5Get<{ balance?: number }>(`/accounts/${login}`);
  return data?.balance ?? null;
}

async function createMT5Account(params: {
  firstName: string; lastName: string; email: string;
  leverage: number; group: string; accountSize: string;
}): Promise<{ login: number; password: string; password_investor: string; server: string }> {
  return mt5Post("/accounts/create", {
    first_name: params.firstName, last_name: params.lastName,
    email: params.email, leverage: params.leverage,
    group: params.group, account_size: params.accountSize,
  });
}

async function adjustMT5Balance(login: number, amount: number, comment: string) {
  if (amount === 0) return;
  if (amount > 0) {
    await mt5Post("/accounts/add-balance", { login, amount, comment });
  } else {
    await mt5Post("/accounts/withdraw", { login, amount: Math.abs(amount), comment });
  }
}

async function updateMT5Name(login: number, firstName: string, lastName: string, phaseLabel: string) {
  await mt5Post(`/accounts/${login}/update-name`, {
    first_name: firstName,
    last_name: lastName,
    label: phaseLabel,
  });
}

// ── Email ────────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Traders Rewards <contact@traders-rewards.eu>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`);
}

async function sendMigrationEmail(opts: {
  to: string;
  firstName: string;
  accountSize: string;
  phase: string;
  login: number;
  password: string;
  server: string;
  realBalance: number;
  startBalance: number;
}) {
  const { to, firstName, accountSize, phase, login, password, server, realBalance, startBalance } = opts;
  const phaseLabel = PHASE_LABEL[phase] ?? phase;
  const profit = realBalance - startBalance;
  const profitSign = profit >= 0 ? "+" : "-";
  const profitColor = profit >= 0 ? "#22c55e" : "#ef4444";
  const balFmt = `$${realBalance.toLocaleString("fr-FR")}`;

  const profitRow = profit !== 0 ? `
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08)">
      <span style="color:rgba(255,255,255,0.45);font-size:12px">PROFIT / PERTE REPORTÉ</span><br>
      <span style="color:${profitColor};font-size:14px;font-weight:700;font-family:monospace">
        ${profitSign}$${Math.abs(profit).toLocaleString("fr-FR")}
      </span>
    </div>` : "";

  await sendEmail(to, "Vos nouveaux identifiants MT5 — Traders Rewards", `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px">
      <h2 style="color:#fff;margin-bottom:4px">Mise à jour de votre compte MT5</h2>
      <p style="color:rgba(255,255,255,0.4);font-size:13px;margin-bottom:24px">${accountSize} — ${phaseLabel}</p>
      <p style="color:rgba(255,255,255,0.6);margin-bottom:24px">
        Bonjour ${firstName},<br><br>
        Nous avons migré notre infrastructure vers un nouveau serveur broker.
        Voici vos <strong>nouveaux identifiants MT5</strong> à utiliser dès maintenant.
        L'ancien serveur n'est plus actif.
      </p>
      <div style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;margin-bottom:20px">
        <div style="margin-bottom:12px">
          <span style="color:rgba(255,255,255,0.45);font-size:12px">SERVEUR</span><br>
          <span style="color:#3b82f6;font-size:16px;font-weight:700;font-family:monospace">${server}</span>
        </div>
        <div style="margin-bottom:12px">
          <span style="color:rgba(255,255,255,0.45);font-size:12px">LOGIN</span><br>
          <span style="color:#fff;font-size:16px;font-weight:700;font-family:monospace">${login}</span>
        </div>
        <div style="margin-bottom:12px">
          <span style="color:rgba(255,255,255,0.45);font-size:12px">MOT DE PASSE</span><br>
          <span style="color:#fff;font-size:16px;font-weight:700;font-family:monospace">${password}</span>
        </div>
        <div>
          <span style="color:rgba(255,255,255,0.45);font-size:12px">BALANCE TRANSFÉRÉE</span><br>
          <span style="color:#22c55e;font-size:16px;font-weight:700;font-family:monospace">${balFmt}</span>
        </div>
        ${profitRow}
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:12px">
        Connectez-vous à votre
        <a href="https://www.traders-rewards.eu/dashboard" style="color:#3b82f6">dashboard</a>
        pour retrouver vos identifiants à tout moment.
      </p>
    </div>
  `);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Recherche des challenges avec ancien serveur...");

  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("id, user_id, mt5_login, mt5_server, account_size, model, phase, balance, start_balance, status")
    .not("mt5_server", "eq", NEW_SERVER)
    .not("mt5_login", "is", null);

  if (error) { console.error("Supabase error:", error); process.exit(1); }
  if (!challenges?.length) { console.log("Aucun compte a migrer."); return; }

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userById = new Map(users.map(u => [u.id, u]));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", challenges.map(c => c.user_id));
  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

  console.log(`${challenges.length} compte(s) a migrer :\n`);
  for (const c of challenges) {
    const user = userById.get(c.user_id);
    console.log(`  - ${user?.email} | login ${c.mt5_login} | ${c.account_size} ${c.model} ${c.phase} | serveur: ${c.mt5_server}`);
  }
  console.log();

  let migrated = 0;
  for (const c of challenges) {
    const user      = userById.get(c.user_id);
    const profile   = profileMap.get(c.user_id);
    const email     = user?.email ?? "";
    const firstName = profile?.first_name ?? email.split("@")[0];
    const lastName  = profile?.last_name  ?? "";
    const startBalance  = c.start_balance ?? c.balance ?? 10000;
    const phaseLabel    = PHASE_LABEL[c.phase] ?? c.phase;
    const group         = getGroup(c.model, c.phase);
    const accountSize   = SIZE_LABELS[startBalance] ?? c.account_size ?? "$10,000";

    console.log(`Migration: ${email} (${accountSize} ${c.model} ${c.phase})`);

    // 1. Lire la balance réelle sur l'ancien compte
    const realBalance = await getMT5Balance(c.mt5_login) ?? startBalance;
    const balanceDiff = realBalance - startBalance;
    console.log(`  balance depart: $${startBalance} | balance reelle: $${realBalance} | diff: ${balanceDiff >= 0 ? "+" : ""}$${balanceDiff.toFixed(2)}`);

    try {
      // 2. Créer le nouveau compte (crédite start_balance automatiquement)
      const newAcc = await createMT5Account({ firstName, lastName, email, leverage: 100, group, accountSize });
      console.log(`  Compte cree: login ${newAcc.login}`);
      await delay(800);

      // 3. Reporter le profit ou la perte
      if (Math.abs(balanceDiff) > 0.01) {
        await adjustMT5Balance(newAcc.login, balanceDiff,
          balanceDiff > 0
            ? `Migration profit depuis ${c.mt5_login}`
            : `Migration perte depuis ${c.mt5_login}`
        );
        console.log(`  Balance ajustee: ${balanceDiff >= 0 ? "+" : ""}$${balanceDiff.toFixed(2)}`);
        await delay(500);
      }

      // 4. Nommer le compte avec la phase
      await updateMT5Name(newAcc.login, firstName, lastName, phaseLabel);
      console.log(`  Nom MT5: ${firstName} ${lastName} | ${phaseLabel}`);
      await delay(500);

      // 5. Mettre à jour Supabase (credentials + balance réelle)
      await supabase.from("challenges").update({
        mt5_login:            newAcc.login,
        mt5_password:         newAcc.password,
        mt5_password_investor: newAcc.password_investor,
        mt5_server:           NEW_SERVER,
        balance:              realBalance,
        last_synced_at:       new Date().toISOString(),
      }).eq("id", c.id);
      console.log(`  Supabase mis a jour (balance: $${realBalance})`);

      // 6. Email client
      await sendMigrationEmail({
        to: email,
        firstName,
        accountSize,
        phase: c.phase,
        login: newAcc.login,
        password: newAcc.password,
        server: NEW_SERVER,
        realBalance,
        startBalance,
      });
      console.log(`  Email envoye a ${email}\n`);

      migrated++;
      await delay(1500);
    } catch (err) {
      console.error(`  ERREUR pour ${email}:`, err);
    }
  }

  console.log(`\nMigration terminee: ${migrated}/${challenges.length} comptes migres.`);
}

main().catch(console.error);
