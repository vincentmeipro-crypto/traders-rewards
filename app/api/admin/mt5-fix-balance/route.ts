import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addMT5Balance, getMT5Account, withdrawMT5Balance, changeMT5Group } from "@/lib/mt5";

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
  const { login, amount, comment, withdraw, group } = await req.json();
  if (!login) return NextResponse.json({ error: "Missing login" }, { status: 400 });
  try {
    if (group) {
      await changeMT5Group(login, group);
      return NextResponse.json({ ok: true, login, group });
    }
    if (!amount) return NextResponse.json({ error: "Missing amount" }, { status: 400 });
    if (withdraw) {
      await withdrawMT5Balance(login, amount, comment || "Withdrawal");
    } else {
      await addMT5Balance(login, amount, comment || "Balance correction");
    }
    // Sync new balance to Supabase so dashboard reflects the change
    const admin2 = createAdminClient();
    const newInfo = await getMT5Account(login).catch(() => null);
    if (newInfo?.balance != null) {
      await admin2.from("challenges")
        .update({ balance: newInfo.balance, last_synced_at: new Date().toISOString() })
        .eq("mt5_login", login);
    }
    return NextResponse.json({ ok: true, login, amount, withdraw: !!withdraw, balance: newInfo?.balance });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
