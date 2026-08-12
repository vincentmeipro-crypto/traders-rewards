/**
 * ============================================================
 * MAILER — Traders Rewards V2 Phase 1
 * ============================================================
 * V2 Phase 1 : les valeurs branding (SITE, LOGO, sender) et les
 * paramètres de payout sont chargés depuis la table settings via
 * lib/config.ts. Fallback hardcodé si Supabase indisponible.
 *
 * Pour modifier ces valeurs : Admin → Settings (interface admin).
 * Ne plus éditer les URLs ou emails directement dans ce fichier.
 *
 * Phase 3B-0 : sendEmail() retourne un résultat structuré et ne
 * throw plus jamais. _loggedSend() journalise chaque tentative
 * d'envoi dans public.email_logs (service_role). Aucun HTML ni
 * credential n'est stocké dans les logs.
 *
 * Phase 3B-1b : les builders HTML sont extraits dans
 * lib/email-templates.ts (purs, sync, sans IO).
 * sendTestEmail() permet l'envoi de test sécurisé vers ADMIN_EMAIL
 * uniquement. Les signatures publiques des 9 sendXxxEmail() sont
 * inchangées — aucun caller métier à modifier.
 * ============================================================
 */

import { getBrandingConfig, getPayoutSplits } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/admin-auth";
import { ensureCertificateRecord } from "@/lib/certificates";
import {
  buildWelcomeEmail,
  buildPhase2Email,
  buildFailedEmail,
  buildFundedEmail,
  buildDailyUpdateEmail,
  buildPhase1CertificateEmail,
  buildChallengeCertificateEmail,
  buildRewardCertificateEmail,
  buildApologyEmail,
  buildPreviewFor,
  type TransactionalEmailType,
} from "@/lib/email-templates";

// ── Sender résolution ─────────────────────────────────────────

async function resolveSender(): Promise<string> {
  try {
    const b = await getBrandingConfig();
    return `${b.senderName} <${b.senderEmail}>`;
  } catch {
    return "Traders Rewards <contact@traders-rewards.eu>";
  }
}

// ── Transport email ───────────────────────────────────────────
//
// Phase 3B-0 : ne throw plus jamais.
// Retourne { success, resendId, error? } dans tous les cas.
// La réponse Resend est parsée sur succès pour capturer data.id.
// Les erreurs sont sanitisées et tronquées à 500 chars.

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; resendId: string | null; error?: string }> {
  try {
    const from = await resolveSender();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown error");
      const error = `Resend ${res.status}: ${errText}`.slice(0, 500);
      return { success: false, resendId: null, error };
    }
    const data = await res.json().catch(() => ({}));
    return { success: true, resendId: (data as { id?: string }).id ?? null };
  } catch (err) {
    const error = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    return { success: false, resendId: null, error };
  }
}

// ── Logging interne ───────────────────────────────────────────
//
// Phase 3B-0 : primitive centrale non exportée.
// Appelle sendEmail() puis insère une ligne dans public.email_logs.
// Ne throw jamais — si l'INSERT échoue, console.error sanitisé.
// Aucun HTML ni credential n'est stocké dans email_logs.
//
// Phase 3B-1b : retourne le résultat sendEmail (au lieu de void)
// pour permettre à sendTestEmail() de remonter le statut.
// Tous les callers existants ignorent le retour — pas de breaking change.

async function _loggedSend(params: {
  type: string;
  to: string;
  subject: string;
  html: string;
  userId?: string;
  challengeId?: string;
  eventKey?: string;
}): Promise<{ success: boolean; resendId: string | null; error?: string }> {
  const { type, to, subject, html, userId, challengeId, eventKey } = params;

  const result = await sendEmail(to, subject, html);

  try {
    const admin = createAdminClient();
    await admin.from("email_logs").insert({
      type,
      to_email:     to,
      user_id:      userId      ?? null,
      challenge_id: challengeId ?? null,
      subject,
      resend_id:    result.resendId ?? null,
      status:       result.success ? "sent" : "failed",
      error:        result.success ? null : (result.error ?? null),
      event_key:    eventKey ?? null,
    });
  } catch (logErr) {
    const errMsg = logErr instanceof Error ? logErr.message : String(logErr);
    console.error(
      `[email_logs] INSERT failed — type=${type} to=${to} sent=${result.success} :`,
      errMsg.slice(0, 200),
    );
  }

  return result;
}

