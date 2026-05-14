import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "No code provided" }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("promo_codes")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .single();

    if (error || !data) return NextResponse.json({ error: "Invalid code" }, { status: 404 });
    if (!data.active) return NextResponse.json({ error: "Code revoked" }, { status: 400 });
    if (data.expires_at && new Date(data.expires_at) < new Date()) return NextResponse.json({ error: "Code expired" }, { status: 400 });
    if (data.max_uses !== null && data.used_count >= data.max_uses) return NextResponse.json({ error: "Code limit reached" }, { status: 400 });

    return NextResponse.json({ discount: data.discount_percent, code: data.code });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
