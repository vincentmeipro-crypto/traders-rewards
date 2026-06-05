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
    const history = await getMT5History(login);
    return NextResponse.json(history);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
