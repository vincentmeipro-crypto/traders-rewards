import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/products/[id]/phases — lister les phases d'un produit
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("challenge_product_phases")
    .select("*")
    .eq("product_id", id)
    .order("phase_order", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}

// POST /api/admin/products/[id]/phases — ajouter une phase
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const {
    phase_order, phase_label, phase_type,
    profit_target, daily_drawdown, total_drawdown,
    min_trading_days, max_trading_days, profit_split, mt5_group,
  } = body;

  if (!phase_order || !phase_label || !phase_type)
    return NextResponse.json(
      { error: "Champs requis : phase_order, phase_label, phase_type" },
      { status: 400 }
    );

  if (!["challenge", "funded"].includes(phase_type))
    return NextResponse.json(
      { error: "phase_type doit être 'challenge' ou 'funded'" },
      { status: 400 }
    );

  if (daily_drawdown === undefined || total_drawdown === undefined)
    return NextResponse.json(
      { error: "Champs requis : daily_drawdown, total_drawdown" },
      { status: 400 }
    );

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("challenge_product_phases")
    .insert({
      product_id:       id,
      phase_order,
      phase_label,
      phase_type,
      profit_target:    profit_target    ?? null,
      daily_drawdown,
      total_drawdown,
      min_trading_days: min_trading_days ?? 5,
      max_trading_days: max_trading_days ?? null,
      profit_split:     profit_split     ?? null,
      mt5_group:        mt5_group        ?? null,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}

// PUT /api/admin/products/[id]/phases — mettre à jour une phase (par phase_order dans le body)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { phase_order, ...updates } = body;

  if (!phase_order)
    return NextResponse.json({ error: "phase_order requis" }, { status: 400 });

  const allowed = [
    "phase_label", "phase_type", "profit_target",
    "daily_drawdown", "total_drawdown", "min_trading_days",
    "max_trading_days", "profit_split", "mt5_group",
  ];

  const sanitized: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in updates) sanitized[key] = updates[key];
  }

  if (Object.keys(sanitized).length === 0)
    return NextResponse.json({ error: "Aucun champ modifiable fourni" }, { status: 400 });

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("challenge_product_phases")
    .update(sanitized)
    .eq("product_id", id)
    .eq("phase_order", phase_order)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// DELETE /api/admin/products/[id]/phases — supprimer une phase (par phase_order dans le body)
// Attention : seules les phases de produits INACTIFS peuvent être supprimées.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { phase_order } = body;

  if (!phase_order)
    return NextResponse.json({ error: "phase_order requis" }, { status: 400 });

  const admin = createAdminClient();

  // Vérifier que le produit est inactif avant de toucher ses phases
  const { data: product } = await admin
    .from("challenge_products")
    .select("active")
    .eq("id", id)
    .single();

  if (product?.active)
    return NextResponse.json(
      { error: "Désactiver le produit avant de modifier ses phases." },
      { status: 409 }
    );

  const { error } = await admin
    .from("challenge_product_phases")
    .delete()
    .eq("product_id", id)
    .eq("phase_order", phase_order);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
