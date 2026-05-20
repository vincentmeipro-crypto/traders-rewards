import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return { user, admin };
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, admin } = auth;
  const { data } = await admin.from("profiles").select("*").eq("user_id", user.id).single();
  return NextResponse.json(data || {});
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, admin } = auth;

    const { first_name, last_name, phone, email, address, city, postal_code, country, birth_date } = await req.json();
    if (!first_name || !last_name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data, error: upsertError } = await admin
      .from("profiles")
      .upsert({ user_id: user.id, first_name, last_name, phone: phone || "", email: email || "", address: address || null, city: city || null, postal_code: postal_code || null, country: country || null, birth_date: birth_date || null, updated_at: new Date().toISOString() })
      .select().single();

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
