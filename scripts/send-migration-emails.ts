/**
 * Envoie les emails de migration aux 3 clients avec leurs nouveaux identifiants
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sendViaResend(to: string, subject: string, html: string) {
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

const NEW_SERVER = "XyloMarkets-Server";

// Les 3 comptes migrés (logins créés pendant la migration)
const MIGRATED = [
  { userId: null, login: 9009094831596, accountSize: "$100,000" },
  { userId: null, login: 9009094831597, accountSize: "$100,000" },
  { userId: null, login: 9009094831598, accountSize: "$100,000" },
];

async function main() {
  // Récupère les challenges avec le nouveau serveur et les logins migrés
  const logins = MIGRATED.map(m => m.login);
  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, user_id, mt5_login, mt5_password, mt5_password_investor, mt5_server, account_size, model, phase")
    .in("mt5_login", logins);

  if (!challenges?.length) { console.log("Aucun challenge trouvé"); return; }

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const userById = new Map(users.map(u => [u.id, u]));

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name")
    .in("user_id", challenges.map(c => c.user_id));
  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

  for (const c of challenges) {
    const user    = userById.get(c.user_id);
    const profile = profileMap.get(c.user_id);
    const email     = user?.email ?? "";
    const firstName = profile?.first_name ?? email.split("@")[0];

    console.log(`📧 Envoi à ${email} — login ${c.mt5_login}`);
    try {
      await sendViaResend(email, "Vos nouveaux identifiants MT5 — Traders Rewards", `
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
                <span style="color:#3b82f6;font-size:16px;font-weight:700;font-family:monospace">${NEW_SERVER}</span>
              </div>
              <div style="margin-bottom:12px">
                <span style="color:rgba(255,255,255,0.45);font-size:12px">LOGIN</span><br>
                <span style="color:#fff;font-size:16px;font-weight:700;font-family:monospace">${c.mt5_login}</span>
              </div>
              <div>
                <span style="color:rgba(255,255,255,0.45);font-size:12px">MOT DE PASSE</span><br>
                <span style="color:#fff;font-size:16px;font-weight:700;font-family:monospace">${c.mt5_password}</span>
              </div>
            </div>
            <p style="color:rgba(255,255,255,0.45);font-size:12px">
              Votre balance de ${c.account_size} a été transférée sur le nouveau compte.<br>
              Connectez-vous à votre <a href="https://www.elysium-rewards.com/dashboard" style="color:#3b82f6">dashboard</a> pour retrouver vos identifiants à tout moment.
            </p>
          </div>
        `);
      console.log(`   ✅ Email envoyé\n`);
    } catch (err) {
      console.error(`   ❌ Erreur:`, err);
    }
  }
  console.log("Terminé.");
}

main().catch(console.error);
