import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = "fundedelysium@gmail.com";

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (user?.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://elysium-funded.com"}/reset-password` },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send via Supabase built-in email (uses the recovery template)
  const { error: sendError } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://elysium-funded.com"}/reset-password`,
  });

  if (sendError) return NextResponse.json({ error: sendError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
