import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { pin, token } = await req.json();

  const supabase = createAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!pin || pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Code secret incorrect" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
