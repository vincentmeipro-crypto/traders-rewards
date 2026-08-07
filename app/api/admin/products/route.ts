import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/admin/products — liste tous les produits (actifs + inactifs) avec phases + règles
export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: products, error: prodError } = await admin
    .from("challenge_products")
    .select("*")
    .order("display_order", { ascending: true });

  if (prodError)
    return NextResponse.json({ error: prodError.message }, { status: 500 });

  if (!products || products.length === 0)
    return NextResponse.json([]);

  const productIds = products.map((p) => p.id);

  const [phasesResult, rulesResult, countsResult] = await Promise.all([
    admin
      .from("challenge_product_phases")
      .select("*")
      .in("product_id", productIds)
      .order("phase_order", { ascending: true }),
    admin
      .from("challenge_product_rules")
      .select("*")
      .in("product_id", productIds)
      .order("rule_key", { ascending: true }),
    // Nombre de challenges par produit (product_id non-null uniquement)
    admin
      .from("challenges")
      .select("product_id, status")
      .not("product_id", "is", null),
  ]);

  if (phasesResult.error)
    return NextResponse.json({ error: phasesResult.error.message }, { status: 500 });
  if (rulesResult.error)
    return NextResponse.json({ error: rulesResult.error.message }, { status: 500 });

  const allPhases = phasesResult.data ?? [];
  const allRules  = rulesResult.data  ?? [];

  // Agréger les counts par product_id
  type CountEntry = { active: number; funded: number; total: number };
  const countMap: Record<string, CountEntry> = {};
  for (const c of countsResult.data ?? []) {
    if (!c.product_id) continue;
    if (!countMap[c.product_id]) countMap[c.product_id] = { active: 0, funded: 0, total: 0 };
    countMap[c.product_id].total++;
    if (c.status === "active")  countMap[c.product_id].active++;
    if (c.status === "funded")  countMap[c.product_id].funded++;
  }

  const result = products.map((product) => ({
    ...product,
    phases:          allPhases.filter((ph) => ph.product_id === product.id),
    rules:           allRules.filter((r)  => r.product_id  === product.id),
    challenge_count: countMap[product.id] ?? { active: 0, funded: 0, total: 0 },
  }));

  return NextResponse.json(result);
}

// POST /api/admin/products — créer un nouveau produit
export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    slug, name, description, model, account_size, balance_usd,
    price_eur_cents, price_crypto_cents,
    display_order, max_cumul_usd, leverage,
    mt5_group_challenge, mt5_group_funded,
  } = body;

  // Validation minimale
  if (!slug || !name || !model || !account_size || !balance_usd || !price_eur_cents)
    return NextResponse.json(
      { error: "Champs requis : slug, name, model, account_size, balance_usd, price_eur_cents" },
      { status: 400 }
    );

  if (!["1step", "2step", "vip"].includes(model))
    return NextResponse.json({ error: "model doit être 1step, 2step ou vip" }, { status: 400 });

  if (price_eur_cents <= 0)
    return NextResponse.json({ error: "price_eur_cents doit être > 0" }, { status: 400 });

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("challenge_products")
    .insert({
      slug,
      name,
      description:         description   || null,
      model,
      account_size,
      balance_usd,
      price_eur_cents,
      price_crypto_cents:  price_crypto_cents ?? null,
      display_order:       display_order  ?? 0,
      max_cumul_usd:       max_cumul_usd  ?? null,
      leverage:            leverage       ?? 100,
      mt5_group_challenge: mt5_group_challenge ?? null,
      mt5_group_funded:    mt5_group_funded    ?? null,
      active:              false,   // Inactif par défaut — activer explicitement
      version:             1,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
