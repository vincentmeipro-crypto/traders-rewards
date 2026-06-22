import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMT5History } from "@/lib/mt5";

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const login = Number(req.nextUrl.searchParams.get("login"));
  if (!login) return NextResponse.json({ error: "Missing login" }, { status: 400 });

  // Vérifier que ce login appartient bien à cet utilisateur
  const { data: challenge } = await admin
    .from("challenges")
    .select("id")
    .eq("user_id", user.id)
    .eq("mt5_login", login)
    .single();

  if (!challenge) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const [mt5History, supabaseResult] = await Promise.allSettled([
      getMT5History(login),
      admin.from("trade_history").select("*").eq("login", login).order("closed_at", { ascending: false }),
    ]);

    const mt5Trades = mt5History.status === "fulfilled" ? (mt5History.value as unknown[]) : [];

    const supabaseTrades = supabaseResult.status === "fulfilled" && supabaseResult.value.data
      ? supabaseResult.value.data.map((t: Record<string, unknown>) => ({
          ticket: t.ticket,
          login: t.login,
          symbol: t.symbol,
          type: t.type,
          volume: t.volume,
          price: t.open_price,
          profit: t.profit,
          time: t.closed_at ? Math.floor(new Date(t.closed_at as string).getTime() / 1000) : 0,
          entry: 1,
          comment: t.comment ?? "breach",
          _source: "supabase",
        }))
      : [];

    // Déduplique par ticket — MT5 a priorité sur Supabase
    const mt5Tickets = new Set((mt5Trades as Record<string, unknown>[]).map(t => t.ticket));
    const uniqueSupabase = supabaseTrades.filter(t => !mt5Tickets.has(t.ticket));

    return NextResponse.json([...mt5Trades, ...uniqueSupabase]);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
