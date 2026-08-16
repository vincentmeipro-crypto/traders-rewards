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

type EmailDetail = {
  label: string;
  value: string;
};

type EmailAction = {
  text: string;
  href: string;
};

type EmailHighlight = {
  icon: string;
  eyebrow: string;
  title: string;
  text: string;
};

function buildEmail({
  title,
  body,
  details,
  cta,
  logoUrl,
  eyebrow = "TRADERS REWARDS",
  preheader,
  footerNote,
  highlight,
}: {
  title: string;
  body: string;
  details: EmailDetail[];
  cta: EmailAction;
  logoUrl: string;
  eyebrow?: string;
  preheader?: string;
  footerNote?: string;
  highlight?: EmailHighlight;
}) {
  const formattedBody = body.replace(/\n/g, "<br/>");
  const detailRows = details.map((detail, index) => `
    <tr>
      <td class="detail-label" style="padding:14px 16px;${index < details.length - 1 ? "border-bottom:1px solid #e5e5e2;" : ""}color:#686864;font-size:13px;line-height:1.4;width:52%;vertical-align:top;">
        ${detail.label}
      </td>
      <td class="detail-value" style="padding:14px 16px;${index < details.length - 1 ? "border-bottom:1px solid #e5e5e2;" : ""}color:#111111;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:700;line-height:1.4;text-align:right;vertical-align:top;">
        ${detail.value}
      </td>
    </tr>
  `).join("");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <style>
    @media only screen and (max-width:620px) {
      .email-shell { width:100% !important; }
      .email-content { padding:32px 22px !important; }
      .brand-cell { padding:28px 22px 22px !important; }
      .detail-label,.detail-value { display:block !important;width:auto !important;text-align:left !important; }
      .detail-label { padding:13px 14px 3px !important;border-bottom:0 !important; }
      .detail-value { padding:0 14px 13px !important; }
      .email-title { font-size:26px !important; }
      .certificate-title { font-size:38px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3f3f1;color:#111111;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
    ${preheader ?? title}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f3f3f1;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="email-shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td class="brand-cell" align="center" style="padding:28px 32px 22px;background:#ffffff;border:1px solid #dfdfdc;border-bottom:0;border-radius:16px 16px 0 0;">
              <img src="${logoUrl}" width="178" alt="Traders Rewards" style="display:block;width:178px;max-width:178px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="height:3px;background:#69C5FD;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="email-content" style="padding:42px 42px 40px;background:#ffffff;border:1px solid #dfdfdc;border-top:0;border-radius:0 0 16px 16px;">
              <p style="margin:0 0 14px;color:#777773;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.2px;line-height:1.4;text-transform:uppercase;">
                ${eyebrow}
              </p>
              <h1 class="email-title" style="margin:0 0 18px;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:30px;font-weight:700;letter-spacing:-0.7px;line-height:1.18;">
                ${title}
              </h1>
              <div style="margin:0 0 30px;color:#4d4d49;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;">
                ${formattedBody}
              </div>

              ${details.length ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 30px;background:#f7f7f5;border:1px solid #e2e2df;border-radius:10px;border-collapse:separate;">
                ${detailRows}
              </table>` : ""}

              ${highlight ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 22px;background:#eaf7ff;border:1px solid #69C5FD;border-radius:10px;border-collapse:separate;">
                <tr>
                  <td width="54" valign="top" style="padding:18px 0 18px 18px;font-family:Arial,Helvetica,sans-serif;font-size:27px;line-height:1;">${highlight.icon}</td>
                  <td style="padding:17px 18px 17px 12px;">
                    <p style="margin:0 0 4px;color:#287fb4;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;letter-spacing:1.5px;line-height:1.4;text-transform:uppercase;">${highlight.eyebrow}</p>
                    <p style="margin:0 0 5px;color:#0b5684;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:800;letter-spacing:-0.2px;line-height:1.3;">${highlight.title}</p>
                    <p style="margin:0;color:#355467;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;">${highlight.text}</p>
                  </td>
                </tr>
              </table>` : ""}

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#111111" style="background:#111111;border-radius:8px;">
                    <a href="${cta.href}" style="display:block;padding:16px 22px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.2;text-align:center;text-decoration:none;">
                      ${cta.text}
                    </a>
                  </td>
                </tr>
              </table>

              ${footerNote ? `
              <p style="margin:22px 0 0;color:#777773;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;text-align:center;">
                ${footerNote}
              </p>` : ""}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:26px 24px 8px;">
              <p style="margin:0 0 8px;color:#3f3f3c;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;line-height:1.5;">
                Traders Rewards
              </p>
              <p style="margin:0 0 18px;color:#777773;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;">
                Une question ? <a href="mailto:contact@traders-rewards.eu" style="color:#111111;text-decoration:underline;">contact@traders-rewards.eu</a>
              </p>
              <p style="margin:0;color:#92928d;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6;">
                Programme d'évaluation de performances sur comptes simulés.<br>
                Ce message contient des informations liées à votre compte Traders Rewards.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
function buildCertificateEmail({
  label,
  heroTitle,
  name,
  title,
  body,
  details,
  certUrl,
  logoUrl,
  preheader,
  qrDataUrl,
}: {
  label: string;
  heroTitle: string;
  name: string;
  title: string;
  body: string;
  details: EmailDetail[];
  certUrl: string;
  logoUrl: string;
  preheader: string;
  qrDataUrl?: string;
}) {
  const detailRows = details.map((detail, index) => `
    <tr>
      <td class="detail-label" style="padding:13px 16px;${index < details.length - 1 ? "border-bottom:1px solid #e4e4e1;" : ""}color:#6c6c67;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;width:52%;">
        ${detail.label}
      </td>
      <td class="detail-value" style="padding:13px 16px;${index < details.length - 1 ? "border-bottom:1px solid #e4e4e1;" : ""}color:#111111;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:700;line-height:1.4;text-align:right;">
        ${detail.value}
      </td>
    </tr>
  `).join("");

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
  <style>
    @media only screen and (max-width:620px) {
      .email-shell { width:100% !important; }
      .certificate-body { padding:32px 22px !important; }
      .certificate-hero { padding:34px 24px 30px !important; }
      .detail-label,.detail-value { display:block !important;width:auto !important;text-align:left !important; }
      .detail-label { padding:13px 14px 3px !important;border-bottom:0 !important; }
      .detail-value { padding:0 14px 13px !important; }
      .certificate-title { font-size:38px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f3f3f1;color:#111111;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#f3f3f1;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="email-shell" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td align="center" style="padding:28px 32px 22px;background:#ffffff;border:1px solid #dfdfdc;border-bottom:0;border-radius:16px 16px 0 0;">
              <img src="${logoUrl}" width="178" alt="Traders Rewards" style="display:block;width:178px;max-width:178px;height:auto;border:0;">
            </td>
          </tr>
          <tr><td style="height:3px;background:#69C5FD;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td class="certificate-hero" style="padding:40px 42px 36px;background:#111111;">
              <p style="margin:0 0 14px;color:#bdbdb8;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.4px;line-height:1.4;text-transform:uppercase;">${label}</p>
              <h1 class="certificate-title" style="margin:0 0 18px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:46px;font-weight:700;letter-spacing:-1.4px;line-height:1;text-transform:uppercase;">${heroTitle}</h1>
              <div style="width:54px;height:2px;margin:0 0 18px;background:#69C5FD;font-size:0;line-height:0;">&nbsp;</div>
              <p style="margin:0;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:1.4;">${name}</p>
            </td>
          </tr>
          <tr>
            <td class="certificate-body" style="padding:40px 42px;background:#ffffff;border:1px solid #dfdfdc;border-top:0;border-radius:0 0 16px 16px;">
              <h2 style="margin:0 0 14px;color:#111111;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:700;letter-spacing:-0.4px;line-height:1.25;">${title}</h2>
              <div style="margin:0 0 28px;color:#4d4d49;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.75;">${body}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 28px;background:#f7f7f5;border:1px solid #e2e2df;border-radius:10px;border-collapse:separate;">
                ${detailRows}
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="#111111" style="background:#111111;border-radius:8px;">
                    <a href="${certUrl}" style="display:block;padding:16px 22px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.2;text-align:center;text-decoration:none;">Télécharger mon certificat</a>
                  </td>
                </tr>
              </table>
              ${qrDataUrl ? `
              <div style="margin-top:28px;padding-top:26px;border-top:1px solid #e4e4e1;text-align:center;">
                <p style="margin:0 0 14px;color:#777773;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;">Vérification d'authenticité</p>
                <a href="${certUrl}" style="display:inline-block;"><img src="${qrDataUrl}" width="132" height="132" alt="QR Code de vérification" style="display:block;width:132px;height:132px;border:1px solid #dededb;border-radius:8px;"></a>
                <p style="margin:12px 0 0;color:#8a8a85;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;">Scannez le QR code pour vérifier l'authenticité du certificat.</p>
              </div>` : ""}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:26px 24px 8px;">
              <p style="margin:0 0 8px;color:#3f3f3c;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;">Traders Rewards</p>
              <p style="margin:0;color:#92928d;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6;">Certificat numérique émis par Traders Rewards.<br>Programme d'évaluation sur comptes simulés.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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
  const details: EmailDetail[] = [
    { label: "Taille du compte", value: accountSize },
    { label: "Type de challenge", value: modelLabel },
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
      { label: "Serveur MT5",      value: mt5.server },
      { label: "Login MT5",        value: String(mt5.login) },
      { label: "Mot de passe MT5", value: mt5.password },
    );
  }
  const ctaHref = setupLink || `${siteUrl}/dashboard`;
  const ctaText = setupLink ? "Créer mon mot de passe et accéder au Dashboard" : "Accéder à mon Dashboard";
  const bodyText = setupLink
    ? `Votre ${modelLabel} ${accountSize} est prêt. Définissez votre mot de passe pour accéder à votre espace et retrouver toutes les informations de votre compte.`
    : `Votre ${modelLabel} ${accountSize} est prêt. Utilisez les identifiants ci-dessous pour vous connecter à MT5 et commencer votre évaluation.`;
  const subject = isAlgo ? "Votre Challenge ALGO est prêt" : "Votre Challenge Traders Rewards est prêt";
  const title = isAlgo ? "Votre Challenge ALGO est actif" : "Votre compte Traders Rewards est actif";
  const html = buildEmail({
    title,
    eyebrow: isAlgo ? "CHALLENGE ALGO" : "ACCÈS AU CHALLENGE",
    preheader: subject,
    body: bodyText,
    details,
    cta: { text: ctaText, href: ctaHref },
    logoUrl,
    footerNote: mt5 ? "Conservez ces identifiants dans un espace sécurisé." : undefined,
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
  const subject = "Phase 1 réussie — Bienvenue en Phase 2";
  const html = buildEmail({
    title: "Phase 1 réussie",
    eyebrow: "PROGRESSION DU CHALLENGE",
    preheader: subject,
    body: `Votre Phase 1 est validée. Un nouveau compte ${accountSize} a été préparé pour la Phase 2. Retrouvez ci-dessous vos nouvelles informations de connexion.`,
    details: [
      { label: "Taille du compte", value: accountSize },
      { label: "Nouvelle phase", value: "Phase 2" },
      { label: "Nouvel objectif", value: "5%" },
      ...(mt5 ? [
        { label: "Nouveau Login MT5", value: String(mt5.login) },
        { label: "Mot de passe", value: mt5.password },
        { label: "Serveur", value: mt5.server },
      ] : []),
    ],
    cta: { text: "Voir mon Dashboard", href: `${siteUrl}/dashboard` },
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
  const subject = "Votre challenge Traders Rewards a été clôturé";
  const html = buildEmail({
    title: "Votre challenge a été clôturé",
    eyebrow: "INFORMATION DE COMPTE",
    preheader: subject,
    body: `Nous vous informons que votre challenge ${accountSize} a été automatiquement arrêté. ${reasonDetail}`,
    details: [
      { label: "Taille du compte", value: accountSize },
      ...(mt5Login ? [{ label: "ID du compte MT5", value: String(mt5Login) }] : []),
      { label: "Raison", value: reasonLabel },
      { label: "Statut", value: "Challenge clôturé" },
    ],
    highlight: {
      icon: "🏅",
      eyebrow: "AVANTAGE FIDÉLITÉ DÉBLOQUÉ",
      title: "-20% à vie sur vos prochains challenges",
      text: "Votre remise fidélité est déjà active. Elle s'applique automatiquement au checkout, hors promotion en cours.",
    },
    cta: { text: "Profiter de mes -20%", href: `${siteUrl}/#pricing` },
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
  const ctaText = setupLink ? "Créer mon mot de passe et accéder au Dashboard" : "Accéder à mon Dashboard";
  const profitSplit = `${splitPct}% pour vous`;
  const subject = "Votre compte Trader Reward est prêt";
  const html = buildEmail({
    title: "Vous êtes désormais Trader Reward",
    eyebrow: "STATUT TRADER REWARD",
    preheader: subject,
    body: `Votre évaluation est terminée avec succès. Votre compte Trader Reward ${accountSize} est prêt et votre partage de profits est désormais actif.`,
    details: [
      { label: "Taille du compte", value: accountSize },
      { label: "Statut", value: "Trader Reward" },
      { label: "Partage des profits", value: profitSplit },
      ...(mt5 ? [
        { label: "Nouveau Login MT5", value: String(mt5.login) },
        { label: "Mot de passe", value: mt5.password },
        { label: "Serveur", value: mt5.server },
      ] : []),
    ],
    cta: { text: ctaText, href: ctaHref },
    logoUrl,
    footerNote: mt5 ? "Conservez ces identifiants dans un espace sécurisé." : undefined,
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
  const profitSign = profitPct >= 0 ? "+" : "";

  const details: EmailDetail[] = [
    { label: "Balance actuelle", value: `$${balance.toLocaleString()}` },
    { label: "Profit / Perte", value: `${profitSign}${profitPct.toFixed(2)}%` },
    { label: "Phase", value: phaseLabel },
    { label: "Jours de trading", value: `${tradingDays}` },
  ];

  if (model === "1step" && highestBalance && totalLimit) {
    const riskAmount = Math.round((startBalance ?? highestBalance) * totalLimit / 100);
    const floor = highestBalance - riskAmount;
    const buffer = balance - floor;
    details.push(
      { label: "Plus haut EOD", value: `$${Math.round(highestBalance).toLocaleString()}` },
      { label: "Plancher trailing actuel", value: `$${Math.round(floor).toLocaleString()}` },
      { label: "Marge avant plancher", value: `$${Math.round(buffer).toLocaleString()}` },
    );
  }

  const subject = `Récapitulatif journalier — Challenge ${accountSize}`;
  const html = buildEmail({
    title: "Récapitulatif journalier",
    eyebrow: "PERFORMANCE DU JOUR",
    preheader: subject,
    body: `Voici les principaux indicateurs de votre compte ${accountSize} à la clôture de la journée.`,
    details,
    cta: { text: "Voir mon Dashboard", href: `${siteUrl}/dashboard` },
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
  publicToken?: string;
  qrDataUrl?:  string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, date, siteUrl, logoUrl, publicToken, qrDataUrl } = p;
  const name = `${firstName} ${lastName}`.trim();
  const certUrl = `${siteUrl}/certificate?type=phase1&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ""}`;
  const subject = `${firstName} — Votre certificat Phase 1`;
  const html = buildCertificateEmail({
    label: "CERTIFICATION",
    heroTitle: "PHASE 1",
    name,
    title: `Phase 1 validée — ${firstName}`,
    body: `Vous avez réussi la Phase 1 de votre challenge <strong>${accountSize}</strong> le <strong>${date}</strong>. Votre compte passe maintenant en Phase 2.`,
    details: [
      { label: "Trader", value: name },
      { label: "Compte", value: accountSize },
      { label: "Date", value: date },
    ],
    certUrl,
    logoUrl,
    qrDataUrl,
    preheader: subject,
  });  return { subject, html };
}

// ── 7. buildChallengeCertificateEmail ─────────────────────────

export function buildChallengeCertificateEmail(p: {
  firstName:   string;
  lastName:    string;
  accountSize: string;
  date:        string;
  siteUrl:     string;
  logoUrl:     string;
  publicToken?: string;
  qrDataUrl?:  string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, date, siteUrl, logoUrl, publicToken, qrDataUrl } = p;
  const name = `${firstName} ${lastName}`.trim();
  const certUrl = `${siteUrl}/certificate?type=challenge&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ""}`;
  const subject = `${firstName} — Votre certificat Trader Reward`;
  const html = buildCertificateEmail({
    label: "CERTIFICATION",
    heroTitle: "TRADER REWARD",
    name,
    title: "Votre challenge est validé",
    body: `${firstName}, vous avez réussi toutes les étapes du challenge <strong>${accountSize}</strong>. Votre statut Trader Reward est désormais confirmé.`,
    details: [
      { label: "Trader", value: name },
      { label: "Compte", value: accountSize },
      { label: "Date", value: date },
    ],
    certUrl,
    logoUrl,
    qrDataUrl,
    preheader: subject,
  });  return { subject, html };
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
  publicToken?: string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, grossAmount, date, netAmountEur, splitPct, siteUrl, logoUrl, publicToken } = p;
  const name = `${firstName} ${lastName}`.trim();
  const netAmount = Math.round(grossAmount * splitPct / 100);
  const certUrl = `${siteUrl}/certificate?type=reward&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(`$${netAmount.toLocaleString()}`)}&date=${encodeURIComponent(date)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ""}`;
  const subjectSuffix = netAmountEur != null ? ` (≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)` : "";
  const subject = `${firstName} — Votre récompense de $${netAmount.toLocaleString()}${subjectSuffix} est en cours`;
  const html = buildCertificateEmail({
    label: "RÉCOMPENSE",
    heroTitle: `$${netAmount.toLocaleString()}`,
    name,
    title: "Votre récompense est validée",
    body: "Votre récompense a été validée et est en cours de traitement. Le versement intervient généralement sous 24 à 48 heures.",
    details: [
      { label: "Trader", value: name },
      { label: "Compte", value: accountSize },
      { label: "Profit brut", value: `$${grossAmount.toLocaleString()}` },
      { label: `Partage (${splitPct}%)`, value: `$${netAmount.toLocaleString()}` },
      ...(netAmountEur != null
        ? [{ label: "Équivalent EUR", value: `≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` }]
        : []),
      { label: "Date", value: date },
    ],
    certUrl,
    logoUrl,
    preheader: subject,
  });  return { subject, html };
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
  const subject = "Votre compte Traders Rewards est rétabli";
  const html = buildEmail({
    title: `Compte rétabli — ${phaseLabel}`,
    eyebrow: "INFORMATION DE COMPTE",
    preheader: subject,
    body: `Bonjour ${firstName},\n\nNous nous excusons pour la gêne occasionnée suite à une erreur technique survenue récemment sur notre plateforme. Votre compte ${accountSize} a été entièrement restauré et est de nouveau actif. Toutes vos positions et votre historique de trading sont intacts.`,
    details: [
      { label: "Taille du compte", value: accountSize },
      { label: "Phase actuelle",   value: phaseLabel },
      { label: "Statut",          value: "Actif" },
      { label: "Serveur MT5",     value: mt5.server },
      { label: "Login MT5",       value: String(mt5.login) },
      { label: "Mot de passe",    value: mt5.password },
    ],
    cta: { text: "Accéder à mon Dashboard", href: `${siteUrl}/dashboard` },
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
