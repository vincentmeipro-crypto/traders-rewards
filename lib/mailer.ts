const SITE = "https://www.elysium-rewards.com";
const LOGO = "https://www.elysium-rewards.com/LOGO%20TEXTE%20NOIR%20PNG%20TRANSPARENT.png";

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Elysium Rewards <support@elysium-rewards.com>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

export async function sendWelcomeEmail(
  to: string,
  accountSize: string,
  model: string,
  mt5?: { login: number; password: string; server: string }
) {
  const modelLabel = model === "1step" ? "1 Étape" : "2 Étapes";
  const details: { label: string; value: string; color?: string }[] = [
    { label: "Taille du compte", value: accountSize, color: "#C9A84C" },
    { label: "Modèle", value: modelLabel },
    { label: "Objectif de profit", value: "10%" },
    { label: "Perte journalière max", value: model === "1step" ? "3%" : "5%" },
  ];
  if (mt5) {
    details.push(
      { label: "Serveur MT5",   value: mt5.server,        color: "#1a73e8" },
      { label: "Login MT5",     value: String(mt5.login), color: "#1a73e8" },
      { label: "Mot de passe",  value: mt5.password,      color: "#1a73e8" },
    );
  }
  await sendEmail(to, "🎯 Votre Challenge Elysium est prêt !", buildEmail({
    title: "✅ Paiement confirmé — Votre compte MT5 est actif",
    titleColor: "#22c55e",
    body: `Bienvenue dans l'élite. Votre compte challenge a été créé. Connectez-vous à MT5 avec les identifiants ci-dessous et commencez à trader.`,
    details,
    cta: { text: "Accéder à mon Dashboard →", href: `${SITE}/dashboard` },
  }));
}

export async function sendPhase2Email(to: string, accountSize: string) {
  await sendEmail(to, "🏆 Phase 1 réussie — Bienvenue en Phase 2 !", buildEmail({
    title: "🏆 Phase 1 réussie !",
    titleColor: "#C9A84C",
    body: `Félicitations ! Vous avez complété avec succès la Phase 1 de votre challenge ${accountSize}. Votre compte a été réinitialisé et la Phase 2 est maintenant active.`,
    details: [
      { label: "Taille du compte", value: accountSize, color: "#C9A84C" },
      { label: "Nouvelle phase", value: "Phase 2" },
      { label: "Nouvel objectif", value: "5%" },
      { label: "Balance réinitialisée", value: "✓ Fait" },
    ],
    cta: { text: "Voir mon Dashboard →", href: `${SITE}/dashboard` },
  }));
}

export async function sendFailedEmail(to: string, accountSize: string, reason: "daily_drawdown" | "total_drawdown") {
  const reasonLabel = reason === "daily_drawdown" ? "Drawdown journalier dépassé" : "Drawdown total dépassé";
  const reasonDetail = reason === "daily_drawdown"
    ? "Votre limite de perte journalière a été atteinte. C'est une règle automatique de protection du capital."
    : "Votre limite de perte totale maximale a été atteinte.";
  await sendEmail(to, "❌ Votre Challenge Elysium a été arrêté", buildEmail({
    title: "❌ Challenge échoué",
    titleColor: "#ef4444",
    body: `Nous vous informons que votre challenge ${accountSize} a été automatiquement arrêté. ${reasonDetail}`,
    details: [
      { label: "Taille du compte", value: accountSize, color: "#C9A84C" },
      { label: "Raison", value: reasonLabel, color: "#ef4444" },
      { label: "Statut", value: "Challenge clôturé" },
    ],
    cta: { text: "Commencer un nouveau challenge →", href: `${SITE}/#pricing` },
  }));
}

export async function sendFundedEmail(to: string, accountSize: string) {
  await sendEmail(to, "🎉 Vous êtes Certifié ! Bienvenue chez Elysium", buildEmail({
    title: "🎉 Félicitations — Vous êtes Certifié !",
    titleColor: "#3b82f6",
    body: `Performance exceptionnelle ! Vous avez réussi toutes les phases de votre challenge ${accountSize}. Vous êtes maintenant un trader certifié Elysium avec un partage des profits jusqu'à 90%.`,
    details: [
      { label: "Taille du compte", value: accountSize, color: "#C9A84C" },
      { label: "Statut", value: "Trader Certifié ✓", color: "#3b82f6" },
      { label: "Partage des profits", value: "90% pour vous" },
      { label: "Récompenses", value: "Disponibles maintenant" },
    ],
    cta: { text: "Demander ma première récompense →", href: `${SITE}/dashboard` },
  }));
}

