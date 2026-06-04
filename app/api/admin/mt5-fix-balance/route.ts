import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addMT5Balance, getMT5Account, withdrawMT5Balance } from "@/lib/mt5";

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  return user?.email === "vincentmeipro@gmail.com";
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const login = Number(req.nextUrl.searchParams.get("login"));
  if (!login) return NextResponse.json({ error: "Missing login" }, { status: 400 });
  try {
    const info = await getMT5Account(login);
    return NextResponse.json({ balance: info.balance, equity: info.equity });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { login, amount, comment, withdraw } = await req.json();
  if (!login || !amount) return NextResponse.json({ error: "Missing login or amount" }, { status: 400 });
  try {
    if (withdraw) {
      await withdrawMT5Balance(login, amount, comment || "Withdrawal");
    } else {
      await addMT5Balance(login, amount, comment || "Balance correction");
    }
    return NextResponse.json({ ok: true, login, amount, withdraw: !!withdraw });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
