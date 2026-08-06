import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/products/[id]/rules — lister toutes les règles (actives + désactivées)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("challenge_product_rules")
    .select("*")
    .eq("product_id", id)
    .order("rule_key", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/admin/products/[id]/rules — ajouter une règle
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { rule_key, rule_value, description, enabled } = body;

  if (!rule_key || rule_value === undefined)
    return NextResponse.json(
      { error: "Champs requis : rule_key, rule_value" },
      { status: 400 }
    );

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("challenge_product_rules")
    .insert({
      product_id:  id,
      rule_key,
      rule_value,
      description: description ?? null,
      enabled:     enabled ?? true,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

// PUT /api/admin/products/[id]/rules — mettre à jour une règle (par rule_key dans le body)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { rule_key, ...updates } = body;

  if (!rule_key)
    return NextResponse.json({ error: "rule_key requis" }, { status: 400 });

  const allowed = ["rule_value", "description", "enabled"];
  const sanitized: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) sanitized[key] = updates[key];
  }

  if (Object.keys(sanitized).length === 0)
    return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 });

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("challenge_product_rules")
    .update(sanitized)
    .eq("product_id", id)
    .eq("rule_key", rule_key)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// DELETE /api/admin/products/[id]/rules — supprimer une règle (par rule_key dans le body)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { rule_key } = body;

  if (!rule_key)
    return NextResponse.json({ error: "rule_key requis" }, { status: 400 });

  const admin = createAdminClient();

  const { error } = await admin
    .from("challenge_product_rules")
    .delete()
    .eq("product_id", id)
    .eq("rule_key", rule_key);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
