/**
 * Script de migration vers un nouveau serveur broker
 * Usage: npx tsx scripts/migrate-broker.ts
 *
 * - Trouve tous les challenges avec l'ancien serveur
 * - Crée de nouveaux comptes MT5 sur le nouveau serveur
 * - Met à jour Supabase avec les nouveaux credentials
 * - Envoie un email à chaque client avec ses nouveaux identifiants
 */

import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const smtp = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT!),
  secure: true,
  auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
});

const MT5_URL    = process.env.MT5_API_URL!;
const MT5_SECRET = process.env.MT5_API_SECRET!;
const NEW_SERVER = "XyloMarkets-Server";

const GROUP_MAP: Record<string, string> = {
  "2step":        "HAR\\MAN32\\demoG1",
  "1step":        "HAR\\MAN32\\demoG2",
  "funded_2step": "HAR\\MAN32\\demoG3",
  "funded_1step": "HAR\\MAN32\\demoG4",
  "instant":      "HAR\\MAN32\\demoG4",
  "disabled":     "HAR\\MAN32\\demoG5",
};

function getGroup(model: string, phase: string): string {
  if (phase === "funded") return GROUP_MAP[`funded_${model}`] ?? GROUP_MAP["2step"];
  return GROUP_MAP[model] ?? GROUP_MAP["2step"];
}

async function createMT5Account(params: {
  firstName: string; lastName: string; email: string;
  leverage: number; group: string; accountSize: string;
}) {
  const res = await fetch(`${MT5_URL}/accounts/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": MT5_SECRET },
    body: JSON.stringify({
      first_name: params.firstName, last_name: params.lastName,
      email: params.email, leverage: params.leverage,
      group: params.group, account_size: params.accountSize,
    }),
  });
  if (!res.ok) throw new Error(`MT5 create failed: ${await res.text()}`);
  return res.json() as Promise<{ login: number; password: string; password_investor: string; server: string }>;
}

async function sendMigrationEmail(to: string, firstName: string, accountSize: string, mt5: { login: number; password: string; server: string }) {
  const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px">
        <h2 style="color:#fff;margin-bottom:8px">Mise à jour de votre compte MT5</h2>
        <p style="color:rgba(255,255,255,0.6);margin-bottom:24px">
          Bonjour ${firstName},<br><br>
          Nous avons migré notre infrastructure vers un nouveau serveur broker.
          Voici vos <strong>nouveaux identifiants MT5</strong> à utiliser dès maintenant.
          L'ancien serveur n'est plus actif.
        </p>
        <div style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:20px;margin-bottom:24px">
          <div style="margin-bottom:12px">
            <span style="color:rgba(255,255,255,0.45);font-size:12px">SERVEUR</span><br>
            <span style="color:#3b82f6;font-size:16px;font-weight:700;font-family:monospace">${mt5.server}</span>
          </div>
          <div style="margin-bottom:12px">
            <span style="color:rgba(255,255,255,0.45);font-size:12px">LOGIN</span><br>
            <span style="color:#fff;font-size:16px;font-weight:700;font-family:monospace">${mt5.login}</span>
          </div>
          <div>
            <span style="color:rgba(255,255,255,0.45);font-size:12px">MOT DE PASSE</span><br>
            <span style="color:#fff;font-size:16px;font-weight:700;font-family:monospace">${mt5.password}</span>
          </div>
        </div>
        <p style="color:rgba(255,255,255,0.45);font-size:12px">
          Votre balance de ${accountSize} a été transférée sur le nouveau compte.<br>
          Connectez-vous à votre dashboard pour retrouver vos identifiants à tout moment.
        </p>
      </div>
    `;
  await smtp.sendMail({
    from: `"Traders Rewards" <${process.env.SMTP_USER}>`,
    to,
    subject: "Vos nouveaux identifiants MT5 — Traders Rewards",
    html,
  });
}

async function main() {
  console.log("🔍 Recherche des challenges avec ancien serveur...");

  // Fetch challenges NOT on the new server
  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("id, user_id, mt5_login, mt5_server, account_size, model, phase, balance, start_balance, status")
    .not("mt5_server", "eq", NEW_SERVER)
    .not("mt5_login", "is", null);

  if (error) { console.error("Supabase error:", error); process.exit(1); }
  if (!challenges?.length) { console.log("✅ Aucun compte à migrer."); return; }

  // Get all auth users + profiles
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userById  = new Map(users.map(u => [u.id, u]));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", challenges.map(c => c.user_id));
  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

  console.log(`📋 ${challenges.length} compte(s) à migrer :\n`);
  for (const c of challenges) {
    const user = userById.get(c.user_id);
    console.log(`  - ${user?.email} | login ${c.mt5_login} | ${c.account_size} ${c.model} ${c.phase} | serveur: ${c.mt5_server}`);
  }
  console.log();

  let migrated = 0;
  for (const c of challenges) {
    const user    = userById.get(c.user_id);
    const profile = profileMap.get(c.user_id);
    const email     = user?.email ?? "";
    const firstName = profile?.first_name ?? email.split("@")[0];
    const lastName  = profile?.last_name  ?? "";
    const balance   = c.start_balance ?? c.balance ?? 10000;
    const group     = getGroup(c.model, c.phase);

    // Find account_size label from balance
    const sizeLabels: Record<number, string> = {
      10000: "$10,000", 25000: "$25,000", 50000: "$50,000",
      100000: "$100,000", 200000: "$200,000"
    };
    const accountSize = sizeLabels[balance] ?? c.account_size ?? "$10,000";

    console.log(`⚙️  Migration: ${email} (${c.account_size} ${c.model} ${c.phase})`);
    try {
      // Create new MT5 account
      const newAccount = await createMT5Account({
        firstName, lastName, email,
        leverage: 100, group, accountSize,
      });

      console.log(`   ✅ Nouveau compte créé: login ${newAccount.login}`);

      // Update Supabase
      await supabase.from("challenges").update({
        mt5_login: newAccount.login,
        mt5_password: newAccount.password,
        mt5_password_investor: newAccount.password_investor,
        mt5_server: NEW_SERVER,
      }).eq("id", c.id);

      console.log(`   ✅ Supabase mis à jour`);

      // Send email
      await sendMigrationEmail(email, firstName, accountSize, {
        login: newAccount.login,
        password: newAccount.password,
        server: NEW_SERVER,
      });

      console.log(`   ✅ Email envoyé à ${email}\n`);
      migrated++;

      // Small delay between accounts
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`   ❌ Erreur pour ${c.user_email}:`, err);
    }
  }

  console.log(`\n🎉 Migration terminée: ${migrated}/${challenges.length} comptes migrés.`);
}

main().catch(console.error);
