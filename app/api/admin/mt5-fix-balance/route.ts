import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addMT5Balance } from "@/lib/mt5";

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  return user?.email === "vincentmeipro@gmail.com";
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { login, amount, comment } = await req.json();
  if (!login || !amount) return NextResponse.json({ error: "Missing login or amount" }, { status: 400 });
  try {
    await addMT5Balance(login, amount, comment || "Balance correction");
    return NextResponse.json({ ok: true, login, amount });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
