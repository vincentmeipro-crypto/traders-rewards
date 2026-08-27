/**
 * ============================================================
 * EMAIL TEMPLATES — Traders Rewards V1.2
 * ============================================================
 * Builders purs (synchrones, sans IO) pour les emails
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

// ── V1 engine helpers (purs TypeScript — safe à importer) ────
import {
  getV1SafetyNet,
  getV1RewardCap,
  computeRewardRequestThreshold,
  getV1QualifyingDayMinUsd,
} from "./v1-engine";

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
  "reward_progression",
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

// ── Helpers internes ──────────────────────────────────────────

/** Parse "$50,000" ou "$50 000" → 50000 */
function parseBalance(s: string): number {
  const n = parseInt(s.replace(/[^0-9]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

/** Formate un montant USD en style français : "52 100 $"
 *  Normalise les espaces insécables ( ,  ) → espace normale
 *  pour la compatibilité email HTML et les tests de contenu. */
function fmtUsd(n: number): string {
  return n.toLocaleString("fr-FR").replace(/[  ]/g, " ") + " $";
}

/** DD EOD fixe en $ selon la taille du compte */
function ddEodStr(bal: number): string {
  if (bal >= 100_000) return "3 000 $";
  if (bal >= 50_000)  return "2 000 $";
  return "1 000 $";
}

/** Objectif de profit Challenge : +6% avec montant en $ */
function profitTargetStr(bal: number): string {
  if (bal >= 100_000) return "+6 % = 6 000 $";
  if (bal >= 50_000)  return "+6 % = 3 000 $";
  return "+6 % = 1 500 $";
}

// ── Types communs ─────────────────────────────────────────────

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

// ── Generic email builder (internal — non exporté) ────────────

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
            <td style="height:3px;background:#9CCFEA;font-size:0;line-height:0;">&nbsp;</td>
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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 22px;background:#eaf7ff;border:1px solid #9CCFEA;border-radius:10px;border-collapse:separate;">
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
          <tr><td style="height:3px;background:#9CCFEA;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr>
            <td class="certificate-hero" style="padding:40px 42px 36px;background:#111111;">
              <p style="margin:0 0 14px;color:#bdbdb8;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:2.4px;line-height:1.4;text-transform:uppercase;">${label}</p>
              <h1 class="certificate-title" style="margin:0 0 18px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:46px;font-weight:700;letter-spacing:-1.4px;line-height:1;text-transform:uppercase;">${heroTitle}</h1>
              <div style="width:54px;height:2px;margin:0 0 18px;background:#9CCFEA;font-size:0;line-height:0;">&nbsp;</div>
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

// ── 1. buildWelcomeEmail — Création du Challenger ─────────────

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
  const bal     = parseBalance(accountSize);

  const details: EmailDetail[] = [
    { label: "Taille du compte",    value: accountSize },
    { label: "Niveau",              value: isAlgo ? "Challenge ALGO" : "Challenger" },
    { label: "Objectif de profit",  value: isAlgo ? "+6%" : profitTargetStr(bal) },
    ...(isAlgo
      ? [
          { label: "Profit éligible", value: "100%" },
        ]
      : [
          { label: "DD EOD fixe",      value: ddEodStr(bal) },
          { label: "Consistance",       value: "≤ 50%" },
          { label: "Jours minimum",     value: "2 jours" },
          { label: "Durée maximum",     value: "30 jours calendaires" },
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
  const ctaText = setupLink
    ? "Créer mon mot de passe et accéder au Dashboard"
    : "Accéder à mon Dashboard";

  const levelLabel = isAlgo ? "Challenge ALGO" : "Challenger";
  const bodyText = setupLink
    ? `Votre ${levelLabel} ${accountSize} est prêt. Définissez votre mot de passe pour accéder à votre espace et retrouver toutes les informations de votre compte.`
    : `Votre ${levelLabel} ${accountSize} est prêt. Utilisez les identifiants ci-dessous pour vous connecter à MT5 et commencer votre évaluation.`;

  const subject = isAlgo
    ? "Votre Challenge ALGO est prêt"
    : "Votre Challenger Traders Rewards est prêt";
  const title = isAlgo
    ? "Votre Challenge ALGO est actif"
    : "Votre Challenger Traders Rewards est actif";

  const html = buildEmail({
    title,
    eyebrow:   isAlgo ? "CHALLENGE ALGO" : "ACCÈS AU CHALLENGER",
    preheader: subject,
    body:      bodyText,
    details,
    cta:       { text: ctaText, href: ctaHref },
    logoUrl,
    footerNote: mt5 ? "Conservez ces identifiants dans un espace sécurisé." : undefined,
  });
  return { subject, html };
}

// ── 2. buildPhase2Email — Challenger validé (ancien 2-step) ───

export function buildPhase2Email(p: {
  accountSize: string;
  mt5?:        { login: number; password: string; server: string };
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { accountSize, mt5, siteUrl, logoUrl } = p;
  const subject = "Votre Challenger est validé";
  const html = buildEmail({
    title:     "Votre Challenger est validé",
    eyebrow:   "VALIDATION DU CHALLENGER",
    preheader: subject,
    body: `Votre Challenger ${accountSize} est validé. Un nouveau compte a été préparé pour votre Compte Reward. Retrouvez ci-dessous vos nouvelles informations de connexion.`,
    details: [
      { label: "Taille du compte", value: accountSize },
      { label: "Niveau suivant",   value: "Compte Reward" },
      ...(mt5 ? [
        { label: "Nouveau Login MT5", value: String(mt5.login) },
        { label: "Mot de passe",      value: mt5.password },
        { label: "Serveur",           value: mt5.server },
      ] : []),
    ],
    cta:     { text: "Voir mon Dashboard", href: `${siteUrl}/dashboard` },
    logoUrl,
  });
  return { subject, html };
}

// ── 3. buildFailedEmail — Challenger ou Reward terminé ────────

export function buildFailedEmail(p: {
  accountSize: string;
  reason:      "daily_drawdown" | "total_drawdown";
  mt5Login?:   number;
  phase?:      string;   // "funded" → parcours Reward, sinon Challenger
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { accountSize, mt5Login, phase, siteUrl, logoUrl } = p;
  const isFunded     = phase === "funded";
  const reasonLabel  = "Trailing Drawdown EOD dépassé";
  const reasonDetail = "Le plancher de votre Trailing Drawdown EOD a été franchi. Il s'agit de l'unique limite de drawdown de ce parcours.";
  const title        = isFunded ? "Votre parcours Reward est terminé" : "Votre Challenger est terminé";
  const subject      = isFunded
    ? "Votre parcours Reward Traders Rewards a été clôturé"
    : "Votre Challenger Traders Rewards a été clôturé";

  const html = buildEmail({
    title,
    eyebrow:   "INFORMATION DE COMPTE",
    preheader: subject,
    body:      `Nous vous informons que votre compte ${accountSize} a été automatiquement arrêté. ${reasonDetail}`,
    details: [
      { label: "Taille du compte", value: accountSize },
      ...(mt5Login ? [{ label: "ID du compte MT5", value: String(mt5Login) }] : []),
      { label: "Raison",  value: reasonLabel },
      { label: "Statut",  value: isFunded ? "Parcours clôturé" : "Challenger clôturé" },
    ],
    cta:     { text: "Choisir un nouveau Challenge", href: `${siteUrl}/#pricing` },
    logoUrl,
  });
  return { subject, html };
}

// ── 4. buildFundedEmail — Compte Reward activé ────────────────

export function buildFundedEmail(p: {
  accountSize: string;
  mt5?:        { login: number; password: string; server: string };
  setupLink?:  string;
  splitPct:    number;
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { accountSize, mt5, setupLink, siteUrl, logoUrl } = p;
  const bal            = parseBalance(accountSize);
  const snUsd          = getV1SafetyNet(bal);
  const thresholdUsd   = computeRewardRequestThreshold(bal, 1);
  const capUsd         = getV1RewardCap(bal, 1) ?? 0;
  const qualMinUsd     = getV1QualifyingDayMinUsd(bal);

  const ctaHref = setupLink || `${siteUrl}/dashboard`;
  const ctaText = setupLink
    ? "Créer mon mot de passe et accéder au Dashboard"
    : "Accéder à mon Dashboard";

  const subject = "Votre Compte Reward est prêt";
  const html = buildEmail({
    title:     "Votre Compte Reward est actif",
    eyebrow:   "COMPTE REWARD ACTIVÉ",
    preheader: subject,
    body:      `Votre Challenger est validé. Votre Compte Reward ${accountSize} est prêt : vous pouvez maintenant progresser vers vos 5 Rewards.`,
    details: [
      { label: "Taille du compte",           value: accountSize },
      { label: "Niveau",                      value: "Compte Reward" },
      { label: "Reward actuel",               value: "Reward #1" },
      { label: "Safety Net",                  value: fmtUsd(snUsd) },
      { label: "Seuil Reward #1",             value: fmtUsd(thresholdUsd) },
      { label: "Cap Reward #1",               value: fmtUsd(capUsd) },
      { label: "Journées qualifiantes",       value: "5 minimum" },
      { label: "Jour qualifiant minimum",     value: `${fmtUsd(qualMinUsd)}/jour` },
      { label: "Consistance",                 value: "≤ 50%" },
      { label: "DD EOD fixe",                 value: ddEodStr(bal) },
      ...(mt5 ? [
        { label: "Login MT5",        value: String(mt5.login) },
        { label: "Mot de passe MT5", value: mt5.password },
        { label: "Serveur MT5",      value: mt5.server },
      ] : []),
    ],
    highlight: {
      icon:    "✓",
      eyebrow: "PROMESSE TRADERS REWARDS",
      title:   "Reward Payé en Automatique en 48H",
      text:    "Dès que votre demande de Reward est validée, le paiement est effectué automatiquement dans les 48 heures.",
    },
    cta:     { text: ctaText, href: ctaHref },
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
    highestBalance, totalLimit, startBalance,
    siteUrl, logoUrl,
  } = p;
  const phaseLabel = phase === "funded" ? "Compte Reward" : "Challenger";
  const profitSign = profitPct >= 0 ? "+" : "";

  const details: EmailDetail[] = [
    { label: "Balance actuelle",  value: `$${balance.toLocaleString()}` },
    { label: "Profit / Perte",    value: `${profitSign}${profitPct.toFixed(2)}%` },
    { label: "Niveau",            value: phaseLabel },
    { label: "Jours de trading",  value: `${tradingDays}` },
  ];

  if (highestBalance && totalLimit) {
    const riskAmount = Math.round((startBalance ?? highestBalance) * totalLimit / 100);
    const floor  = highestBalance - riskAmount;
    const buffer = balance - floor;
    details.push(
      { label: "Plus haut EOD",             value: `$${Math.round(highestBalance).toLocaleString()}` },
      { label: "Plancher trailing actuel",   value: `$${Math.round(floor).toLocaleString()}` },
      { label: "Marge avant plancher",       value: `$${Math.round(buffer).toLocaleString()}` },
    );
  }

  const subject = `Récapitulatif journalier — ${phaseLabel} ${accountSize}`;
  const html = buildEmail({
    title:     "Récapitulatif journalier",
    eyebrow:   "PERFORMANCE DU JOUR",
    preheader: subject,
    body:      `Voici les principaux indicateurs de votre compte ${accountSize} à la clôture de la journée.`,
    details,
    cta:     { text: "Voir mon Dashboard", href: `${siteUrl}/dashboard` },
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
  const name    = `${firstName} ${lastName}`.trim();
  const certUrl = `${siteUrl}/certificate?type=phase1&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ""}`;
  const subject = `${firstName} — Votre Challenger est validé`;
  const html    = buildCertificateEmail({
    label:     "CERTIFICATION TRADERS REWARDS",
    heroTitle: "CHALLENGER VALIDÉ",
    name,
    title:     `Challenger validé — ${firstName}`,
    body:      `Vous avez validé votre Challenger <strong>${accountSize}</strong> le <strong>${date}</strong>. Votre Compte Reward est maintenant débloqué et le parcours des Rewards commence.`,
    details: [
      { label: "Trader",  value: name },
      { label: "Compte",  value: accountSize },
      { label: "Date",    value: date },
      { label: "Objectif atteint", value: "+6 %" },
    ],
    certUrl,
    logoUrl,
    qrDataUrl,
    preheader: subject,
  });
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
  publicToken?: string;
  qrDataUrl?:  string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, date, siteUrl, logoUrl, publicToken, qrDataUrl } = p;
  const name    = `${firstName} ${lastName}`.trim();
  const certUrl = `${siteUrl}/certificate?type=challenge&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ""}`;
  const subject = `${firstName} — Votre Challenger est validé`;
  const html    = buildCertificateEmail({
    label:     "CERTIFICATION TRADERS REWARDS",
    heroTitle: "CHALLENGER VALIDÉ",
    name,
    title:     "Votre Challenger est validé",
    body:      `${firstName}, vous avez validé votre Challenger <strong>${accountSize}</strong>. Votre Compte Reward est maintenant débloqué. Le parcours des Rewards commence.`,
    details: [
      { label: "Trader",  value: name },
      { label: "Compte",  value: accountSize },
      { label: "Date",    value: date },
      { label: "Objectif atteint", value: "+6 %" },
    ],
    certUrl,
    logoUrl,
    qrDataUrl,
    preheader: subject,
  });
  return { subject, html };
}

// ── 8. buildRewardCertificateEmail ────────────────────────────

export function buildRewardCertificateEmail(p: {
  firstName:    string;
  lastName:     string;
  accountSize:  string;
  grossAmount:  number;
  date:         string;
  rewardLevel?: number;   // 1-5 (optionnel, défaut = 1)
  netAmountEur?: number;
  splitPct:     number;
  siteUrl:      string;
  logoUrl:      string;
  publicToken?: string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, grossAmount, date, rewardLevel, netAmountEur, siteUrl, logoUrl, publicToken } = p;
  const name         = `${firstName} ${lastName}`.trim();
  const lvl          = rewardLevel ?? 1;
  const rewardLabel  = lvl === 1 ? "Reward #1" : `Trader Reward #${lvl}`;
  const netAmount    = Math.round(grossAmount);
  const certUrl      = `${siteUrl}/certificate?type=reward&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(`$${netAmount.toLocaleString()}`)}&date=${encodeURIComponent(date)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ""}`;
  const subjectSuffix = netAmountEur != null ? ` (≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)` : "";
  const subject       = `${firstName} — ${rewardLabel} payé : $${netAmount.toLocaleString()}${subjectSuffix}`;

  const html = buildCertificateEmail({
    label:     `TRADERS REWARDS · ${rewardLabel.toUpperCase()}`,
    heroTitle: `$${netAmount.toLocaleString()}`,
    name,
    title:     `${rewardLabel} — ${firstName}`,
    body:      `Votre ${rewardLabel} a été validée et payée. Le versement de <strong>$${netAmount.toLocaleString()}</strong> est effectué conformément aux conditions du programme.`,
    details: [
      { label: "Trader",                 value: name },
      { label: "Compte",                 value: accountSize },
      { label: rewardLabel,              value: `$${netAmount.toLocaleString()}` },
      ...(netAmountEur != null
        ? [{ label: "Équivalent EUR", value: `≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` }]
        : []),
      { label: "Date", value: date },
    ],
    certUrl,
    logoUrl,
    preheader: subject,
  });
  return { subject, html };
}

// ── 9. buildRewardProgressionEmail — Reward #1→#5 payé ───────
//
// Envoyé après le paiement de chaque Reward.
// Indique le nouveau niveau et les règles pour le prochain Reward.
// Pour rewardPaid = 5 : email "Parcours terminé".

export function buildRewardProgressionEmail(p: {
  firstName:    string;
  accountSize:  string;
  rewardPaid:   number;   // Numéro du Reward qui vient d'être payé (1-5)
  rewardAmount: string;   // Montant formaté ex: "$500"
  mt5Login?:    number;
  siteUrl:      string;
  logoUrl:      string;
}): { subject: string; html: string } {
  const { firstName, accountSize, rewardPaid, rewardAmount, mt5Login, siteUrl, logoUrl } = p;
  const bal      = parseBalance(accountSize);
  const isFinal  = rewardPaid >= 5;

  if (isFinal) {
    const subject = `${firstName} — Parcours terminé — 5 Rewards accomplis`;
    const html = buildEmail({
      title:     "Parcours terminé — 5 Rewards",
      eyebrow:   "TRADERS REWARDS · PARCOURS COMPLET",
      preheader: subject,
      body:      `${firstName}, félicitations ! Vous avez complété l'intégralité de votre parcours Traders Rewards en validant vos 5 Rewards. Statut : Terminé.`,
      details: [
        { label: "Taille du compte",   value: accountSize },
        ...(mt5Login ? [{ label: "Login MT5", value: String(mt5Login) }] : []),
        { label: "Reward #5 payé",     value: rewardAmount },
        { label: "Statut du parcours", value: "Terminé" },
      ],
      cta:     { text: "Voir mon Dashboard", href: `${siteUrl}/dashboard` },
      logoUrl,
    });
    return { subject, html };
  }

  // Reward N → niveau suivant
  const nextLevel      = rewardPaid + 1;
  const nextLevelLabel = `Trader Reward #${nextLevel}`;
  const snUsd          = getV1SafetyNet(bal);
  const nextCap        = getV1RewardCap(bal, nextLevel);
  const nextThreshold  = computeRewardRequestThreshold(bal, nextLevel);

  const subject = `${firstName} — Reward #${rewardPaid} payé — Niveau : ${nextLevelLabel}`;
  const html = buildEmail({
    title:     `Reward #${rewardPaid} payé`,
    eyebrow:   `TRADERS REWARDS · ${nextLevelLabel.toUpperCase()}`,
    preheader: subject,
    body:      `${firstName}, votre Reward #${rewardPaid} de ${rewardAmount} a été versé. Votre compte passe maintenant au niveau ${nextLevelLabel}.`,
    details: [
      { label: "Taille du compte",           value: accountSize },
      ...(mt5Login ? [{ label: "Login MT5", value: String(mt5Login) }] : []),
      { label: `Reward #${rewardPaid} payé`, value: rewardAmount },
      { label: "Niveau suivant",             value: nextLevelLabel },
      { label: "Safety Net",                 value: fmtUsd(snUsd) },
      { label: `Seuil ${nextLevelLabel}`,    value: fmtUsd(nextThreshold) },
      ...(nextCap != null ? [{ label: `Cap ${nextLevelLabel}`, value: fmtUsd(nextCap) }] : []),
      { label: "Consistance",                value: "≤ 50%" },
      { label: "DD EOD fixe",                value: ddEodStr(bal) },
    ],
    cta:     { text: "Voir mon Dashboard", href: `${siteUrl}/dashboard` },
    logoUrl,
  });
  return { subject, html };
}

// ── 10. buildApologyEmail ─────────────────────────────────────

export function buildApologyEmail(p: {
  firstName:   string;
  accountSize: string;
  phase:       string;
  mt5:         { login: number; password: string; server: string };
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { firstName, accountSize, phase, mt5, siteUrl, logoUrl } = p;
  const phaseLabel = phase === "funded" ? "Compte Reward" : "Challenger";
  const subject    = "Votre compte Traders Rewards est rétabli";
  const html = buildEmail({
    title:     `Compte rétabli — ${phaseLabel}`,
    eyebrow:   "INFORMATION DE COMPTE",
    preheader: subject,
    body:      `Bonjour ${firstName},\n\nNous nous excusons pour la gêne occasionnée suite à une erreur technique survenue récemment sur notre plateforme. Votre compte ${accountSize} a été entièrement restauré et est de nouveau actif. Toutes vos positions et votre historique de trading sont intacts.`,
    details: [
      { label: "Taille du compte", value: accountSize },
      { label: "Niveau actuel",    value: phaseLabel },
      { label: "Statut",           value: "Actif" },
      { label: "Serveur MT5",      value: mt5.server },
      { label: "Login MT5",        value: String(mt5.login) },
      { label: "Mot de passe",     value: mt5.password },
    ],
    cta:     { text: "Accéder à mon Dashboard", href: `${siteUrl}/dashboard` },
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
      return buildWelcomeEmail({ accountSize, model: previewModel ?? "rewards-100k", mt5: FAKE_MT5, siteUrl, logoUrl });
    case "phase2":
      return buildPhase2Email({ accountSize, mt5: FAKE_MT5, siteUrl, logoUrl });
    case "failed":
      return buildFailedEmail({ accountSize, reason: "total_drawdown", mt5Login: FAKE_MT5.login, siteUrl, logoUrl });
    case "funded":
      return buildFundedEmail({ accountSize, mt5: FAKE_MT5, splitPct: 100, siteUrl, logoUrl });
    case "daily_update":
      return buildDailyUpdateEmail({ accountSize, phase: "phase1", balance: 103500, profitPct: 3.5, tradingDays: 4, siteUrl, logoUrl });
    case "phase1_certificate":
      return buildPhase1CertificateEmail({ firstName, lastName, accountSize, date: "09 août 2026", siteUrl, logoUrl });
    case "challenge_certificate":
      return buildChallengeCertificateEmail({ firstName, lastName, accountSize, date: "09 août 2026", siteUrl, logoUrl });
    case "reward_certificate":
      return buildRewardCertificateEmail({ firstName, lastName, accountSize, grossAmount: 1750, rewardLevel: 5, date: "09 août 2026", netAmountEur: 1600, splitPct: 100, siteUrl, logoUrl });
    case "reward_progression":
      return buildRewardProgressionEmail({ firstName, accountSize, rewardPaid: 2, rewardAmount: "$850", mt5Login: FAKE_MT5.login, siteUrl, logoUrl });
    case "apology":
      return buildApologyEmail({ firstName, accountSize, phase: "funded", mt5: FAKE_MT5, siteUrl, logoUrl });
  }
}
