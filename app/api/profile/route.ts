import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { first_name, last_name, phone, email, address, city, postal_code, country } = await req.json();
    if (!first_name || !last_name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data, error: upsertError } = await admin
      .from("profiles")
      .upsert({ user_id: user.id, first_name, last_name, phone: phone || "", email: email || "", address: address || null, city: city || null, postal_code: postal_code || null, country: country || null, updated_at: new Date().toISOString() })
      .select().single();

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
