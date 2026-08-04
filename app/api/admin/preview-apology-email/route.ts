import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApologyEmail } from "@/lib/mailer";

const ADMIN_EMAIL = "vincentmeipro@gmail.com";

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await sendApologyEmail(ADMIN_EMAIL, "Bruno", "$100,000", "phase1", {
    login: 9009094831596,
    password: "M@SeSh2u",
    server: "XyloMarkets-Server",
  });

  return NextResponse.json({ ok: true });
}
