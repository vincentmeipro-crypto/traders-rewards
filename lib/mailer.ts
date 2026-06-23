const SITE = "https://www.traders-rewards.eu";
const LOGO = "https://www.traders-rewards.eu/logo-email.png";

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Traders Rewards <contact@traders-rewards.eu>",
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
  mt5?: { login: number; password: string; server: string },
  setupLink?: string
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
      { label: "Mot de passe MT5", value: mt5.password,   color: "#1a73e8" },
    );
  }
  const ctaHref = setupLink || `${SITE}/dashboard`;
  const ctaText = setupLink ? "Créer mon mot de passe & accéder au Dashboard →" : "Accéder à mon Dashboard →";
  const bodyText = setupLink
    ? `Bienvenue dans l'élite. Votre compte challenge a été créé. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre dashboard.`
    : `Bienvenue dans l'élite. Votre compte challenge a été créé. Connectez-vous à MT5 avec les identifiants ci-dessous et commencez à trader.`;
  await sendEmail(to, "🎯 Votre Challenge Traders Rewards est prêt !", buildEmail({
    title: "✔ Votre compte Traders Rewards est actif",
    titleColor: "#1565C0",
    body: bodyText,
    details,
    cta: { text: ctaText, href: ctaHref },
  }));
}

export async function sendPhase2Email(to: string, accountSize: string, mt5?: { login: number; password: string; server: string }) {
  await sendEmail(to, "🏆 Phase 1 réussie — Bienvenue en Phase 2 !", buildEmail({
    title: "🏆 Phase 1 réussie !",
    titleColor: "#C9A84C",
    body: `Félicitations ! Vous avez complété avec succès la Phase 1 de votre challenge ${accountSize}. Un nouveau compte de trading a été créé pour votre Phase 2.`,
    details: [
      { label: "Taille du compte", value: accountSize, color: "#C9A84C" },
      { label: "Nouvelle phase", value: "Phase 2" },
      { label: "Nouvel objectif", value: "5%" },
      ...(mt5 ? [
        { label: "Nouveau Login MT5", value: String(mt5.login), color: "#3b82f6" },
        { label: "Mot de passe", value: mt5.password, color: "#3b82f6" },
        { label: "Serveur", value: mt5.server },
      ] : []),
    ],
    cta: { text: "Voir mon Dashboard →", href: `${SITE}/dashboard` },
  }));
}

export async function sendFailedEmail(to: string, accountSize: string, reason: "daily_drawdown" | "total_drawdown", mt5Login?: number) {
  const reasonLabel = reason === "daily_drawdown" ? "Drawdown journalier dépassé" : "Drawdown total dépassé";
  const reasonDetail = reason === "daily_drawdown"
    ? "Votre limite de perte journalière a été atteinte. C'est une règle automatique de protection du capital."
    : "Votre limite de perte totale maximale a été atteinte.";
  await sendEmail(to, "❌ Votre Challenge Traders Rewards a été arrêté", buildEmail({
    title: "❌ Challenge échoué",
    titleColor: "#ef4444",
    body: `Nous vous informons que votre challenge ${accountSize} a été automatiquement arrêté. ${reasonDetail}`,
    details: [
      { label: "Taille du compte", value: accountSize, color: "#C9A84C" },
      ...(mt5Login ? [{ label: "ID du compte MT5", value: String(mt5Login), color: "#1565C0" }] : []),
      { label: "Raison", value: reasonLabel, color: "#ef4444" },
      { label: "Statut", value: "Challenge clôturé" },
    ],
    cta: { text: "Commencer un nouveau challenge →", href: `${SITE}/#pricing` },
  }));
}