// ── Emails exportés ───────────────────────────────────────────
// Signatures identiques à celles d'avant la Phase 3B-1b.
// Aucun caller métier à modifier.

export async function sendWelcomeEmail(
  to: string,
  accountSize: string,
  model: string,
  mt5?: { login: number; password: string; server: string },
  setupLink?: string,
  opts?: { userId?: string; challengeId?: string },
) {
  const { siteUrl, logoUrl } = await getBrandingConfig();
  const { subject, html } = buildWelcomeEmail({ accountSize, model, mt5, setupLink, siteUrl, logoUrl });
  await _loggedSend({
    type: "welcome",
    to,
    subject,
    html,
    userId:      opts?.userId,
    challengeId: opts?.challengeId,
  });
}

export async function sendPhase2Email(
  to: string,
  accountSize: string,
  mt5?: { login: number; password: string; server: string },
  opts?: { userId?: string; challengeId?: string },
) {
  const { siteUrl, logoUrl } = await getBrandingConfig();
  const { subject, html } = buildPhase2Email({ accountSize, mt5, siteUrl, logoUrl });
  await _loggedSend({
    type: "phase2",
    to,
    subject,
    html,
    userId:      opts?.userId,
    challengeId: opts?.challengeId,
  });
}

export async function sendFailedEmail(
  to: string,
  accountSize: string,
  reason: "daily_drawdown" | "total_drawdown",
  mt5Login?: number,
  opts?: { userId?: string; challengeId?: string },
) {
  const { siteUrl, logoUrl } = await getBrandingConfig();
  const { subject, html } = buildFailedEmail({ accountSize, reason, mt5Login, siteUrl, logoUrl });
  await _loggedSend({
    type: "failed",
    to,
    subject,
    html,
    userId:      opts?.userId,
    challengeId: opts?.challengeId,
  });
}

export async function sendFundedEmail(
  to: string,
  accountSize: string,
  mt5?: { login: number; password: string; server: string },
  setupLink?: string,
  model?: string,
  opts?: { userId?: string; challengeId?: string },
) {
  const [branding, splits] = await Promise.all([
    getBrandingConfig(),
    getPayoutSplits(),
  ]);
  const { siteUrl, logoUrl } = branding;
  const is1Step = model?.toLowerCase().replace(/[\s-]/g, "").includes("1step");
  const splitPct = is1Step ? splits.split1step : splits.split2step;
  const { subject, html } = buildFundedEmail({ accountSize, mt5, setupLink, splitPct, siteUrl, logoUrl });
  await _loggedSend({
    type: "funded",
    to,
    subject,
    html,
    userId:      opts?.userId,
    challengeId: opts?.challengeId,
  });
}

export async function sendDailyUpdateEmail(
  to: string,
  accountSize: string,
  phase: string,
  balance: number,
  profitPct: number,
  tradingDays: number,
  opts?: { model?: string; highestBalance?: number; totalLimit?: number; startBalance?: number },
  log?: { userId?: string; challengeId?: string },
) {
  const { siteUrl, logoUrl } = await getBrandingConfig();
  const { subject, html } = buildDailyUpdateEmail({
    accountSize,
    phase,
    balance,
    profitPct,
    tradingDays,
    model:          opts?.model,
    highestBalance: opts?.highestBalance,
    totalLimit:     opts?.totalLimit,
    startBalance:   opts?.startBalance,
    siteUrl,
    logoUrl,
  });
  await _loggedSend({
    type: "daily_update",
    to,
    subject,
    html,
    userId:      log?.userId,
    challengeId: log?.challengeId,
  });
}

export async function sendPhase1CertificateEmail(
  to: string, firstName: string, lastName: string, accountSize: string, date: string,
  opts?: { userId?: string; challengeId?: string },
) {
  const { siteUrl, logoUrl } = await getBrandingConfig();
  const publicToken = opts?.challengeId ? await ensureCertificateRecord({
    type: "phase1",
    challengeId: opts.challengeId,
    traderDisplayName: `${firstName} ${lastName}`,
    accountSize,
  }) : null;
  const { subject, html } = buildPhase1CertificateEmail({
    firstName, lastName, accountSize, date, siteUrl, logoUrl, publicToken: publicToken ?? undefined,
  });
  await _loggedSend({
    type: "phase1_certificate",
    to,
    subject,
    html,
    userId:      opts?.userId,
    challengeId: opts?.challengeId,
  });
}

