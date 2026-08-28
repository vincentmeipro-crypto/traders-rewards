/**
 * ============================================================
 * EMAIL TEMPLATES — Traders Rewards V1.3
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
import { getV1LevelLabel } from "./v1-display";

// ── Type whitelist ────────────────────────────────────────────

export const TRANSACTIONAL_EMAIL_TYPES = [
  "welcome",
  "challenger_validated",   // Compte Challenger validé
  "challenger_expired",     // 30 jours expirés (distinct du DD)
  "phase2",                 // alias rétrocompat → challenger_validated
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

/** Formate un montant en style français "52 100 $"
 *  Normalise les espaces insécables → espace normale. */
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

/** Montant cible du profit en USD */
function profitTargetUsd(bal: number): number {
  if (bal >= 100_000) return 6_000;
  if (bal >= 50_000)  return 3_000;
  return 1_500;
}

/** Label canonique centralisé du niveau réel du compte. */
export function accountLevelLabel(phase: string, paidRewardsCount = 0): string {
  return getV1LevelLabel(phase === "funded" ? "funded" : "phase1", paidRewardsCount);
}

/** Signe + ou vide pour l'affichage des profits */
function sign(n: number): string { return n >= 0 ? "+" : ""; }

/** Formate un entier avec séparateurs français — "1 800"
 *  Normalise tous les espaces insécables (U+00A0, U+202F) en espace ordinaire. */
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("fr-FR").replace(/[  ]/g, " ");
}

/** Formate "$" + entier avec séparateurs français — "$1 800" */
function fmtDollar(n: number): string {
  return "$" + fmtNum(n);
}

// ── Types communs ─────────────────────────────────────────────

/** Un détail est soit une ligne label/valeur, soit un titre de section */
type EmailDetail = {
  label:     string;
  value:     string;
  isHeader?: true;   // Si true → rendu comme titre de section dans le tableau
};

type EmailAction = {
  text: string;
  href: string;
};

