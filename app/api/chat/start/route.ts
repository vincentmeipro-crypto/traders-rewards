import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateVisitorToken,
  hashVisitorToken,
  buildChatCookieHeader,
  readVisitorToken,
} from "@/lib/chat-token";
import { checkRateLimit } from "@/lib/chat-rate-limit";

// ── POST /api/chat/start ──────────────────────────────────────────────────────
//
// Crée ou reprend une conversation de chat.
//
// Corps (optionnel — formulaire pré-chat visiteur) :
//   { firstName?: string, lastName?: string, email?: string }
//
// Auth :
//   Bearer <token>   → trader connecté (JWT Supabase)
//   Cookie tr_chat_v1 → visiteur anonyme
//   Aucun            → visiteur sans historique (nouveau cookie émis)
//
// Réponse :
//   { conversationId: string, isNew: boolean, status: string }
//   JAMAIS le token brut ni le hash.
//
// Rate limit : 5 créations / 5 minutes par IP.
//
// ── LOGIQUE MERGE VISITEUR → TRADER ──────────────────────────────────────────
//
// Si un JWT valide est présenté ET un cookie visiteur est également présent :
//   1. Chercher une conversation ouverte du trader (par user_id)
//   2. Si aucune, chercher une conversation visiteur non fermée (par cookie hash)
//   3. Si trouvée → "claim" : set user_id = trader.id, visitor_token_hash = NULL
//      (libère l'index unique, la conversation appartient désormais au trader)
//   4. Si aucune conversation → créer une nouvelle pour le trader
//
// Edge case : trader avec conversation existante + cookie orphelin
//   → retourner la conversation trader (la conversation visiteur reste en attente
//     d'être clôturée ou purgée par rétention)

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Rate limit ─────────────────────────────────────────────────────────────
  const ip = getIp(req);
  if (!checkRateLimit(`chat_start:${ip}`, 5, 5 * 60_000)) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  // ── Parse body optionnel ───────────────────────────────────────────────────
  // Formulaire pré-chat visiteur uniquement — validé et sanitisé ici.
  // Jamais accepté comme source de user_id ou d'identité d'authentification.
  let bodyFirstName = "", bodyLastName = "", bodyEmail = "";
  try {
    const raw = await req.json().catch(() => ({}));
    bodyFirstName = safeStr(raw?.firstName, 100);
    bodyLastName  = safeStr(raw?.lastName,  100);
    bodyEmail     = safeStr(raw?.email,     254);
    if (bodyEmail && !EMAIL_RE.test(bodyEmail)) bodyEmail = "";
  } catch {
    // Body absent ou invalide — acceptable (tous les champs sont optionnels)
  }

  const admin = createAdminClient();

  // ── Résolution identité trader (server-side) ───────────────────────────────
  // user_id résolu depuis le JWT — jamais depuis le body.
  let traderId      = "";
  let traderEmail   = "";
  let traderFirst   = "";
  let traderLast    = "";
  let isTrader      = false;

  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (bearer) {
    const { data: { user }, error } = await admin.auth.getUser(bearer);
    if (!error && user?.id) {
      isTrader    = true;
      traderId    = user.id;
      traderEmail = user.email ?? "";

      // Hydrater prénom/nom depuis profiles si disponible
      const { data: profile } = await admin
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", traderId)
        .maybeSingle();
      traderFirst = profile?.first_name ?? "";
      traderLast  = profile?.last_name  ?? "";
    }
    // Note : si le Bearer est fourni mais invalide, on ne tombe PAS sur le cas visiteur.
    // Un token expiré ou malformé retourne 401 explicitement.
    if (!isTrader) {
      return NextResponse.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
    }
  }

  // ════════════════════════════════════════════════════════════
  // CAS 1 — Trader connecté
  // ════════════════════════════════════════════════════════════

  if (isTrader) {
    // ── 1a. Conversation du trader (UNIQUE INDEX : une seule possible) ────────
    // Note : on ne filtre PAS sur le statut.
    //   - UNIQUE INDEX chat_conversations_user_id_uidx empêche un second INSERT.
    //   - Si la conversation existe mais est fermée → on la rouvre (waiting_support).
    //   - Cette approche garantit qu'un trader a toujours UNE conversation persistante.
    const { data: existing } = await admin
      .from("chat_conversations")
      .select("id, status")
      .eq("user_id", traderId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      let finalStatus = existing.status;

      // Rouvrir si fermée (V1 : conversation persistante)
      if (existing.status === "closed") {
        await admin
          .from("chat_conversations")
          .update({ status: "waiting_support" })
          .eq("id", existing.id);
        finalStatus = "waiting_support";
      }

      return NextResponse.json({
        conversationId: existing.id,
        isNew:          false,
        status:         finalStatus,
      });
    }

    // ── 1b. Merge visiteur → trader ────────────────────────────────────────
    // Si le trader arrive avec un cookie visiteur (il était anonyme avant de se connecter),
    // on tente de "claim" la conversation visiteur et de l'associer au compte trader.
    // Cela préserve l'historique de la conversation entamée en anonyme.
    const visitorToken = readVisitorToken(req.headers.get("cookie"));
    if (visitorToken) {
      const tokenHash = hashVisitorToken(visitorToken);

      const { data: anonConv } = await admin
        .from("chat_conversations")
        .select("id, status")
        .eq("visitor_token_hash", tokenHash)
        .neq("status", "closed")
        .maybeSingle();

      if (anonConv) {
        // Claim : associer au trader
        //   user_id            = trader.id
        //   visitor_token_hash = NULL  → libère l'index unique UNIQUE INDEX partiel
        //   Infos de contact   = complétées depuis le profil trader
        const { data: claimed } = await admin
          .from("chat_conversations")
          .update({
            user_id:            traderId,
            visitor_token_hash: null,
            // Ne pas écraser les infos déjà renseignées par le visiteur
            ...(traderEmail && { email: traderEmail }),
            ...(traderFirst && { first_name: traderFirst }),
            ...(traderLast  && { last_name:  traderLast  }),
          })
          .eq("id", anonConv.id)
          .select("id, status")
          .single();

        if (claimed) {
          return NextResponse.json({
            conversationId: claimed.id,
            isNew:          false,
            status:         claimed.status,
          });
        }
      }
    }

    // ── 1c. Créer une nouvelle conversation pour le trader ─────────────────
    const { data: created, error: createErr } = await admin
      .from("chat_conversations")
      .insert({
        user_id:    traderId,
        email:      traderEmail || null,
        first_name: traderFirst || null,
        last_name:  traderLast  || null,
        status:     "waiting_support",
      })
      .select("id, status")
      .single();

    if (createErr || !created) {
      console.error("[chat/start] INSERT trader error:", createErr?.message);
      return NextResponse.json(
        { error: "Impossible de créer la conversation. Réessayez." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { conversationId: created.id, isNew: true, status: created.status },
      { status: 201 },
    );
  }

  // ════════════════════════════════════════════════════════════
  // CAS 2 — Visiteur anonyme
  // ════════════════════════════════════════════════════════════

  const visitorToken = readVisitorToken(req.headers.get("cookie"));
  let cookieToSet    = "";   // token à émettre si nouveau (vide = pas de Set-Cookie)

  if (visitorToken) {
    const tokenHash = hashVisitorToken(visitorToken);

    // ── 2a. Reprendre conversation existante non fermée ────────────────────
    const { data: existing } = await admin
      .from("chat_conversations")
      .select("id, status")
      .eq("visitor_token_hash", tokenHash)
      .neq("status", "closed")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        conversationId: existing.id,
        isNew:          false,
        status:         existing.status,
      });
    }

    // Cookie présent mais conversation fermée ou absente (purge RGPD, etc.)
    // → créer une nouvelle conversation avec le MÊME token (on garde le cookie)
    const { data: created, error: createErr } = await admin
      .from("chat_conversations")
      .insert({
        visitor_token_hash: tokenHash,
        email:      bodyEmail     || null,
        first_name: bodyFirstName || null,
        last_name:  bodyLastName  || null,
        status:     "waiting_support",
      })
      .select("id, status")
      .single();

    if (createErr || !created) {
      console.error("[chat/start] INSERT visitor (existing token) error:", createErr?.message);
      return NextResponse.json(
        { error: "Impossible de créer la conversation. Réessayez." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { conversationId: created.id, isNew: true, status: created.status },
      { status: 201 },
    );
  }

  // ── 2b. Aucun cookie — nouveau visiteur ───────────────────────────────────
  // Générer un nouveau token, créer la conversation, émettre le cookie.
  const newToken  = generateVisitorToken();
  const tokenHash = hashVisitorToken(newToken);
  cookieToSet     = newToken;

  const { data: created, error: createErr } = await admin
    .from("chat_conversations")
    .insert({
      visitor_token_hash: tokenHash,
      email:      bodyEmail     || null,
      first_name: bodyFirstName || null,
      last_name:  bodyLastName  || null,
      status:     "waiting_support",
    })
    .select("id, status")
    .single();

  if (createErr || !created) {
    console.error("[chat/start] INSERT new visitor error:", createErr?.message);
    return NextResponse.json(
      { error: "Impossible de créer la conversation. Réessayez." },
      { status: 500 },
    );
  }

  const response = NextResponse.json(
    { conversationId: created.id, isNew: true, status: created.status },
    { status: 201 },
  );

  // Émettre le cookie httpOnly — le client ne voit que conversationId
  // Le token brut n'apparaît JAMAIS dans le body JSON
  response.headers.set("Set-Cookie", buildChatCookieHeader(cookieToSet));

  return response;
}
