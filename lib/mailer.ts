const SITE = "https://www.traders-rewards.eu";
const LOGO = "data:image/png;base64,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";

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
  const isAlgo = model === "vip";
  const modelLabel = isAlgo ? "Challenge ALGO" : model === "1step" ? "Challenge Trader 1-Step" : "Challenge Trader 2-Step";
  const details: { label: string; value: string; color?: string }[] = [
    { label: "Taille du compte", value: accountSize, color: "#60A5FA" },
    { label: "Type de challenge", value: modelLabel, color: isAlgo ? "#3B82F6" : undefined },
    { label: "Objectif Phase 1", value: "+10%" },
    ...(isAlgo
      ? [
          { label: "Objectif Phase 2", value: "+5%" },
          { label: "Partage des profits", value: "100%" },
          { label: "Perte journalière max", value: "5%" },
        ]
      : [
          { label: "Perte journalière max", value: model === "1step" ? "3%" : "5%" },
        ]
    ),
  ];
  if (mt5) {
    details.push(
      { label: "Serveur MT5",      value: mt5.server,        color: "#1a73e8" },
      { label: "Login MT5",        value: String(mt5.login), color: "#1a73e8" },
      { label: "Mot de passe MT5", value: mt5.password,      color: "#1a73e8" },
    );
  }
  const ctaHref = setupLink || `${SITE}/dashboard`;
  const ctaText = setupLink ? "Créer mon mot de passe & accéder au Dashboard →" : "Accéder à mon Dashboard →";
  const bodyText = setupLink
    ? `Bienvenue dans l'élite. Votre ${modelLabel} ${accountSize} a été créé. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre dashboard.`
    : `Bienvenue dans l'élite. Votre ${modelLabel} ${accountSize} a été créé. Connectez-vous à MT5 avec les identifiants ci-dessous et commencez à trader.`;
  const subject = isAlgo ? "🤖 Votre Challenge ALGO est prêt !" : "🎯 Votre Challenge Traders Rewards est prêt !";
  const title = isAlgo ? "✔ Votre Challenge ALGO est actif" : "✔ Votre compte Traders Rewards est actif";
  await sendEmail(to, subject, buildEmail({
    title,
    titleColor: isAlgo ? "#3B82F6" : "#1565C0",
    body: bodyText,
    details,
    cta: { text: ctaText, href: ctaHref },
  }));
}

export async function sendPhase2Email(to: string, accountSize: string, mt5?: { login: number; password: string; server: string }) {
  await sendEmail(to, "🏆 Phase 1 réussie — Bienvenue en Phase 2 !", buildEmail({
    title: "🏆 Phase 1 réussie !",
    titleColor: "#60A5FA",
    body: `Félicitations ! Vous avez complété avec succès la Phase 1 de votre challenge ${accountSize}. Un nouveau compte de trading a été créé pour votre Phase 2.`,
    details: [
      { label: "Taille du compte", value: accountSize, color: "#60A5FA" },
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
      { label: "Taille du compte", value: accountSize, color: "#60A5FA" },
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
      { label: "Taille du compte", value: accountSize, color: "#60A5FA" },
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
    { label: "Phase", value: phaseLabel, color: "#60A5FA" },
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
    titleColor: "#60A5FA",
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
            <h2 style="color:#60A5FA;font-size:22px;font-weight:700;margin:0 0 12px 0;">Récompense validée — $${netAmount.toLocaleString()} pour vous !</h2>
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
            <a href="${certUrl}" style="display:block;background:#60A5FA;color:#000;text-align:center;padding:15px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">Télécharger mon certificat →</a>
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

          <a href="${cta.href}" style="display:block;background:#60A5FA;color:#ffffff;text-align:center;padding:15px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">${cta.text}</a>
        </div>

        <div style="margin-top:32px;padding:0 8px;">
          <p style="color:#555;font-size:14px;margin:0 0 8px 0;">💬 Besoin d'aide ?</p>
          <p style="color:#777;font-size:13px;line-height:1.6;margin:0 0 20px 0;">
            Contactez-nous à <a href="mailto:contact@traders-rewards.eu" style="color:#60A5FA;text-decoration:none;">contact@traders-rewards.eu</a>
          </p>
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Traders Rewards</strong></p>
        </div>

      </div>
    </div>
  `;
}
