import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/products/[id] — détail d'un produit avec ses phases et règles
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: product, error: prodError } = await admin
    .from("challenge_products")
    .select("*")
    .eq("id", id)
    .single();

  if (prodError || !product)
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  const [phasesResult, rulesResult] = await Promise.all([
    admin
      .from("challenge_product_phases")
      .select("*")
      .eq("product_id", id)
      .order("phase_order", { ascending: true }),
    admin
      .from("challenge_product_rules")
      .select("*")
      .eq("product_id", id)
      .order("rule_key", { ascending: true }),
  ]);

  return NextResponse.json({
    ...product,
    phases: phasesResult.data ?? [],
    rules:  rulesResult.data  ?? [],
  });
}

// PUT /api/admin/products/[id] — mettre à jour un produit
// Seuls les champs envoyés sont modifiés (PATCH sémantique via PUT).
// Les challenges existants avec ce product_id ne sont PAS modifiés.
// Leurs rules_snapshot restent immuables (garanti par trigger DB).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Champs modifiables — exclure id, created_at, version
  const allowed = [
    "name", "description", "model", "account_size", "balance_usd",
    "price_eur_cents", "price_crypto_cents", "currency",
    "active", "display_order", "max_cumul_usd", "leverage",
    "mt5_group_challenge", "mt5_group_funded",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 });

  // Validation model si fourni
  if (updates.model && !["1step", "2step", "vip"].includes(updates.model as string))
    return NextResponse.json({ error: "model doit être 1step, 2step ou vip" }, { status: 400 });

  // Validation prix si fourni
  if (updates.price_eur_cents !== undefined && (updates.price_eur_cents as number) <= 0)
    return NextResponse.json({ error: "price_eur_cents doit être > 0" }, { status: 400 });

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("challenge_products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// DELETE /api/admin/products/[id] — désactivation (soft delete)
// Ne supprime JAMAIS un produit physiquement.
// Bloque si des challenges actifs utilisent ce produit.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  // Vérifier qu'aucun challenge actif n'utilise ce produit
  const { count } = await admin
    .from("challenges")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id)
    .in("status", ["active", "funded"]);

  if ((count ?? 0) > 0)
    return NextResponse.json(
      {
        error: `Impossible de désactiver : ${count} challenge(s) actif(s) lié(s) à ce produit.`,
        count,
      },
      { status: 409 }
    );

  // Soft delete : active = false
  const { data, error } = await admin
    .from("challenge_products")
    .update({ active: false })
    .eq("id", id)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, product: data });
}
