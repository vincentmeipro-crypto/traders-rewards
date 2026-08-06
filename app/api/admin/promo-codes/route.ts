import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";



export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("promo_codes").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { code, discount_percent, max_uses, expires_at } = await req.json();
  if (!code || !discount_percent) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const admin = createAdminClient();
  const { data, error } = await admin.from("promo_codes").insert({
    code: code.toUpperCase().trim(),
    discount_percent: Number(discount_percent),
    max_uses: max_uses ? Number(max_uses) : null,
    expires_at: expires_at || null,
    active: true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...updates } = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin.from("promo_codes").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("promo_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
