import { NextRequest, NextResponse } from "next/server";
import { getBrandingConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Validation ──────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trim(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

export async function POST(req: NextRequest) {
  // ── Parse body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Payload JSON invalide." }, { status: 400 }); }

  const firstName = trim(body.firstName);
  const lastName  = trim(body.lastName);
  const email     = trim(body.email);
  const message   = trim(body.message);

  // ── Validation serveur ──────────────────────────────────────────────────
  if (!firstName || firstName.length > 100)
    return NextResponse.json({ error: "Prénom requis (max 100 caractères)." }, { status: 400 });
  if (!lastName || lastName.length > 100)
    return NextResponse.json({ error: "Nom requis (max 100 caractères)." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email) || email.length > 254)
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  if (!message)
    return NextResponse.json({ error: "Le message ne peut pas être vide." }, { status: 400 });
  if (message.length > 8000)
    return NextResponse.json({ error: "Message trop long (max 8 000 caractères)." }, { status: 400 });

  // ── Déterminer user_id server-side ──────────────────────────────────────
  // Lecture du cookie de session Supabase. Si l'utilisateur est connecté,
  // son user_id est enregistré. Sinon, user_id reste NULL.
  // Jamais accepté depuis le frontend (champ non fourni dans le formulaire).
  let user_id: string | null = null;
  try {
    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (user?.id) user_id = user.id;
  } catch {
    // Visiteur non connecté ou erreur de session — user_id = null, c'est normal
  }

  // ── Subject généré automatiquement ─────────────────────────────────────
  // Le formulaire public n'a pas de champ subject.
  // On génère un subject lisible pour le CRM.
  const subject = `[Support] ${firstName} ${lastName}`;

  // ── INSERT support_tickets AVANT l'email ────────────────────────────────
  // Le ticket est persisté en premier. Si Resend échoue, le ticket reste en base.
  const admin = createAdminClient();
  const { data: ticket, error: dbError } = await admin
    .from("support_tickets")
    .insert({
      user_id,
      first_name: firstName,
      last_name:  lastName,
      email,
      subject,
      message,
      status: "new",
      category: null,
      assigned_to: null,
    })
    .select("id")
    .single();

  if (dbError || !ticket) {
    console.error("[support] INSERT error:", dbError?.message ?? "no data");
    return NextResponse.json({ error: "Impossible d'enregistrer votre demande. Réessayez." }, { status: 500 });
  }

  const ticketId = ticket.id as string;
  const ticketRef = ticketId.slice(0, 8).toUpperCase();

  // ── Envoi email support ─────────────────────────────────────────────────
  // Effectué APRÈS l'INSERT. Un échec Resend ne supprime PAS le ticket.
  let emailOk = false;
  try {
    const branding = await getBrandingConfig();

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#111;padding:24px 32px;border-bottom:1px solid #222;">
          <h2 style="margin:0;color:#60A5FA;font-size:20px;letter-spacing:2px;">NOUVEAU TICKET SUPPORT</h2>
          <div style="margin-top:8px;color:#555;font-size:12px;font-family:monospace;">Ticket #${ticketRef} · ${new Date().toLocaleDateString("fr-FR")}</div>
        </div>
        <div style="padding:32px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#888;font-size:13px;width:130px;">Prénom</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;">${firstName}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:13px;">Nom</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;">${lastName}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:13px;">Email</td><td style="padding:8px 0;color:#00C2FF;font-size:14px;font-weight:600;">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:13px;">Ticket ID</td><td style="padding:8px 0;color:#888;font-size:12px;font-family:monospace;">${ticketId}</td></tr>
          </table>
          <div style="margin-top:24px;background:#1a1a1a;border-radius:10px;padding:20px;border-left:3px solid #60A5FA;">
            <div style="color:#888;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">Message</div>
            <div style="color:#fff;font-size:15px;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          </div>
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #222;color:#555;font-size:12px;">
            Répondre directement à cet email pour contacter le client. · Ticket #${ticketRef}
          </div>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from:     `${branding.senderName} Support <${branding.senderEmail}>`,
        to:       [process.env.ADMIN_EMAIL || "vincentmeipro@gmail.com"],
        reply_to: email,
        subject:  `[Support #${ticketRef}] ${firstName} ${lastName} — nouveau message`,
        html,
      }),
    });

    emailOk = res.ok;
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error("[support] Resend error:", res.status, JSON.stringify(errBody), "ticketId:", ticketId);
    }
  } catch (emailErr) {
    console.error("[support] Email exception:", emailErr, "ticketId:", ticketId);
  }

  // Ticket créé quelle que soit la situation email.
  // On retourne succès — l'email est best-effort.
  if (!emailOk) {
    console.warn("[support] Ticket créé mais email non envoyé. ticketId:", ticketId);
  }

  return NextResponse.json({ ok: true });
}
