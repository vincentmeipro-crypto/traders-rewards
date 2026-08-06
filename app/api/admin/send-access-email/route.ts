import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const { error: sendError } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.traders-rewards.eu"}/reset-password`,
  });

  if (sendError) return NextResponse.json({ error: sendError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