export async function sendChallengeCertificateEmail(
  to: string, firstName: string, lastName: string, accountSize: string, date: string,
  opts?: { userId?: string; challengeId?: string },
) {
  const { siteUrl, logoUrl } = await getBrandingConfig();
  const publicToken = opts?.challengeId ? await ensureCertificateRecord({
    type: "phase2",
    challengeId: opts.challengeId,
    traderDisplayName: `${firstName} ${lastName}`,
    accountSize,
  }) : null;
  const { subject, html } = buildChallengeCertificateEmail({
    firstName, lastName, accountSize, date, siteUrl, logoUrl, publicToken: publicToken ?? undefined,
  });
  await _loggedSend({
    type: "challenge_certificate",
    to,
    subject,
    html,
    userId:      opts?.userId,
    challengeId: opts?.challengeId,
  });
}

export async function sendRewardCertificateEmail(
  to: string, firstName: string, lastName: string, accountSize: string,
  grossAmount: number, model: string, date: string, netAmountEur?: number,
  opts?: { userId?: string; challengeId?: string; publicToken?: string },
) {
  const [branding, splits] = await Promise.all([
    getBrandingConfig(),
    getPayoutSplits(),
  ]);
  const { siteUrl, logoUrl } = branding;
  const is1Step = model?.toLowerCase().replace(/[\s-]/g, "").includes("1step");
  const splitPct = is1Step ? splits.split1step : splits.split2step;
  const { subject, html } = buildRewardCertificateEmail({
    firstName, lastName, accountSize, grossAmount, date, netAmountEur, splitPct, siteUrl, logoUrl,
    publicToken: opts?.publicToken,
  });
  await _loggedSend({
    type: "reward_certificate",
    to,
    subject,
    html,
    userId:      opts?.userId,
    challengeId: opts?.challengeId,
  });
}

export async function sendApologyEmail(
  to: string,
  firstName: string,
  accountSize: string,
  phase: string,
  mt5: { login: number; password: string; server: string },
  opts?: { userId?: string; challengeId?: string },
) {
  const { siteUrl, logoUrl } = await getBrandingConfig();
  const { subject, html } = buildApologyEmail({ firstName, accountSize, phase, mt5, siteUrl, logoUrl });
  await _loggedSend({
    type: "apology",
    to,
    subject,
    html,
    userId:      opts?.userId,
    challengeId: opts?.challengeId,
  });
}

// ── sendNewSupportTicketAdminNotification ─────────────────────
//
// Phase 3B-3e : notification interne lors de la création d'un nouveau ticket Support.
// Envoyée UNE SEULE FOIS par ticket (idempotence via email_logs.event_key).
//
// Destination : ADMIN_EMAIL (résolu côté serveur — jamais exposé client)
// From        : Traders Rewards <contact@traders-rewards.eu> (via resolveSender)
// Content     : métadonnées ticket uniquement — JAMAIS le message du client
// Fire-and-forget : l'échec n'empêche pas la création du ticket
//
// NE PAS appeler pour :
//   - réponses client à un ticket existant
//   - réponses admin
//   - changements de statut
//   - Live Chat

