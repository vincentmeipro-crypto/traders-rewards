import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Compteur des réponses Support non lues du trader connecté.
// Le marqueur `since` est conservé côté navigateur : il ne donne accès
// à aucune donnée supplémentaire, les tickets restent filtrés par user_id.
export async function GET(req: NextRequest) {
  const bearer = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!bearer) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(bearer);
  if (authError || !user?.id)
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });

  const { data: tickets, error: ticketError } = await admin
    .from("support_tickets")
    .select("id")
    .eq("user_id", user.id);
  if (ticketError)
    return NextResponse.json({ error: "Impossible de charger les notifications." }, { status: 500 });

  const ticketIds = (tickets ?? []).map(ticket => ticket.id as string);
  if (ticketIds.length === 0)
    return NextResponse.json({ unreadCount: 0, latestAdminMessageAt: null });

  const sinceRaw = req.nextUrl.searchParams.get("since");
  const since = sinceRaw && !Number.isNaN(Date.parse(sinceRaw)) ? sinceRaw : null;
  let query = admin
    .from("support_ticket_messages")
    .select("created_at")
    .in("ticket_id", ticketIds)
    .eq("sender_type", "admin")
    .order("created_at", { ascending: false });
  if (since) query = query.gt("created_at", since);

  const { data: messages, error: messageError } = await query;
  if (messageError)
    return NextResponse.json({ error: "Impossible de charger les notifications." }, { status: 500 });

  return NextResponse.json({
    unreadCount: messages?.length ?? 0,
    latestAdminMessageAt: messages?.[0]?.created_at ?? null,
  });
}