export async function sendDailyUpdateEmail(
  to: string,
  accountSize: string,
  phase: string,
  balance: number,
  profitPct: number,
  tradingDays: number,
  opts?: { model?: string; highestBalance?: number; totalLimit?: number; startBalance?: number }
) {
  const phaseLabel = phase === "phase1" ? "Phase 1" : phase === "phase2" ? "Phase 2" : "Certifié";
  const profitColor = profitPct >= 0 ? "#22c55e" : "#ef4444";
  const profitSign = profitPct >= 0 ? "+" : "";

  const details: { label: string; value: string; color?: string }[] = [
    { label: "Balance actuelle", value: `$${balance.toLocaleString()}` },
    { label: "Profit / Perte", value: `${profitSign}${profitPct.toFixed(2)}%`, color: profitColor },
    { label: "Phase", value: phaseLabel, color: "#C9A84C" },
    { label: "Jours de trading", value: `${tradingDays}` },
  ];

  if (opts?.model === "1step" && opts.highestBalance && opts.totalLimit) {
    const riskAmount = Math.round((opts.startBalance ?? opts.highestBalance) * opts.totalLimit / 100);
    const floor = opts.highestBalance - riskAmount;
    const buffer = balance - floor;
    details.push(
      { label: "Plus haut EOD", value: `$${Math.round(opts.highestBalance).toLocaleString()}`, color: "#22c55e" },
      { label: "Plancher trailing actuel", value: `$${Math.round(floor).toLocaleString()}`, color: "#f59e0b" },
      { label: "Marge avant plancher", value: `$${Math.round(buffer).toLocaleString()}`, color: buffer > 0 ? "#22c55e" : "#ef4444" },
    );
  }

  await sendEmail(to, `📊 Récap journalier — Challenge ${accountSize}`, buildEmail({
    title: "📊 Récapitulatif journalier",
    titleColor: "#C9A84C",
    body: `Voici votre résumé de performance du jour pour votre challenge ${accountSize}.`,
    details,
    cta: { text: "Voir mon Dashboard →", href: `${SITE}/dashboard` },
  }));
}

export async function sendPhase1CertificateEmail(to: string, firstName: string, lastName: string, accountSize: string, date: string) {
  const name = `${firstName} ${lastName}`.trim();
  const certUrl = `${SITE}/certificate?type=phase1&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}`;
  await sendEmail(to, `🏆 Félicitations ${firstName} — Certificat Phase 1 obtenu !`, `
    <div style="background:#f2f2f2;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:28px;">
          <img src="${LOGO}" alt="Elysium Rewards" style="height:192px;width:auto;display:inline-block;" />
        </div>
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <img src="${SITE}/PHASE1.png" alt="Certificat Phase 1" style="width:100%;display:block;" />
          <div style="padding:32px 36px;">
            <h2 style="color:#00C2FF;font-size:22px;font-weight:700;margin:0 0 12px 0;">Phase 1 validée — Bravo ${firstName} !</h2>
            <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
              Vous avez réussi la Phase 1 de votre challenge <strong>${accountSize}</strong> en date du <strong>${date}</strong>.<br/>
              Votre compte est maintenant élevé en Phase 2.
            </p>
            <table width="100%" cellPadding="0" cellSpacing="0" style="border-top:1px solid #e8e8e8;margin-bottom:28px;">
              <tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;width:55%;">Trader :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">${name}</td></tr>
              <tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;">Compte :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">${accountSize}</td></tr>
              <tr><td style="color:#777;font-size:14px;padding:12px 0;">Date :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;text-align:right;">${date}</td></tr>
            </table>
            <a href="${certUrl}" style="display:block;background:#00C2FF;color:#000;text-align:center;padding:15px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Télécharger mon certificat →</a>
          </div>
        </div>
        <div style="margin-top:24px;padding:0 8px;">
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Elysium Rewards</strong></p>
        </div>
      </div>
    </div>
  `);
}

export async function sendChallengeCertificateEmail(to: string, firstName: string, lastName: string, accountSize: string, date: string) {
  const name = `${firstName} ${lastName}`.trim();
  const certUrl = `${SITE}/certificate?type=challenge&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}`;
  await sendEmail(to, `🎉 ${firstName} — Vous êtes Certifié Elysium !`, `
    <div style="background:#f2f2f2;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:28px;">
          <img src="${LOGO}" alt="Elysium Rewards" style="height:192px;width:auto;display:inline-block;" />
        </div>
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <img src="${SITE}/CHALLENGE.png" alt="Certificat Challenge" style="width:100%;display:block;" />
          <div style="padding:32px 36px;">
            <h2 style="color:#a855f7;font-size:22px;font-weight:700;margin:0 0 12px 0;">Challenge validé — ${firstName}, vous êtes Certifié !</h2>
            <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
              Félicitations ! Vous avez brillamment réussi toutes les étapes du challenge <strong>${accountSize}</strong>.<br/>
              Vous êtes maintenant un trader certifié Elysium Rewards.
            </p>
            <table width="100%" cellPadding="0" cellSpacing="0" style="border-top:1px solid #e8e8e8;margin-bottom:28px;">
              <tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;width:55%;">Trader :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">${name}</td></tr>
              <tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;">Compte :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">${accountSize}</td></tr>
              <tr><td style="color:#777;font-size:14px;padding:12px 0;">Date :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;text-align:right;">${date}</td></tr>
            </table>
            <a href="${certUrl}" style="display:block;background:#a855f7;color:#fff;text-align:center;padding:15px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Télécharger mon certificat →</a>
          </div>
        </div>
        <div style="margin-top:24px;padding:0 8px;">
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Elysium Rewards</strong></p>
        </div>
      </div>
    </div>
  `);
}