export async function sendNewSupportTicketAdminNotification(params: {
  ticketId:  string;
  firstName: string;
  lastName:  string;
  email:     string;
  subject:   string;
  category:  string | null;
  userId?:   string;
}): Promise<void> {
  const { ticketId, firstName, lastName, email, subject, category, userId } = params;

  if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes("@")) {
    console.error("[mailer] sendNewSupportTicketAdminNotification: ADMIN_EMAIL non configuré");
    return;
  }

  const eventKey = `support_new_ticket:${ticketId}`;

  // ── Idempotence ─────────────────────────────────────────────
  // Vérifie si la notification a déjà été envoyée pour ce ticket.
  // En cas d'échec du check, on envoie quand même (pire cas = double email unique — acceptable).
  try {
    const adminDb = createAdminClient();
    const { data: existing } = await adminDb
      .from("email_logs")
      .select("id")
      .eq("event_key", eventKey)
      .maybeSingle();
    if (existing) return; // Déjà envoyé — idempotent
  } catch (checkErr) {
    console.warn(
      "[mailer] Idempotence check support_new_ticket failed, sending anyway:",
      String(checkErr).slice(0, 200),
    );
  }

  // ── Branding ────────────────────────────────────────────────
  // siteUrl uniquement — logo non nécessaire pour une notification interne courte.
  let siteUrl = "https://www.traders-rewards.eu";
  try {
    const b = await getBrandingConfig();
    siteUrl = b.siteUrl;
  } catch { /* fallback hardcodé */ }

  const crmUrl = `${siteUrl}/x8k3pz/support`;

  // ── HTML ────────────────────────────────────────────────────
  // Simple, court, sans message client.
  // Aucun dangerouslySetInnerHTML — template string statique avec valeurs échappées.
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const categoryRow = category
    ? `<tr>
        <td style="color:#888;font-size:13px;padding:10px 0;border-bottom:1px solid #f0f0f0;width:40%;">Catégorie&nbsp;:</td>
        <td style="color:#111;font-size:13px;font-weight:700;padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${esc(category)}</td>
      </tr>`
    : "";

  const html = `
<div style="background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:10px;padding:32px 28px;box-shadow:0 2px 8px rgba(0,0,0,0.07);">

    <h2 style="color:#1a1a1a;font-size:19px;font-weight:800;margin:0 0 8px 0;">🔔 Nouveau ticket Support</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 22px 0;">
      Nouvelle demande de support reçue. Connecte-toi au CRM pour consulter le message complet et y répondre.
    </p>

    <table width="100%" cellPadding="0" cellSpacing="0" style="border-top:1px solid #ebebeb;margin-bottom:24px;">
      <tr>
        <td style="color:#888;font-size:13px;padding:10px 0;border-bottom:1px solid #f0f0f0;width:40%;">Client&nbsp;:</td>
        <td style="color:#111;font-size:13px;font-weight:700;padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${esc(firstName)} ${esc(lastName)}</td>
      </tr>
      <tr>
        <td style="color:#888;font-size:13px;padding:10px 0;border-bottom:1px solid #f0f0f0;">Email&nbsp;:</td>
        <td style="color:#111;font-size:13px;font-weight:700;padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${esc(email)}</td>
      </tr>
      <tr>
        <td style="color:#888;font-size:13px;padding:10px 0;border-bottom:1px solid #f0f0f0;">Objet&nbsp;:</td>
        <td style="color:#111;font-size:13px;font-weight:700;padding:10px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${esc(subject)}</td>
      </tr>
      ${categoryRow}
    </table>

    <a href="${crmUrl}" style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;padding:11px 24px;border-radius:8px;font-weight:700;font-size:14px;">Consulter dans le CRM →</a>

    <p style="color:#c0c0c0;font-size:11px;margin:28px 0 0 0;padding-top:16px;border-top:1px solid #f0f0f0;line-height:1.5;">
      Notification interne Traders Rewards — ne pas répondre directement à cet email.<br/>
      Ticket ID&nbsp;: ${esc(ticketId)}
    </p>
  </div>
</div>`;

  const emailSubject = `🔔 Nouveau ticket Support — ${subject}`;

  await _loggedSend({
    type:     "support_notification",
    to:       ADMIN_EMAIL,
    subject:  emailSubject,
    html,
    userId,
    eventKey,
  });
}

// ── sendTestEmail ─────────────────────────────────────────────
//
// Phase 3B-1b : envoi de test sécurisé vers ADMIN_EMAIL uniquement.
//
// - templateType : un des 9 types transactionnels
// - Destinataire : ADMIN_EMAIL (résolu côté serveur — non exposable)
// - Subject : "[TEST] " + subject réel
// - HTML : template avec fake data (FAKE_MT5, FAKE_PERSON, etc.)
// - Journalisé : type = "test:{templateType}", status sent/failed
// - Ne crée aucun challenge, n'appelle aucun MT5, aucun Stripe.

export async function sendTestEmail(params: {
  templateType: TransactionalEmailType;
}): Promise<{ success: boolean; resendId: string | null; error?: string }> {
  if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes("@")) {
    return { success: false, resendId: null, error: "ADMIN_EMAIL non configuré" };
  }
  const { subject: rawSubject, html } = buildPreviewFor(params.templateType);
  const subject = `[TEST] ${rawSubject}`;
  return await _loggedSend({
    type: `test:${params.templateType}`,
    to:   ADMIN_EMAIL,
    subject,
    html,
  });
}
