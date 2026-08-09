/**
 * ============================================================
 * EMAIL TEMPLATES — Traders Rewards Phase 3B-1b
 * ============================================================
 * Builders purs (synchrones, sans IO) pour les 9 emails
 * transactionnels.
 *
 * Chaque builder retourne { subject: string; html: string }.
 * Les valeurs IO (siteUrl, logoUrl, splitPct) sont injectées
 * explicitement — aucun appel à getBrandingConfig / getPayoutSplits
 * ni à Resend dans ce fichier.
 *
 * Utilisé par :
 *   lib/mailer.ts                              → envoi réel
 *   app/api/admin/emails/preview/route.ts      → preview sans envoi
 *   app/api/admin/emails/test/route.ts         → test send
 *   scripts/email-nodiff-test.ts               → vérification no-diff
 * ============================================================
 */

// ── Type whitelist ────────────────────────────────────────────

export const TRANSACTIONAL_EMAIL_TYPES = [
  "welcome",
  "phase2",
  "failed",
  "funded",
  "daily_update",
  "phase1_certificate",
  "challenge_certificate",
  "reward_certificate",
  "apology",
] as const;

export type TransactionalEmailType = typeof TRANSACTIONAL_EMAIL_TYPES[number];

export function isValidEmailType(t: string): t is TransactionalEmailType {
  return (TRANSACTIONAL_EMAIL_TYPES as readonly string[]).includes(t);
}

// ── Fake data (preview / test — 100% fictif) ─────────────────

export const FAKE_BRANDING = {
  siteUrl:  "https://www.traders-rewards.eu",
  logoUrl:  "https://www.traders-rewards.eu/logo-nom-noir.png",
} as const;

export const FAKE_MT5 = {
  login:    12345678,
  password: "Demo-Pass-2026",
  server:   "Demo-Server",
} as const;

export const FAKE_SPLIT_PCT = 80;

export const FAKE_PERSON = {
  firstName: "Alex",
  lastName:  "Martin",
  email:     "alex@example.com",
} as const;

// ── Generic email builder (internal — non exporté) ────────────

function buildEmail({
  title, titleColor, body, details, cta, logoUrl,
}: {
  title:      string;
  titleColor: string;
  body:       string;
  details:    { label: string; value: string; color?: string }[];
  cta:        { text: string; href: string };
  logoUrl:    string;
}) {
  return `
    <div style="background:#ffffff;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">

        <div style="text-align:center;padding:28px 0 24px;border-bottom:2px solid #e8f0fe;margin-bottom:28px;">
          <img src="${logoUrl}" alt="Traders Rewards" style="height:216px;width:auto;display:inline-block;" />
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

// ── 1. buildWelcomeEmail ──────────────────────────────────────

export function buildWelcomeEmail(p: {
  accountSize: string;
  model:       string;
  mt5?:        { login: number; password: string; server: string };
  setupLink?:  string;
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { accountSize, model, mt5, setupLink, siteUrl, logoUrl } = p;
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
  const ctaHref = setupLink || `${siteUrl}/dashboard`;
  const ctaText = setupLink ? "Créer mon mot de passe & accéder au Dashboard →" : "Accéder à mon Dashboard →";
  const bodyText = setupLink
    ? `Bienvenue dans l'élite. Votre ${modelLabel} ${accountSize} a été créé. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre dashboard.`
    : `Bienvenue dans l'élite. Votre ${modelLabel} ${accountSize} a été créé. Connectez-vous à MT5 avec les identifiants ci-dessous et commencez à trader.`;
  const subject = isAlgo ? "🤖 Votre Challenge ALGO est prêt !" : "🎯 Votre Challenge Traders Rewards est prêt !";
  const title = isAlgo ? "✔ Votre Challenge ALGO est actif" : "✔ Votre compte Traders Rewards est actif";
  const html = buildEmail({
    title,
    titleColor: isAlgo ? "#3B82F6" : "#1565C0",
    body: bodyText,
    details,
    cta: { text: ctaText, href: ctaHref },
    logoUrl,
  });
  return { subject, html };
}

// ── 2. buildPhase2Email ───────────────────────────────────────