export async function sendRewardCertificateEmail(to: string, firstName: string, lastName: string, accountSize: string, grossAmount: number, model: string, date: string) {
  const name = `${firstName} ${lastName}`.trim();
  const splitPct = model === "1step" ? 90 : 80;
  const netAmount = Math.round(grossAmount * splitPct / 100);
  const certUrl = `${SITE}/certificate?type=reward&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(`$${netAmount.toLocaleString()}`)}&date=${encodeURIComponent(date)}`;
  await sendEmail(to, `💰 ${firstName} — Votre récompense de $${netAmount.toLocaleString()} est en cours !`, `
    <div style="background:#f2f2f2;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:28px;">
          <img src="${LOGO}" alt="Elysium Rewards" style="height:192px;width:auto;display:inline-block;" />
        </div>
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <img src="${SITE}/REWARDS.png" alt="Certificat Récompense" style="width:100%;display:block;" />
          <div style="padding:32px 36px;">
            <h2 style="color:#C9A84C;font-size:22px;font-weight:700;margin:0 0 12px 0;">Récompense validée — $${netAmount.toLocaleString()} pour vous !</h2>
            <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
              Votre récompense a été validée et est en cours de traitement. Elle sera versée sous 24-48h.
            </p>
            <table width="100%" cellPadding="0" cellSpacing="0" style="border-top:1px solid #e8e8e8;margin-bottom:28px;">
              <tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;width:55%;">Trader :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">${name}</td></tr>
              <tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;">Compte :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">${accountSize}</td></tr>
              <tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;">Profit brut :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">$${grossAmount.toLocaleString()}</td></tr>
              <tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;">Partage (${splitPct}%) :</td><td style="color:#22c55e;font-size:16px;font-weight:800;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">$${netAmount.toLocaleString()}</td></tr>
              <tr><td style="color:#777;font-size:14px;padding:12px 0;">Date :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;text-align:right;">${date}</td></tr>
            </table>
            <a href="${certUrl}" style="display:block;background:#C9A84C;color:#000;text-align:center;padding:15px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Télécharger mon certificat →</a>
          </div>
        </div>
        <div style="margin-top:24px;padding:0 8px;">
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Elysium Rewards</strong></p>
        </div>
      </div>
    </div>
  `);
}

function buildEmail({ title, titleColor, body, details, cta }: {
  title: string; titleColor: string; body: string;
  details: { label: string; value: string; color?: string }[];
  cta: { text: string; href: string };
}) {
  return `
    <div style="background:#f2f2f2;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">

        <div style="text-align:center;margin-bottom:28px;">
          <img src="${LOGO}" alt="Elysium Rewards" style="height:192px;width:auto;display:inline-block;" />
        </div>

        <div style="background:#ffffff;border-radius:12px;padding:40px 36px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <h2 style="color:${titleColor};font-size:22px;font-weight:700;margin:0 0 12px 0;">${title}</h2>
          <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 28px 0;">${body}</p>

          <table width="100%" cellPadding="0" cellSpacing="0" style="border-top:1px solid #e8e8e8;margin-bottom:28px;">
            ${details.map(d => `
              <tr>
                <td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;width:55%;">${d.label} :</td>
                <td style="color:${d.color || "#111"};font-size:14px;font-weight:700;font-family:monospace;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">${d.value}</td>
              </tr>
            `).join("")}
          </table>

          <a href="${cta.href}" style="display:block;background:#C9A84C;color:#ffffff;text-align:center;padding:15px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">${cta.text}</a>
        </div>

        <div style="margin-top:32px;padding:0 8px;">
          <p style="color:#555;font-size:14px;margin:0 0 8px 0;">💬 Besoin d'aide ?</p>
          <p style="color:#777;font-size:13px;line-height:1.6;margin:0 0 20px 0;">
            Contactez-nous à <a href="mailto:support@elysium-rewards.com" style="color:#C9A84C;text-decoration:none;">support@elysium-rewards.com</a>
          </p>
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Elysium Rewards</strong></p>
        </div>

      </div>
    </div>
  `;
}
