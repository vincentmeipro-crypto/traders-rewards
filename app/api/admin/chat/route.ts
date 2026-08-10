import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/admin/chat ────────────────────────────────────────────────────────
//
// Liste paginée des conversations chat pour le CRM admin.
//
// Params :
//   status   : all | waiting_support | open | waiting_client | closed (défaut: all)
//   search   : email | first_name | last_name (ilike)
//   page     : 1-based (défaut: 1)
//
// Sécurité :
//   - visitor_token_hash JAMAIS retourné
//   - checkAdmin requis
//
// Performance :
//   - 2 queries Supabase (conversations + messages récents)
//   - Promise.all pour les 2 queries secondaires
//   - unread_count calculé server-side depuis admin_last_read_at
//
// Retourne :
//   { conversations, total, totalPages, page, totalWaiting }

const LIMIT = 25;

const VALID_STATUSES = ["all", "waiting_support", "open", "waiting_client", "closed"] as const;

export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = VALID_STATUSES.includes(searchParams.get("status") as typeof VALID_STATUSES[number])
    ? (searchParams.get("status") as string)
    : "all";
  const search = (searchParams.get("search") || "").trim().slice(0, 100);
  const page   = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const offset = (page - 1) * LIMIT;

  const admin = createAdminClient();

  // ── Query 1 : conversations paginées ────────────────────────────────────────
  let q = admin
    .from("chat_conversations")
    .select(
      // visitor_token_hash intentionnellement absent
      "id, user_id, email, first_name, last_name, status, last_message_at, created_at, support_ticket_id, admin_last_read_at",
      { count: "exact" }
    );

  if (status !== "all") q = q.eq("status", status);
  if (search) {
    const safe = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.or(`email.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
  }

  const convRes = await q
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at",      { ascending: false })
    .range(offset, offset + LIMIT - 1);

  if (convRes.error) {
    console.error("[admin/chat] GET list error:", convRes.error.message);
    return NextResponse.json({ error: "Impossible de charger les conversations." }, { status: 500 });
  }

  const conversations = convRes.data ?? [];
  const total      = convRes.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // ── Compteur "à répondre" pour badge onglet ──────────────────────────────────
  const { count: totalWaiting } = await admin
    .from("chat_conversations")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting_support");

  if (conversations.length === 0) {
    return NextResponse.json({
      conversations: [],
      total,
      totalPages,
      page,
      totalWaiting: totalWaiting ?? 0,
    });
  }

  const convIds = conversations.map((c) => c.id);

  // ── Queries 2+3 en parallèle : messages récents pour preview + unread ─────────
  // On récupère les 200 derniers messages (preview + unread pour convs peu actives)
  // et les messages client (pour unread robuste)
  const [recentMsgsRes, clientMsgsRes] = await Promise.all([
    // Preview : dernier message par conversation (desc → premier per conv en JS)
    admin
      .from("chat_messages")
      .select("conversation_id, sender_type, message, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(200),

    // Unread : messages client uniquement (optimisation volumétrie)
    admin
      .from("chat_messages")
      .select("conversation_id, created_at")
      .in("conversation_id", convIds)
      .eq("sender_type", "client")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  // ── Groupement JS ─────────────────────────────────────────────────────────────
  const lastMsgByConv: Record<string, { sender_type: string; message: string } | null> = {};
  for (const msg of recentMsgsRes.data ?? []) {
    if (!lastMsgByConv[msg.conversation_id]) {
      lastMsgByConv[msg.conversation_id] = msg; // premier = plus récent
    }
  }

  const clientDatesByConv: Record<string, string[]> = {};
  for (const msg of clientMsgsRes.data ?? []) {
    if (!clientDatesByConv[msg.conversation_id]) clientDatesByConv[msg.conversation_id] = [];
    clientDatesByConv[msg.conversation_id].push(msg.created_at);
  }

  // ── Assemblage final ──────────────────────────────────────────────────────────
  const enriched = conversations.map((conv) => {
    const lastMsg     = lastMsgByConv[conv.id];
    const adminLastRead = conv.admin_last_read_at as string | null;

    const unreadCount = (clientDatesByConv[conv.id] ?? []).filter(
      (d) => !adminLastRead || d > adminLastRead
    ).length;

    return {
      id:                    conv.id,
      user_id:               conv.user_id,
      email:                 conv.email,
      first_name:            conv.first_name,
      last_name:             conv.last_name,
      status:                conv.status,
      last_message_at:       conv.last_message_at,
      created_at:            conv.created_at,
      support_ticket_id:     conv.support_ticket_id,
      unread_count:          unreadCount,
      last_message_preview:  lastMsg ? lastMsg.message.slice(0, 120) : null,
      last_message_sender:   lastMsg?.sender_type ?? null,
      // visitor_token_hash : JAMAIS exposé
    };
  });

  return NextResponse.json({
    conversations: enriched,
    total,
    totalPages,
    page,
    totalWaiting: totalWaiting ?? 0,
  });
}