export async function sendFundedEmail(to: string, accountSize: string, mt5?: { login: number; password: string; server: string }, setupLink?: string, model?: string) {
  const ctaHref = setupLink || `${SITE}/dashboard`;
  const ctaText = setupLink ? "Créer mon mot de passe & accéder au Dashboard →" : "Demander ma première récompense →";
  const is1Step = model?.toLowerCase().replace(/[\s-]/g, "").includes("1step");
  const profitSplit = is1Step ? "90% pour vous" : "80% pour vous";
  await sendEmail(to, "🎉 Vous êtes Trader Reward ! Bienvenue chez Traders Rewards", buildEmail({
    title: "🎉 Félicitations — Vous êtes Trader Reward !",
    titleColor: "#3b82f6",
    body: `Performance exceptionnelle ! Vous êtes maintenant un Trader Reward sur votre compte ${accountSize}. Voici vos identifiants de compte Reward.`,
    details: [
      { label: "Taille du compte", value: accountSize, color: "#C9A84C" },
      { label: "Statut", value: "Trader Reward ✓", color: "#3b82f6" },
      { label: "Partage des profits", value: profitSplit },
      ...(mt5 ? [
        { label: "Nouveau Login MT5", value: String(mt5.login), color: "#3b82f6" },
        { label: "Mot de passe", value: mt5.password, color: "#3b82f6" },
        { label: "Serveur", value: mt5.server },
      ] : []),
    ],
    cta: { text: ctaText, href: ctaHref },
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
  const phaseLabel = phase === "phase1" ? "Phase 1" : phase === "phase2" ? "Phase 2" : "Reward";
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
    <div style="background:#ffffff;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">
        <div style="text-align:center;padding:28px 0 24px;border-bottom:2px solid #e8f0fe;margin-bottom:28px;">
          <img src="${LOGO}" alt="Traders Rewards" style="height:216px;width:auto;display:inline-block;" />
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
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Traders Rewards</strong></p>
        </div>
      </div>
    </div>
  `);
}

export async function sendChallengeCertificateEmail(to: string, firstName: string, lastName: string, accountSize: string, date: string) {
  const name = `${firstName} ${lastName}`.trim();
  const certUrl = `${SITE}/certificate?type=challenge&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}`;
  await sendEmail(to, `🎉 ${firstName} — Vous êtes Trader Reward !`, `
    <div style="background:#ffffff;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">
        <div style="text-align:center;padding:28px 0 24px;border-bottom:2px solid #e8f0fe;margin-bottom:28px;">
          <img src="${LOGO}" alt="Traders Rewards" style="height:216px;width:auto;display:inline-block;" />
        </div>
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <img src="${SITE}/PHASE2.png" alt="Certificat Phase 2" style="width:100%;display:block;" />
          <div style="padding:32px 36px;">
            <h2 style="color:#a855f7;font-size:22px;font-weight:700;margin:0 0 12px 0;">Challenge validé — ${firstName}, vous êtes Trader Reward !</h2>
            <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
              Félicitations ! Vous avez brillamment réussi toutes les étapes du challenge <strong>${accountSize}</strong>.<br/>
              Vous êtes maintenant un Trader Reward.
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
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Traders Rewards</strong></p>
        </div>
      </div>
    </div>
  `);
}

export async function sendRewardCertificateEmail(to: string, firstName: string, lastName: string, accountSize: string, grossAmount: number, model: string, date: string, netAmountEur?: number) {
  const name = `${firstName} ${lastName}`.trim();
  const is1Step = model?.toLowerCase().replace(/[\s-]/g, "").includes("1step");
  const splitPct = is1Step ? 90 : 80;
  const netAmount = Math.round(grossAmount * splitPct / 100);
  const certUrl = `${SITE}/certificate?type=reward&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(`$${netAmount.toLocaleString()}`)}&date=${encodeURIComponent(date)}`;
  const eurRow = netAmountEur != null
    ? `<tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;">Équivalent EUR :</td><td style="color:#3b82f6;font-size:15px;font-weight:800;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td></tr>`
    : "";
  await sendEmail(to, `💰 ${firstName} — Votre récompense de $${netAmount.toLocaleString()}${netAmountEur != null ? ` (≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)` : ""} est en cours !`, `
    <div style="background:#ffffff;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">
        <div style="text-align:center;padding:28px 0 24px;border-bottom:2px solid #e8f0fe;margin-bottom:28px;">
          <img src="${LOGO}" alt="Traders Rewards" style="height:216px;width:auto;display:inline-block;" />
        </div>
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <img src="${SITE}/RECOMPENSE.png" alt="Certificat Récompense" style="width:100%;display:block;" />
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
              ${eurRow}
              <tr><td style="color:#777;font-size:14px;padding:12px 0;">Date :</td><td style="color:#111;font-size:14px;font-weight:700;padding:12px 0;text-align:right;">${date}</td></tr>
            </table>
            <a href="${certUrl}" style="display:block;background:#C9A84C;color:#000;text-align:center;padding:15px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Télécharger mon certificat →</a>
          </div>
        </div>
        <div style="margin-top:24px;padding:0 8px;">
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Traders Rewards</strong></p>
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
    <div style="background:#ffffff;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">

        <div style="text-align:center;padding:28px 0 24px;border-bottom:2px solid #e8f0fe;margin-bottom:28px;">
          <img src="${LOGO}" alt="Traders Rewards" style="height:216px;width:auto;display:inline-block;" />
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
            Contactez-nous à <a href="mailto:contact@traders-rewards.eu" style="color:#C9A84C;text-decoration:none;">contact@traders-rewards.eu</a>
          </p>
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Traders Rewards</strong></p>
        </div>

      </div>
    </div>
  `;
}