export function buildPhase2Email(p: {
  accountSize: string;
  mt5?:        { login: number; password: string; server: string };
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { accountSize, mt5, siteUrl, logoUrl } = p;
  const subject = "🏆 Phase 1 réussie — Bienvenue en Phase 2 !";
  const html = buildEmail({
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
    cta: { text: "Voir mon Dashboard →", href: `${siteUrl}/dashboard` },
    logoUrl,
  });
  return { subject, html };
}

// ── 3. buildFailedEmail ───────────────────────────────────────

export function buildFailedEmail(p: {
  accountSize: string;
  reason:      "daily_drawdown" | "total_drawdown";
  mt5Login?:   number;
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { accountSize, reason, mt5Login, siteUrl, logoUrl } = p;
  const reasonLabel = reason === "daily_drawdown" ? "Drawdown journalier dépassé" : "Drawdown total dépassé";
  const reasonDetail = reason === "daily_drawdown"
    ? "Votre limite de perte journalière a été atteinte. C'est une règle automatique de protection du capital."
    : "Votre limite de perte totale maximale a été atteinte.";
  const subject = "❌ Votre Challenge Traders Rewards a été arrêté";
  const html = buildEmail({
    title: "❌ Challenge échoué",
    titleColor: "#ef4444",
    body: `Nous vous informons que votre challenge ${accountSize} a été automatiquement arrêté. ${reasonDetail}`,
    details: [
      { label: "Taille du compte", value: accountSize, color: "#60A5FA" },
      ...(mt5Login ? [{ label: "ID du compte MT5", value: String(mt5Login), color: "#1565C0" }] : []),
      { label: "Raison", value: reasonLabel, color: "#ef4444" },
      { label: "Statut", value: "Challenge clôturé" },
    ],
    cta: { text: "Commencer un nouveau challenge →", href: `${siteUrl}/#pricing` },
    logoUrl,
  });
  return { subject, html };
}

// ── 4. buildFundedEmail ───────────────────────────────────────

export function buildFundedEmail(p: {
  accountSize: string;
  mt5?:        { login: number; password: string; server: string };
  setupLink?:  string;
  splitPct:    number;
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { accountSize, mt5, setupLink, splitPct, siteUrl, logoUrl } = p;
  const ctaHref = setupLink || `${siteUrl}/dashboard`;
  const ctaText = setupLink ? "Créer mon mot de passe & accéder au Dashboard →" : "Demander ma première récompense →";
  const profitSplit = `${splitPct}% pour vous`;
  const subject = "🎉 Vous êtes Trader Reward ! Bienvenue chez Traders Rewards";
  const html = buildEmail({
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
    logoUrl,
  });
  return { subject, html };
}

// ── 5. buildDailyUpdateEmail ──────────────────────────────────

export function buildDailyUpdateEmail(p: {
  accountSize:     string;
  phase:           string;
  balance:         number;
  profitPct:       number;
  tradingDays:     number;
  model?:          string;
  highestBalance?: number;
  totalLimit?:     number;
  startBalance?:   number;
  siteUrl:         string;
  logoUrl:         string;
}): { subject: string; html: string } {
  const {
    accountSize, phase, balance, profitPct, tradingDays,
    model, highestBalance, totalLimit, startBalance,
    siteUrl, logoUrl,
  } = p;
  const phaseLabel = phase === "phase1" ? "Phase 1" : phase === "phase2" ? "Phase 2" : "Reward";
  const profitColor = profitPct >= 0 ? "#22c55e" : "#ef4444";
  const profitSign = profitPct >= 0 ? "+" : "";

  const details: { label: string; value: string; color?: string }[] = [
    { label: "Balance actuelle", value: `$${balance.toLocaleString()}` },
    { label: "Profit / Perte", value: `${profitSign}${profitPct.toFixed(2)}%`, color: profitColor },
    { label: "Phase", value: phaseLabel, color: "#60A5FA" },
    { label: "Jours de trading", value: `${tradingDays}` },
  ];

  if (model === "1step" && highestBalance && totalLimit) {
    const riskAmount = Math.round((startBalance ?? highestBalance) * totalLimit / 100);
    const floor = highestBalance - riskAmount;
    const buffer = balance - floor;
    details.push(
      { label: "Plus haut EOD", value: `$${Math.round(highestBalance).toLocaleString()}`, color: "#22c55e" },
      { label: "Plancher trailing actuel", value: `$${Math.round(floor).toLocaleString()}`, color: "#f59e0b" },
      { label: "Marge avant plancher", value: `$${Math.round(buffer).toLocaleString()}`, color: buffer > 0 ? "#22c55e" : "#ef4444" },
    );
  }

  const subject = `📊 Récap journalier — Challenge ${accountSize}`;
  const html = buildEmail({
    title: "📊 Récapitulatif journalier",
    titleColor: "#60A5FA",
    body: `Voici votre résumé de performance du jour pour votre challenge ${accountSize}.`,
    details,
    cta: { text: "Voir mon Dashboard →", href: `${siteUrl}/dashboard` },
    logoUrl,
  });
  return { subject, html };
}

// ── 6. buildPhase1CertificateEmail ────────────────────────────

export function buildPhase1CertificateEmail(p: {
  firstName:   string;
  lastName:    string;
  accountSize: string;
  date:        string;
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, date, siteUrl, logoUrl } = p;
  const name = `${firstName} ${lastName}`.trim();
  const certUrl = `${siteUrl}/certificate?type=phase1&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}`;
  const subject = `🏆 Félicitations ${firstName} — Certificat Phase 1 obtenu !`;
  const html = `
    <div style="background:#ffffff;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">
        <div style="text-align:center;padding:28px 0 24px;border-bottom:2px solid #e8f0fe;margin-bottom:28px;">
          <img src="${logoUrl}" alt="Traders Rewards" style="height:216px;width:auto;display:inline-block;" />
        </div>
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <div style="background:#0e0e0e;padding:32px 36px 24px;border-bottom:1px solid #1a1a1a;">
            <div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#3b82f6;margin-bottom:8px;">Traders Rewards — Certification</div>
            <div style="font-size:44px;font-weight:900;color:#ffffff;letter-spacing:-1px;text-transform:uppercase;line-height:1;margin-bottom:16px;">Phase 1</div>
            <div style="height:1px;background:linear-gradient(to right,#3b82f640,#3b82f6,#3b82f640);margin-bottom:16px;"></div>
            <div style="font-size:22px;font-weight:700;color:#3b82f6;">${name}</div>
          </div>
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
  `;
  return { subject, html };
}

// ── 7. buildChallengeCertificateEmail ─────────────────────────

export function buildChallengeCertificateEmail(p: {
  firstName:   string;
  lastName:    string;
  accountSize: string;
  date:        string;
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, date, siteUrl, logoUrl } = p;
  const name = `${firstName} ${lastName}`.trim();
  const certUrl = `${siteUrl}/certificate?type=challenge&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}`;
  const subject = `🎉 ${firstName} — Vous êtes Trader Reward !`;
  const html = `
    <div style="background:#ffffff;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">
        <div style="text-align:center;padding:28px 0 24px;border-bottom:2px solid #e8f0fe;margin-bottom:28px;">
          <img src="${logoUrl}" alt="Traders Rewards" style="height:216px;width:auto;display:inline-block;" />
        </div>
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <div style="background:#0e0e0e;padding:32px 36px 24px;border-bottom:1px solid #1a1a1a;">
            <div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#3b82f6;margin-bottom:8px;">Traders Rewards — Certification</div>
            <div style="font-size:44px;font-weight:900;color:#ffffff;letter-spacing:-1px;text-transform:uppercase;line-height:1;margin-bottom:16px;">Phase 2</div>
            <div style="height:1px;background:linear-gradient(to right,#3b82f640,#3b82f6,#3b82f640);margin-bottom:16px;"></div>
            <div style="font-size:22px;font-weight:700;color:#3b82f6;">${name}</div>
          </div>
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
  `;
  return { subject, html };
}

// ── 8. buildRewardCertificateEmail ────────────────────────────

export function buildRewardCertificateEmail(p: {
  firstName:    string;
  lastName:     string;
  accountSize:  string;
  grossAmount:  number;
  date:         string;
  netAmountEur?: number;
  splitPct:     number;
  siteUrl:      string;
  logoUrl:      string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, grossAmount, date, netAmountEur, splitPct, siteUrl, logoUrl } = p;
  const name = `${firstName} ${lastName}`.trim();
  const netAmount = Math.round(grossAmount * splitPct / 100);
  const certUrl = `${siteUrl}/certificate?type=reward&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(`$${netAmount.toLocaleString()}`)}&date=${encodeURIComponent(date)}`;
  const eurRow = netAmountEur != null
    ? `<tr><td style="color:#777;font-size:14px;padding:12px 0;border-bottom:1px solid #e8e8e8;">Équivalent EUR :</td><td style="color:#3b82f6;font-size:15px;font-weight:800;padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;">≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td></tr>`
    : "";
  const subjectSuffix = netAmountEur != null ? ` (≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)` : "";
  const subject = `💰 ${firstName} — Votre récompense de $${netAmount.toLocaleString()}${subjectSuffix} est en cours !`;
  const html = `
    <div style="background:#ffffff;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;">
      <div style="max-width:580px;margin:0 auto;">
        <div style="text-align:center;padding:28px 0 24px;border-bottom:2px solid #e8f0fe;margin-bottom:28px;">
          <img src="${logoUrl}" alt="Traders Rewards" style="height:216px;width:auto;display:inline-block;" />
        </div>
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <div style="background:#0e0e0e;padding:32px 36px 24px;border-bottom:1px solid #1a1a1a;">
            <div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#3b82f6;margin-bottom:8px;">Traders Rewards — Versement</div>
            <div style="font-size:44px;font-weight:900;color:#ffffff;letter-spacing:-1px;text-transform:uppercase;line-height:1;margin-bottom:16px;">REWARD</div>
            <div style="height:1px;background:linear-gradient(to right,#3b82f640,#3b82f6,#3b82f640);margin-bottom:16px;"></div>
            <div style="font-size:22px;font-weight:700;color:#3b82f6;">${name}</div>
          </div>
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
  `;
  return { subject, html };
}

// ── 9. buildApologyEmail ──────────────────────────────────────

export function buildApologyEmail(p: {
  firstName:   string;
  accountSize: string;
  phase:       string;
  mt5:         { login: number; password: string; server: string };
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { firstName, accountSize, phase, mt5, siteUrl, logoUrl } = p;
  const phaseLabel = phase === "funded" ? "Trader Reward" : phase === "phase2" ? "Phase 2" : "Phase 1";
  const titleColor = phase === "funded" ? "#3b82f6" : "#1565C0";
  const subject = "✅ Votre compte Traders Rewards est rétabli";
  const html = buildEmail({
    title: `✅ Compte rétabli — ${phaseLabel}`,
    titleColor,
    body: `Bonjour ${firstName},\n\nNous nous excusons pour la gêne occasionnée suite à une erreur technique survenue récemment sur notre plateforme. Votre compte ${accountSize} a été entièrement restauré et est de nouveau actif. Toutes vos positions et votre historique de trading sont intacts.`,
    details: [
      { label: "Taille du compte", value: accountSize, color: "#60A5FA" },
      { label: "Phase actuelle",   value: phaseLabel },
      { label: "Statut",          value: "Actif ✓", color: "#22c55e" },
      { label: "Serveur MT5",     value: mt5.server,        color: "#1a73e8" },
      { label: "Login MT5",       value: String(mt5.login), color: "#1a73e8" },
      { label: "Mot de passe",    value: mt5.password,      color: "#1a73e8" },
    ],
    cta: { text: "Accéder à mon Dashboard →", href: `${siteUrl}/dashboard` },
    logoUrl,
  });
  return { subject, html };
}

// ── Dispatch preview (fake data) ──────────────────────────────
//
// Utilisé par preview et test send.
// Aucun client réel, aucun credential réel.

export function buildPreviewFor(type: TransactionalEmailType, previewModel?: string): { subject: string; html: string } {
  const { siteUrl, logoUrl } = FAKE_BRANDING;
  const { firstName, lastName } = FAKE_PERSON;
  const accountSize = "$100,000";

  switch (type) {
    case "welcome":
      return buildWelcomeEmail({ accountSize, model: previewModel ?? "2step", mt5: FAKE_MT5, siteUrl, logoUrl });
    case "phase2":
      return buildPhase2Email({ accountSize, mt5: FAKE_MT5, siteUrl, logoUrl });
    case "failed":
      return buildFailedEmail({ accountSize, reason: "daily_drawdown", mt5Login: FAKE_MT5.login, siteUrl, logoUrl });
    case "funded":
      return buildFundedEmail({ accountSize, mt5: FAKE_MT5, splitPct: FAKE_SPLIT_PCT, siteUrl, logoUrl });
    case "daily_update":
      return buildDailyUpdateEmail({ accountSize, phase: "phase1", balance: 103500, profitPct: 3.5, tradingDays: 4, siteUrl, logoUrl });
    case "phase1_certificate":
      return buildPhase1CertificateEmail({ firstName, lastName, accountSize, date: "09 août 2026", siteUrl, logoUrl });
    case "challenge_certificate":
      return buildChallengeCertificateEmail({ firstName, lastName, accountSize, date: "09 août 2026", siteUrl, logoUrl });
    case "reward_certificate":
      return buildRewardCertificateEmail({ firstName, lastName, accountSize, grossAmount: 4500, date: "09 août 2026", netAmountEur: 3312.75, splitPct: FAKE_SPLIT_PCT, siteUrl, logoUrl });
    case "apology":
      return buildApologyEmail({ firstName, accountSize, phase: "phase1", mt5: FAKE_MT5, siteUrl, logoUrl });
  }
}