type EmailHighlight = {
  icon:   string;
  eyebrow: string;
  title:  string;
  text:   string;
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
  note,
}: {
  title:       string;
  body:        string;
  details:     EmailDetail[];
  cta:         EmailAction;
  logoUrl:     string;
  eyebrow?:    string;
  preheader?:  string;
  footerNote?: string;
  highlight?:  EmailHighlight;
  /** Boîte d'information légère (texte seul, sans icône) avant le CTA */
  note?:       string;
}) {
  const formattedBody = body.replace(/\n/g, "<br/>");

  const detailRows = details.map((detail, index) => {
    if (detail.isHeader) {
      return `
        <tr>
          <td colspan="2" style="padding:9px 16px 7px;color:#86867e;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;letter-spacing:2px;line-height:1.4;text-transform:uppercase;background:#efefe d;${index > 0 ? "border-top:1px solid #e2e2df;" : ""}">
            ${detail.label}
          </td>
        </tr>`;
    }
    // Last real (non-header) row: no bottom border
    const isLastNonHeader = !details.slice(index + 1).some(d => !d.isHeader);
    return `
      <tr>
        <td class="detail-label" style="padding:13px 16px;${!isLastNonHeader ? "border-bottom:1px solid #e5e5e2;" : ""}color:#686864;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;width:52%;vertical-align:top;">
          ${detail.label}
        </td>
        <td class="detail-value" style="padding:13px 16px;${!isLastNonHeader ? "border-bottom:1px solid #e5e5e2;" : ""}color:#111111;font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:700;line-height:1.4;text-align:right;vertical-align:top;">
          ${detail.value}
        </td>
      </tr>`;
  }).join("");

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
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 30px;background:#f7f7f5;border:1px solid #e2e2df;border-radius:10px;border-collapse:separate;overflow:hidden;">
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

              ${note ? `
              <div style="background:#f4f4f1;border-left:3px solid #9CCFEA;border-radius:0 6px 6px 0;padding:12px 16px;margin:0 0 22px;color:#555551;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
                ${note}
              </div>` : ""}

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
  label:      string;
  heroTitle:  string;
  name:       string;
  title:      string;
  body:       string;
  details:    EmailDetail[];
  certUrl:    string;
  logoUrl:    string;
  preheader:  string;
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

// ── 1. buildWelcomeEmail — Activation Compte Challenger ───────

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
  const bal    = parseBalance(accountSize);

  const details: EmailDetail[] = [
    { label: "Taille du compte",   value: accountSize },
    { label: "Niveau",             value: isAlgo ? "Challenge ALGO" : "Challenger" },
    { label: "Objectif de profit", value: isAlgo ? "+6%" : profitTargetStr(bal) },
    ...(isAlgo
      ? [{ label: "Profit éligible", value: "100%" }]
      : [
          { label: "DD EOD fixe",    value: ddEodStr(bal) },
          { label: "Consistance",    value: "≤ 50%" },
          { label: "Jours minimum",  value: "2 jours" },
          { label: "Durée maximum",  value: "30 jours calendaires" },
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

  const levelLabel = isAlgo ? "Challenge ALGO" : "Compte Challenger";
  const body = setupLink
    ? `Votre ${levelLabel} ${accountSize} est prêt. Définissez votre mot de passe pour accéder à votre espace et retrouver toutes les informations de votre compte.`
    : `Votre ${levelLabel} ${accountSize} est prêt. Utilisez les identifiants ci-dessous pour vous connecter à MT5 et commencer votre Challenge.`;

  const subject = isAlgo
    ? "Votre Challenge ALGO est prêt"
    : "Votre Compte Challenger Traders Rewards est prêt";
  const title = isAlgo
    ? "Votre Challenge ALGO est actif"
    : "Votre Compte Challenger Traders Rewards est actif";

  const html = buildEmail({
    title,
    eyebrow:   isAlgo ? "CHALLENGE ALGO" : "ACTIVATION COMPTE CHALLENGER",
    preheader: subject,
    body,
    details,
    cta:       { text: ctaText, href: ctaHref },
    logoUrl,
    footerNote: mt5 ? "Conservez ces identifiants dans un espace sécurisé." : undefined,
  });
  return { subject, html };
}

// ── 2. buildChallengerValidatedEmail ─────────────────────────
//
// Envoyé quand le Compte Challenger a atteint son objectif (+6%).
// Confirme la validation SANS annoncer de nouveaux identifiants
// (le même compte MT5 est conservé jusqu'au Reward #5).

export function buildChallengerValidatedEmail(p: {
  accountSize:      string;
  mt5Login?:        number;
  date?:            string;
  profitTargetUsd?: number;   // ex: 3000 pour 50K
  siteUrl:          string;
  logoUrl:          string;
}): { subject: string; html: string } {
  const { accountSize, mt5Login, date, siteUrl, logoUrl } = p;
  const bal         = parseBalance(accountSize);
  const targetUsd   = p.profitTargetUsd ?? profitTargetUsd(bal);
  const subject     = "Votre Compte Challenger est validé";

  const details: EmailDetail[] = [
    { label: "Taille du compte",     value: accountSize },
    ...(mt5Login ? [{ label: "Login MT5", value: String(mt5Login) }] : []),
    ...(date     ? [{ label: "Date de validation", value: date }] : []),
    { label: "Objectif atteint",     value: `+6 % = ${fmtUsd(targetUsd)}` },
    { label: "Consistance",          value: "≤ 50% respectée" },
    { label: "DD EOD",               value: `${ddEodStr(bal)} respecté` },
    { label: "Jours minimum",        value: "2 jours respectés" },
    { label: "Prochaine étape",      value: "Compte Reward" },
  ];

  const html = buildEmail({
    title:     "Votre Compte Challenger est validé",
    eyebrow:   "CHALLENGER VALIDÉ",
    preheader: subject,
    body:      `Votre Compte Challenger ${accountSize} est validé. Votre compte sera ensuite activé au niveau Compte Reward.`,
    details,
    note:      "Vous conserverez exactement le même login MT5 lors de l'activation du Compte Reward.",
    cta:       { text: "Voir mon Dashboard", href: `${siteUrl}/dashboard` },
    logoUrl,
  });
  return { subject, html };
}

/** Alias rétrocompat — utilise buildChallengerValidatedEmail en interne */
export function buildPhase2Email(p: {
  accountSize: string;
  mt5?:        { login: number; password: string; server: string };
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  return buildChallengerValidatedEmail({
    accountSize: p.accountSize,
    mt5Login:    p.mt5?.login,
    siteUrl:     p.siteUrl,
    logoUrl:     p.logoUrl,
  });
}

// ── 3. buildChallengerExpiredEmail — 30 jours expirés ─────────
//
// Distinct de buildFailedEmail (violation DD).
// Aucune mention de drawdown — la raison est uniquement la durée.
// Anti-double-envoi géré dans mailer.ts via event_key.

export function buildChallengerExpiredEmail(p: {
  accountSize:   string;
  mt5Login?:     number;
  creationDate?: string;
  endDate?:      string;
  siteUrl:       string;
  logoUrl:       string;
}): { subject: string; html: string } {
  const { accountSize, mt5Login, creationDate, endDate, siteUrl, logoUrl } = p;
  const subject = "Votre Compte Challenger Traders Rewards est terminé";

  const details: EmailDetail[] = [
    { label: "Taille du compte",  value: accountSize },
    { label: "Niveau",            value: "Challenger" },
    ...(mt5Login      ? [{ label: "Login MT5",         value: String(mt5Login) }]  : []),
    ...(creationDate  ? [{ label: "Date de création",  value: creationDate }]       : []),
    ...(endDate       ? [{ label: "Date de fin",       value: endDate }]            : []),
    { label: "Durée maximale",    value: "30 jours calendaires" },
    { label: "Statut",            value: "Terminé" },
  ];

  const html = buildEmail({
    title:     "Votre Compte Challenger est terminé",
    eyebrow:   "INFORMATION DE COMPTE",
    preheader: subject,
    body:      `Votre Compte Challenger Traders Rewards ${accountSize} a atteint la limite de 30 jours calendaires prévue pour le Challenge.\n\nLe Challenge n'a pas été validé dans le délai imparti. Votre Compte Challenger est donc clôturé.`,
    details,
    cta:       { text: "Choisir un nouveau Challenge", href: `${siteUrl}/#pricing` },
    logoUrl,
  });
  return { subject, html };
}

// ── 4. buildFailedEmail — Violation DD (distinct de l'expiration) ──

export function buildFailedEmail(p: {
  accountSize:  string;
  reason:       "daily_drawdown" | "total_drawdown";
  mt5Login?:    number;
  /** "funded" → Compte Reward / Trader Reward ; sinon Challenger */
  phase?:       string;
  paidRewardsCount?: number;
  closedAt?:    string;
  siteUrl:      string;
  logoUrl:      string;
}): { subject: string; html: string } {
  const { accountSize, mt5Login, phase, paidRewardsCount = 0, closedAt, siteUrl, logoUrl } = p;
  const currentLevel = accountLevelLabel(phase ?? "phase1", paidRewardsCount);
  const isReward     = currentLevel !== "Challenger";
  const reasonLabel  = "Trailing Drawdown EOD dépassé";
  const reasonDetail = "Le plancher de votre Trailing Drawdown EOD a été franchi. Il s'agit de l'unique limite de drawdown de ce parcours.";
  const title        = isReward ? `Votre ${currentLevel} est terminé` : "Votre Compte Challenger est terminé";
  const subject      = isReward
    ? `Votre ${currentLevel} Traders Rewards a été clôturé`
    : "Votre Compte Challenger Traders Rewards a été clôturé";

  const html = buildEmail({
    title,
    eyebrow:   "INFORMATION DE COMPTE",
    preheader: subject,
    body:      `Nous vous informons que votre compte ${accountSize} a été automatiquement arrêté.\n\n${reasonDetail}`,
    details: [
      { label: "Taille du compte", value: accountSize },
      { label: "Niveau",           value: currentLevel },
      ...(mt5Login ? [{ label: "Login MT5",  value: String(mt5Login) }] : []),
      { label: "Raison",  value: reasonLabel },
      ...(closedAt ? [{ label: "Date de clôture", value: closedAt }] : []),
      { label: "Statut",  value: "Clôturé" },
    ],
    cta:     { text: "Choisir un nouveau Challenge", href: `${siteUrl}/#pricing` },
    logoUrl,
  });
  return { subject, html };
}

// ── 5. buildFundedEmail — Activation Compte Reward ────────────
//
// IMPORTANT : Le Compte Reward conserve exactement les mêmes
// identifiants MT5 que le Challenger (même login, même mot de passe,
// même serveur). Ne jamais écrire "nouveaux identifiants".

export function buildFundedEmail(p: {
  accountSize: string;
  mt5?:        { login: number; password: string; server: string };
  setupLink?:  string;
  splitPct:    number;
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { accountSize, mt5, setupLink, siteUrl, logoUrl } = p;
  const bal          = parseBalance(accountSize);
  const snUsd        = getV1SafetyNet(bal);
  const thresholdUsd = computeRewardRequestThreshold(bal, 1);
  const capUsd       = getV1RewardCap(bal, 1) ?? 0;
  const qualMinUsd   = getV1QualifyingDayMinUsd(bal);

  const ctaHref = setupLink || `${siteUrl}/dashboard`;
  const ctaText = setupLink
    ? "Créer mon mot de passe et accéder au Dashboard"
    : "Accéder à mon Dashboard";

  const details: EmailDetail[] = [
    { label: "Taille du compte",       value: accountSize },
    { label: "Niveau",                  value: "Compte Reward" },
    { label: "Reward actuel",           value: "Reward #1" },
    { label: "Temps illimité",          value: "Aucune limite de durée" },
    { label: "RÈGLES REWARD #1",        value: "", isHeader: true },
    { label: "Safety Net",             value: fmtUsd(snUsd) },
    { label: "Seuil Reward #1",        value: fmtUsd(thresholdUsd) },
    { label: "Cap Reward #1",          value: fmtUsd(capUsd) },
    { label: "Journées qualifiantes",  value: "5 minimum" },
    { label: "Jour qualifiant min.",   value: `${fmtUsd(qualMinUsd)}/jour` },
    { label: "Consistance",            value: "≤ 50%" },
    { label: "DD EOD fixe",           value: ddEodStr(bal) },
    ...(mt5 ? [
      { label: "IDENTIFIANTS MT5 (INCHANGÉS)", value: "", isHeader: true  as const },
      { label: "Login MT5",                     value: String(mt5.login) },
      { label: "Mot de passe MT5",              value: mt5.password },
      { label: "Serveur MT5",                   value: mt5.server },
    ] : []),
  ];

  const subject = "Votre Compte Reward est actif";
  const html = buildEmail({
    title:     "Votre Compte Reward est actif",
    eyebrow:   "ACTIVATION COMPTE REWARD",
    preheader: subject,
    body:      `Votre Challenger a été validé. Votre même compte MT5 poursuit maintenant son parcours au niveau Compte Reward. Vous pouvez progresser vers vos 5 Rewards.`,
    details,
    highlight: {
      icon:    "✓",
      eyebrow: "PROMESSE TRADERS REWARDS",
      title:   "Reward Payé en Automatique en 48H",
      text:    "Dès que votre demande de Reward est validée, le paiement est effectué automatiquement dans les 48 heures.",
    },
    cta:       { text: ctaText, href: ctaHref },
    logoUrl,
    footerNote: mt5 ? "Ces identifiants sont identiques à ceux de votre Compte Challenger." : undefined,
  });
  return { subject, html };
}

// ── 6. buildDailyUpdateEmail — Récapitulatif enrichi ─────────

export type DailyUpdateParams = {
  // Requis
  accountSize:  string;
  phase:        string;
  balance:      number;
  profitPct:    number;
  tradingDays:  number;
  siteUrl:      string;
  logoUrl:      string;

  // Niveau (pour les Trader Reward #2-#5)
  rewardLevel?: number;

  // Base (existant)
  model?:          string;
  startBalance?:   number;
  highestBalance?: number;
  totalLimit?:     number;   // DD % (ex: 5 pour 5%)
  ddFloorUsd?:     number;   // plancher réel fourni par le moteur V1

  // Données enrichies
  equity?:          number;
  dailyProfitUsd?:  number;  // P&L du jour en $
  profitUsd?:       number;  // Profit total en $
  consistency?:     number;  // Consistance actuelle en % (ex: 35)
  bestDayUsd?:      number;  // Meilleure journée en $
  tradesCount?:     number;  // Nombre de trades du jour
  accountStatus?:   string;  // "conforme" | "à surveiller"

  // Challenger
  calendarDaysElapsed?: number;
  calendarDaysMax?:     number;  // 30
  profitTargetPct?:     number;  // 6
  profitTargetUsdParam?: number; // ex: 3000 pour 50K
  minTradingDays?:      number;  // 2

  // Compte Reward / Trader Reward
  safetyNetUsd?:          number;
  rewardCapUsd?:          number;
  rewardThresholdUsd?:    number;
  qualifyingDays?:        number;  // jours qualifiants actuels
  qualifyingDaysRequired?: number; // 5 pour Reward #1
  qualMinDayUsd?:         number;
};

export function buildDailyUpdateEmail(p: DailyUpdateParams): { subject: string; html: string } {
  const {
    accountSize, phase, balance, profitPct, tradingDays,
    highestBalance, totalLimit, ddFloorUsd, startBalance,
    rewardLevel,
    equity, dailyProfitUsd, profitUsd, consistency, bestDayUsd, tradesCount, accountStatus,
    calendarDaysElapsed, calendarDaysMax, profitTargetPct, profitTargetUsdParam, minTradingDays,
    safetyNetUsd, rewardCapUsd, rewardThresholdUsd, qualifyingDays, qualifyingDaysRequired, qualMinDayUsd,
    siteUrl, logoUrl,
  } = p;

  const isChallenger = phase === "challenge" || phase === "challenger" || phase === "phase1";
  const lvlLabel     = isChallenger
    ? "Compte Challenger"
    : accountLevelLabel(phase, Math.max(0, (rewardLevel ?? 1) - 1));
  const profitSign   = profitPct >= 0 ? "+" : "";

  // Calculs dérivés
  const startBal       = startBalance ?? balance;
  const profitUsdCalc  = profitUsd ?? (startBalance ? Math.round(balance - startBalance) : null);
  const ddUsdFixed     = totalLimit ? Math.round(startBal * totalLimit / 100) : null;
  const floor          = ddFloorUsd ?? ((highestBalance != null && ddUsdFixed != null)
    ? Math.round(highestBalance - ddUsdFixed) : null);
  const distToFloor    = floor != null ? Math.max(0, Math.round(balance - floor)) : null;
  const targetUsd      = profitTargetUsdParam ?? (profitTargetPct ? Math.round(startBal * profitTargetPct / 100) : null);
  const distToTarget   = targetUsd != null && profitUsdCalc != null
    ? Math.max(0, targetUsd - profitUsdCalc) : null;
  const calDaysRem     = calendarDaysMax != null && calendarDaysElapsed != null
    ? Math.max(0, calendarDaysMax - calendarDaysElapsed) : null;
  const distToThreshold = rewardThresholdUsd != null
    ? Math.max(0, Math.round(rewardThresholdUsd - balance)) : null;

  // ── Tableau de détails ──────────────────────────────────────
  const details: EmailDetail[] = [];

  // Section : Compte
  details.push({ label: "COMPTE", value: "", isHeader: true });
  details.push({ label: "Balance actuelle",  value: fmtDollar(balance) });
  if (equity != null)
    details.push({ label: "Equity",           value: fmtDollar(equity) });
  if (dailyProfitUsd != null)
    details.push({ label: "P&L du jour",      value: `${sign(dailyProfitUsd)}${fmtDollar(Math.abs(dailyProfitUsd))}` });
  if (profitUsdCalc != null)
    details.push({ label: "Profit total",     value: `${sign(profitUsdCalc)}${fmtDollar(Math.abs(profitUsdCalc))} (${profitSign}${profitPct.toFixed(2)}%)` });
  else
    details.push({ label: "Profit total",     value: `${profitSign}${profitPct.toFixed(2)}%` });
  details.push({ label: "Niveau",             value: lvlLabel });
  details.push({ label: "Jours de trading",   value: `${tradingDays}` });
  if (tradesCount != null)
    details.push({ label: "Trades du jour",   value: `${tradesCount}` });
  if (bestDayUsd != null)
    details.push({ label: "Meilleure journée", value: fmtDollar(bestDayUsd) });
  if (accountStatus)
    details.push({ label: "Statut",           value: accountStatus });

  // Section : Sécurité (plancher)
  if (floor != null || distToFloor != null) {
    details.push({ label: "SÉCURITÉ DD EOD", value: "", isHeader: true });
    if (highestBalance != null)
      details.push({ label: "Plus haut EOD",        value: fmtDollar(highestBalance) });
    if (floor != null)
      details.push({ label: "Plancher DD EOD",      value: fmtDollar(floor) });
    if (distToFloor != null)
      details.push({ label: "Marge avant plancher", value: fmtDollar(distToFloor) });
  }

  // Section : Objectif Challenger
  if (isChallenger) {
    details.push({ label: "OBJECTIF CHALLENGER", value: "", isHeader: true });
    if (targetUsd != null)
      details.push({ label: "Objectif profit",     value: `+${profitTargetPct ?? 6} % = ${fmtDollar(targetUsd)}` });
    if (profitUsdCalc != null)
      details.push({ label: "Profit actuel",       value: `${sign(profitUsdCalc)}${fmtDollar(Math.abs(profitUsdCalc))}` });
    if (distToTarget != null && distToTarget > 0)
      details.push({ label: "Distance restante",   value: `${fmtDollar(distToTarget)} restant` });
    else if (distToTarget === 0)
      details.push({ label: "Objectif",            value: "✓ Atteint" });
    if (tradingDays != null && minTradingDays != null)
      details.push({ label: "Jours tradés",        value: `${tradingDays} / ${minTradingDays} minimum` });
    if (calendarDaysElapsed != null && calendarDaysMax != null)
      details.push({ label: "Jours calendaires",   value: `${calendarDaysElapsed} / ${calendarDaysMax}` });
    if (calDaysRem != null)
      details.push({ label: "Jours restants",      value: `${calDaysRem} jour${calDaysRem !== 1 ? "s" : ""}` });
    if (consistency != null)
      details.push({ label: "Consistance actuelle", value: `${consistency.toFixed(1)}% ≤ 50%` });
  }

  // Section : Reward (Compte Reward / Trader Reward)
  if (!isChallenger) {
    const rwdLabel = rewardLevel && rewardLevel > 1 ? `Trader Reward #${rewardLevel}` : "Reward #1";
    details.push({ label: `OBJECTIF ${rwdLabel.toUpperCase()}`, value: "", isHeader: true });
    if (safetyNetUsd != null)
      details.push({ label: "Safety Net",           value: fmtDollar(safetyNetUsd) });
    if (rewardThresholdUsd != null)
      details.push({ label: `Seuil ${rwdLabel}`,    value: fmtDollar(rewardThresholdUsd) });
    if (distToThreshold != null && distToThreshold > 0)
      details.push({ label: "Distance au seuil",    value: `${fmtDollar(distToThreshold)} restant` });
    else if (distToThreshold === 0)
      details.push({ label: "Seuil",                value: "✓ Atteint" });
    if (rewardCapUsd != null)
      details.push({ label: `Cap ${rwdLabel}`,      value: fmtDollar(rewardCapUsd) });
    if (qualifyingDays != null && qualifyingDaysRequired != null)
      details.push({ label: "Journées qualifiantes", value: `${qualifyingDays} / ${qualifyingDaysRequired}` });
    if (qualMinDayUsd != null)
      details.push({ label: "Min par jour qualifiant", value: fmtDollar(qualMinDayUsd) });
    if (consistency != null)
      details.push({ label: "Consistance actuelle", value: `${consistency.toFixed(1)}% ≤ 50%` });
  }

  // ── Prochaine étape ─────────────────────────────────────────
  let highlight: EmailHighlight | undefined;
  if (isChallenger && distToTarget != null && distToTarget > 0) {
    highlight = {
      icon:    "🎯",
      eyebrow: "PROCHAINE ÉTAPE",
      title:   `Il vous reste ${fmtDollar(distToTarget)} pour atteindre votre objectif`,
      text:    calDaysRem != null
        ? `Vous avez encore ${calDaysRem} jour${calDaysRem !== 1 ? "s" : ""} calendaire${calDaysRem !== 1 ? "s" : ""} pour valider votre Challenge.`
        : "Continuez à respecter les règles de Consistance et de DD EOD.",
    };
  } else if (!isChallenger && distToThreshold != null && distToThreshold > 0) {
    const rwdLabel = rewardLevel && rewardLevel > 1 ? `Reward #${rewardLevel}` : "Reward #1";
    highlight = {
      icon:    "🎯",
      eyebrow: "PROCHAINE ÉTAPE",
      title:   `Il vous reste ${fmtDollar(distToThreshold)} pour atteindre votre seuil ${rwdLabel}`,
      text:    "Continuez à respecter les règles de Consistance, de journées qualifiantes et de DD EOD.",
    };
  } else if (isChallenger && distToTarget === 0) {
    highlight = {
      icon:    "🏆",
      eyebrow: "OBJECTIF ATTEINT",
      title:   "Objectif de profit validé",
      text:    "Félicitations ! Votre Compte Challenger sera prochainement basculé au niveau Compte Reward.",
    };
  }

  const subject = `Récapitulatif journalier — ${lvlLabel} ${accountSize}`;
  const html = buildEmail({
    title:     "Récapitulatif journalier",
    eyebrow:   "PERFORMANCE DU JOUR",
    preheader: subject,
    body:      `Voici les indicateurs de votre compte ${accountSize} à la clôture de la journée.`,
    details,
    highlight,
    cta:     { text: "Voir mon Dashboard complet", href: `${siteUrl}/dashboard` },
    logoUrl,
  });
  return { subject, html };
}

// ── 7. buildPhase1CertificateEmail ────────────────────────────

export function buildPhase1CertificateEmail(p: {
  firstName:    string;
  lastName:     string;
  accountSize:  string;
  date:         string;
  siteUrl:      string;
  logoUrl:      string;
  publicToken?: string;
  qrDataUrl?:   string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, date, siteUrl, logoUrl, publicToken, qrDataUrl } = p;
  const name    = `${firstName} ${lastName}`.trim();
  const certUrl = `${siteUrl}/certificate?type=phase1&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ""}`;
  const subject = `${firstName} — Votre Compte Challenger est validé`;
  const html    = buildCertificateEmail({
    label:     "CERTIFICATION TRADERS REWARDS",
    heroTitle: "CHALLENGER VALIDÉ",
    name,
    title:     `Compte Challenger validé — ${firstName}`,
    body:      `Vous avez validé votre Compte Challenger <strong>${accountSize}</strong> le <strong>${date}</strong>. Votre Compte Reward est maintenant débloqué et le parcours des Rewards commence.`,
    details: [
      { label: "Trader",           value: name },
      { label: "Compte",           value: accountSize },
      { label: "Date",             value: date },
      { label: "Objectif atteint", value: "+6 %" },
      { label: "Login MT5",        value: "Conservé identique" },
    ],
    certUrl,
    logoUrl,
    qrDataUrl,
    preheader: subject,
  });
  return { subject, html };
}

// ── 8. buildChallengeCertificateEmail ─────────────────────────

export function buildChallengeCertificateEmail(p: {
  firstName:    string;
  lastName:     string;
  accountSize:  string;
  date:         string;
  siteUrl:      string;
  logoUrl:      string;
  publicToken?: string;
  qrDataUrl?:   string;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, date, siteUrl, logoUrl, publicToken, qrDataUrl } = p;
  const name    = `${firstName} ${lastName}`.trim();
  const certUrl = `${siteUrl}/certificate?type=challenge&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(accountSize)}&date=${encodeURIComponent(date)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ""}`;
  const subject = `${firstName} — Votre Compte Challenger est validé`;
  const html    = buildCertificateEmail({
    label:     "CERTIFICATION TRADERS REWARDS",
    heroTitle: "CHALLENGER VALIDÉ",
    name,
    title:     "Votre Compte Challenger est validé",
    body:      `${firstName}, vous avez validé votre Compte Challenger <strong>${accountSize}</strong>. Votre Compte Reward est maintenant débloqué. Le parcours des Rewards commence.`,
    details: [
      { label: "Trader",           value: name },
      { label: "Compte",           value: accountSize },
      { label: "Date",             value: date },
      { label: "Objectif atteint", value: "+6 %" },
    ],
    certUrl,
    logoUrl,
    qrDataUrl,
    preheader: subject,
  });
  return { subject, html };
}

// ── 9. buildRewardCertificateEmail ────────────────────────────

export function buildRewardCertificateEmail(p: {
  firstName:     string;
  lastName:      string;
  accountSize:   string;
  grossAmount:   number;
  date:          string;
  rewardLevel?:  number;    // 1-5 (défaut = 1)
  netAmountEur?: number;
  splitPct:      number;
  siteUrl:       string;
  logoUrl:       string;
  publicToken?:  string;
  mt5Login?:     number;
}): { subject: string; html: string } {
  const { firstName, lastName, accountSize, grossAmount, date, rewardLevel, netAmountEur, siteUrl, logoUrl, publicToken, mt5Login } = p;
  const name        = `${firstName} ${lastName}`.trim();
  const lvl         = rewardLevel ?? 1;
  const rewardLabel = lvl === 1 ? "Reward #1" : `Trader Reward #${lvl}`;
  const netAmount   = Math.round(grossAmount);
  const certUrl     = `${siteUrl}/certificate?type=reward&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(`$${netAmount.toLocaleString()}`)}&date=${encodeURIComponent(date)}${publicToken ? `&token=${encodeURIComponent(publicToken)}` : ""}`;
  const euSuffix    = netAmountEur != null ? ` (≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)` : "";
  const subject     = `${firstName} — ${rewardLabel} payé : $${netAmount.toLocaleString()}${euSuffix}`;

  const html = buildCertificateEmail({
    label:     `TRADERS REWARDS · ${rewardLabel.toUpperCase()}`,
    heroTitle: `$${netAmount.toLocaleString()}`,
    name,
    title:     `${rewardLabel} — ${firstName}`,
    body:      `Votre ${rewardLabel} a été validée et payée. Le versement de <strong>$${netAmount.toLocaleString()}</strong> est effectué conformément aux conditions du programme Traders Rewards.`,
    details: [
      { label: "Trader",   value: name },
      { label: "Compte",   value: accountSize },
      ...(mt5Login ? [{ label: "Login MT5", value: String(mt5Login) }] : []),
      { label: rewardLabel, value: `$${netAmount.toLocaleString()}` },
      ...(netAmountEur != null ? [{ label: "Équivalent EUR", value: `≈ ${netAmountEur.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` }] : []),
      { label: "Date",     value: date },
    ],
    certUrl,
    logoUrl,
    preheader: subject,
  });
  return { subject, html };
}

// ── 10. buildRewardProgressionEmail — Reward #1→#5 payé ──────
//
// Envoyé après le paiement de chaque Reward.
// Même compte MT5 — aucun reset d'identifiants.
// Pour rewardPaid = 5 : email "Parcours terminé" avec tous les Rewards.

export function buildRewardProgressionEmail(p: {
  firstName:       string;
  accountSize:     string;
  rewardPaid:      number;    // Reward qui vient d'être payé (1-5)
  rewardAmount:    string;    // Montant formaté ex: "$500"
  mt5Login?:       number;
  siteUrl:         string;
  logoUrl:         string;
  /** Pour Reward #5 : montants de chaque Reward (index 0=R#1 … 4=R#5) */
  allRewardAmounts?: string[];
  totalCumulatedUsd?: number;
  endDate?:        string;
}): { subject: string; html: string } {
  const { firstName, accountSize, rewardPaid, rewardAmount, mt5Login, siteUrl, logoUrl, allRewardAmounts, totalCumulatedUsd, endDate } = p;
  const bal     = parseBalance(accountSize);
  const isFinal = rewardPaid >= 5;

  if (isFinal) {
    const details: EmailDetail[] = [
      { label: "Taille du compte",   value: accountSize },
      ...(mt5Login ? [{ label: "Login MT5", value: String(mt5Login) }] : []),
      ...(endDate  ? [{ label: "Date de fin", value: endDate }] : []),
    ];
    if (allRewardAmounts?.length) {
      details.push({ label: "REWARDS PAYÉS", value: "", isHeader: true });
      allRewardAmounts.forEach((amt, i) => {
        details.push({ label: `Reward #${i + 1}`, value: amt });
      });
      if (totalCumulatedUsd != null)
        details.push({ label: "Total cumulé", value: fmtDollar(totalCumulatedUsd) });
    } else {
      details.push({ label: "Reward #5 payé", value: rewardAmount });
    }
    details.push({ label: "Statut du parcours", value: "Terminé" });

    const subject = `${firstName} — Parcours terminé — 5 Rewards accomplis`;
    const html = buildEmail({
      title:     "Parcours terminé — 5 Rewards",
      eyebrow:   "TRADERS REWARDS · PARCOURS COMPLET",
      preheader: subject,
      body:      `${firstName}, félicitations ! Vous avez complété l'intégralité de votre parcours Traders Rewards en validant vos 5 Rewards.`,
      details,
      highlight: {
        icon:    "🏆",
        eyebrow: "STATUT FINAL",
        title:   "Parcours Terminé",
        text:    totalCumulatedUsd
          ? `Vous avez reçu un total de ${fmtDollar(totalCumulatedUsd)} sur l'ensemble de votre parcours Traders Rewards.`
          : "Vous avez complété les 5 niveaux du parcours Traders Rewards.",
      },
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
      { label: `RÈGLES ${nextLevelLabel.toUpperCase()}`, value: "", isHeader: true },
      { label: "Safety Net",                 value: fmtUsd(snUsd) },
      { label: `Seuil ${nextLevelLabel}`,    value: fmtUsd(nextThreshold) },
      ...(nextCap != null ? [{ label: `Cap ${nextLevelLabel}`, value: fmtUsd(nextCap) }] : []),
      { label: "Consistance",                value: "≤ 50%" },
      { label: "DD EOD fixe",               value: ddEodStr(bal) },
    ],
    highlight: {
      icon:    "✓",
      eyebrow: "PROMESSE TRADERS REWARDS",
      title:   "Reward Payé en Automatique en 48H",
      text:    "Dès que votre prochaine demande de Reward est validée, le paiement est effectué automatiquement dans les 48 heures.",
    },
    cta:     { text: "Voir mon Dashboard", href: `${siteUrl}/dashboard` },
    logoUrl,
  });
  return { subject, html };
}

// ── 11. buildApologyEmail ─────────────────────────────────────

export function buildApologyEmail(p: {
  firstName:   string;
  accountSize: string;
  phase:       string;
  mt5:         { login: number; password: string; server: string };
  siteUrl:     string;
  logoUrl:     string;
}): { subject: string; html: string } {
  const { firstName, accountSize, phase, mt5, siteUrl, logoUrl } = p;
  const lvlLabel = phase === "funded" ? "Compte Reward" : "Compte Challenger";
  const subject  = "Votre compte Traders Rewards est rétabli";
  const html = buildEmail({
    title:     `Compte rétabli — ${lvlLabel}`,
    eyebrow:   "INFORMATION DE COMPTE",
    preheader: subject,
    body:      `Bonjour ${firstName},\n\nNous nous excusons pour la gêne occasionnée suite à une erreur technique survenue récemment sur notre plateforme. Votre compte ${accountSize} a été entièrement restauré et est de nouveau actif. Toutes vos positions et votre historique de trading sont intacts.`,
    details: [
      { label: "Taille du compte", value: accountSize },
      { label: "Niveau actuel",    value: lvlLabel },
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

export function buildPreviewFor(type: TransactionalEmailType, previewModel?: string): { subject: string; html: string } {
  const { siteUrl, logoUrl } = FAKE_BRANDING;
  const { firstName, lastName } = FAKE_PERSON;
  const accountSize = "$100,000";

  switch (type) {
    case "welcome":
      return buildWelcomeEmail({ accountSize, model: previewModel ?? "rewards-100k", mt5: FAKE_MT5, siteUrl, logoUrl });
    case "challenger_validated":
    case "phase2":
      return buildChallengerValidatedEmail({ accountSize, mt5Login: FAKE_MT5.login, date: "27 août 2026", siteUrl, logoUrl });
    case "challenger_expired":
      return buildChallengerExpiredEmail({ accountSize, mt5Login: FAKE_MT5.login, creationDate: "28 juil. 2026", endDate: "27 août 2026", siteUrl, logoUrl });
    case "failed": {
      const variants: Record<string, { phase: string; paidRewardsCount: number }> = {
        challenger:      { phase: "phase1", paidRewardsCount: 0 },
        compte_reward:   { phase: "funded", paidRewardsCount: 0 },
        trader_reward_2: { phase: "funded", paidRewardsCount: 1 },
        trader_reward_3: { phase: "funded", paidRewardsCount: 2 },
        trader_reward_4: { phase: "funded", paidRewardsCount: 3 },
        trader_reward_5: { phase: "funded", paidRewardsCount: 4 },
      };
      const variant = variants[previewModel ?? "challenger"] ?? variants.challenger;
      return buildFailedEmail({
        accountSize,
        reason: "total_drawdown",
        mt5Login: FAKE_MT5.login,
        closedAt: "27 août 2026",
        ...variant,
        siteUrl,
        logoUrl,
      });
    }
    case "funded":
      return buildFundedEmail({ accountSize, mt5: FAKE_MT5, splitPct: 90, siteUrl, logoUrl });
    case "daily_update": {
      const variants: Record<string, { phase: string; rewardLevel?: number }> = {
        challenger:      { phase: "phase1" },
        compte_reward:   { phase: "funded", rewardLevel: 1 },
        trader_reward_2: { phase: "funded", rewardLevel: 2 },
        trader_reward_3: { phase: "funded", rewardLevel: 3 },
        trader_reward_4: { phase: "funded", rewardLevel: 4 },
        trader_reward_5: { phase: "funded", rewardLevel: 5 },
      };
      const variant = variants[previewModel ?? "challenger"] ?? variants.challenger;
      const isChallenger = variant.phase === "phase1";
      return buildDailyUpdateEmail({
        accountSize,
        ...variant,
        balance:             103_500,
        profitPct:           3.5,
        tradingDays:         4,
        equity:              103_420,
        dailyProfitUsd:      650,
        profitUsd:           3_500,
        bestDayUsd:          1_200,
        startBalance:        100_000,
        highestBalance:      104_200,
        ddFloorUsd:          isChallenger ? 101_200 : 100_000,
        totalLimit:          3,
        consistency:         34.2,
        accountStatus:       "Conforme",
        ...(isChallenger ? {
          calendarDaysElapsed: 10,
          calendarDaysMax: 30,
          profitTargetPct: 6,
          profitTargetUsdParam: 6_000,
          minTradingDays: 2,
        } : {
          safetyNetUsd: 103_100,
          rewardCapUsd: getV1RewardCap(100_000, variant.rewardLevel ?? 1) ?? undefined,
          rewardThresholdUsd: computeRewardRequestThreshold(100_000, variant.rewardLevel ?? 1),
          qualifyingDays: variant.rewardLevel === 1 ? 4 : undefined,
          qualifyingDaysRequired: variant.rewardLevel === 1 ? 5 : undefined,
          qualMinDayUsd: variant.rewardLevel === 1 ? getV1QualifyingDayMinUsd(100_000) : undefined,
        }),
        siteUrl,
        logoUrl,
      });
    }
    case "phase1_certificate":
      return buildPhase1CertificateEmail({ firstName, lastName, accountSize, date: "27 août 2026", siteUrl, logoUrl });
    case "challenge_certificate":
      return buildChallengeCertificateEmail({ firstName, lastName, accountSize, date: "27 août 2026", siteUrl, logoUrl });
    case "reward_certificate":
      return buildRewardCertificateEmail({ firstName, lastName, accountSize, grossAmount: 1_750, rewardLevel: 5, date: "27 août 2026", netAmountEur: 1_575, splitPct: 90, mt5Login: FAKE_MT5.login, siteUrl, logoUrl });
    case "reward_progression":
      return buildRewardProgressionEmail({ firstName, accountSize, rewardPaid: 2, rewardAmount: "$850", mt5Login: FAKE_MT5.login, siteUrl, logoUrl });
    case "apology":
      return buildApologyEmail({ firstName, accountSize, phase: "funded", mt5: FAKE_MT5, siteUrl, logoUrl });
  }
}
