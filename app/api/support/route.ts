import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Phase 3B-3e hotfix ────────────────────────────────────────────────────────
//
// Notification email admin supprimée — le CRM est désormais la source de vérité.
// Aucun email n'est envoyé à l'admin lors de la création d'un ticket.
// Les emails CLIENT (confirmation, réponse) restent gérés séparément.
//
// Auth :
//   1. Bearer JWT (Authorization header) — envoyé depuis SupportTab dashboard.
//      Résolu via admin.auth.getUser(bearer) — plus fiable que le cookie.
//   2. Fallback cookie Supabase (createClient) — pour compatibilité.
//   3. Aucun des deux → user_id = null (visiteur public /support).
//
// RÈGLE ABSOLUE : user_id jamais accepté depuis le body.

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

  const firstName    = trim(body.firstName);
  const lastName     = trim(body.lastName);
  const email        = trim(body.email);
  const message      = trim(body.message);
  const subjectRaw   = trim(body.subject);
  const categoryRaw  = trim(body.category);

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
  // Subject : optionnel (formulaire public) — mais validé si fourni
  if (subjectRaw && subjectRaw.length > 200)
    return NextResponse.json({ error: "Objet trop long (max 200 caractères)." }, { status: 400 });

  // ── Résoudre user_id server-side ──────────────────────────────────────
  //
  // Priorité :
  //   1. Bearer JWT   → admin.auth.getUser() — plus fiable (dashboard SupportTab)
  //   2. Cookie SSR   → createClient().auth.getUser() — fallback (session cookie)
  //   3. Aucun        → user_id = null (visiteur public /support)
  //
  // JAMAIS depuis le body.
  const admin = createAdminClient();
  let user_id: string | null = null;

  // 1 — Bearer JWT
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (bearer) {
    try {
      const { data: { user }, error } = await admin.auth.getUser(bearer);
      if (!error && user?.id) user_id = user.id;
    } catch {
      // Bearer invalide ou expiré — on tente le cookie
    }
  }

  // 2 — Cookie Supabase (fallback)
  if (!user_id) {
    try {
      const serverClient = await createClient();
      const { data: { user } } = await serverClient.auth.getUser();
      if (user?.id) user_id = user.id;
    } catch {
      // Visiteur non connecté ou erreur de session — user_id = null
    }
  }

  // ── Subject : fourni ou auto-généré ──────────────────────────────────────
  // Le formulaire public (/support) n'envoie pas de subject → auto-génération.
  // Le dashboard SupportTab envoie un subject explicite saisi par le trader.
  const subject = subjectRaw || `[Support] ${firstName} ${lastName}`;

  // ── Category : valeurs autorisées ────────────────────────────────────────
  const VALID_CATEGORIES = ["payout", "challenge", "kyc", "technical", "other",
                            "billing", "mt5", "reward"];
  const category = VALID_CATEGORIES.includes(categoryRaw) ? categoryRaw : null;

  // ── INSERT support_tickets ────────────────────────────────────────────────
  const { data: ticket, error: dbError } = await admin
    .from("support_tickets")
    .insert({
      user_id,
      first_name:  firstName,
      last_name:   lastName,
      email,
      subject,
      message,
      status:      "new",
      category,
      assigned_to: null,
    })
    .select("id")
    .single();

  if (dbError || !ticket) {
    console.error("[support] INSERT error:", dbError?.message ?? "no data");
    return NextResponse.json({ error: "Impossible d'enregistrer votre demande. Réessayez." }, { status: 500 });
  }

  // Ticket créé en base. CRM = source de vérité.
  // Aucune notification email admin n'est envoyée.
  return NextResponse.json({ ok: true });
}
