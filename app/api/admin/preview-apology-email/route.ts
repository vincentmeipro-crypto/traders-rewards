import { NextRequest, NextResponse } from "next/server";
import { sendApologyEmail } from "@/lib/mailer";
import { checkAdmin, ADMIN_EMAIL } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await sendApologyEmail(ADMIN_EMAIL, "Bruno", "$100,000", "phase1", {
    login: 9009094831596,
    password: "M@SeSh2u",
    server: "XyloMarkets-Server",
  });

  return NextResponse.json({ ok: true });
}
