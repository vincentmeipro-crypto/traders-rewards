import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/admin/products/[id]/duplicate
// Duplique un produit avec toutes ses phases et règles.
// Le produit créé est inactif (active=false) et son slug reçoit un suffixe unique.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  // 1. Charger le produit original (actif ou inactif — admin peut dupliquer les deux)
  const { data: original, error: origError } = await admin
    .from("challenge_products")
    .select("*")
    .eq("id", id)
    .single();

  if (origError || !original)
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  // 2. Générer un slug unique : ajouter "-copy" puis "-copy-2", "-copy-3"... si collision
  let newSlug = `${original.slug}-copy`;
  let attempt = 1;
  while (true) {
    const { data: existing } = await admin
      .from("challenge_products")
      .select("id")
      .eq("slug", newSlug)
      .single();
    if (!existing) break;
    attempt++;
    newSlug = `${original.slug}-copy-${attempt}`;
    if (attempt > 20) {
      return NextResponse.json(
        { error: "Impossible de générer un slug unique après 20 tentatives" },
        { status: 500 }
      );
    }
  }

  // 3. Créer le nouveau produit
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at, updated_at, ...productFields } = original;

  const { data: newProduct, error: insertError } = await admin
    .from("challenge_products")
    .insert({
      ...productFields,
      slug:         newSlug,
      name:         `${original.name} (copie)`,
      active:       false,       // Inactif par défaut — activer explicitement
      display_order: original.display_order + 100,
      version:      1,
    })
    .select()
    .single();

  if (insertError || !newProduct)
    return NextResponse.json({ error: insertError?.message ?? "Erreur création" }, { status: 500 });

  // 4. Charger les phases et règles du produit original
  const [phasesResult, rulesResult] = await Promise.all([
    admin
      .from("challenge_product_phases")
      .select("*")
      .eq("product_id", id)
      .order("phase_order", { ascending: true }),
    admin
      .from("challenge_product_rules")
      .select("*")
      .eq("product_id", id),
  ]);

  // 5. Dupliquer les phases
  const phases = phasesResult.data ?? [];
  if (phases.length > 0) {
    const newPhases = phases.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ id: _pid, created_at: _ca, product_id: _prodId, ...phase }) => ({
        ...phase,
        product_id: newProduct.id,
      })
    );
    const { error: phaseError } = await admin
      .from("challenge_product_phases")
      .insert(newPhases);
    if (phaseError)
      return NextResponse.json({ error: `Phases: ${phaseError.message}` }, { status: 500 });
  }

  // 6. Dupliquer les règles
  const rules = rulesResult.data ?? [];
  if (rules.length > 0) {
    const newRules = rules.map(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ({ id: _rid, created_at: _ca, product_id: _prodId, ...rule }) => ({
        ...rule,
        product_id: newProduct.id,
      })
    );
    const { error: ruleError } = await admin
      .from("challenge_product_rules")
      .insert(newRules);
    if (ruleError)
      return NextResponse.json({ error: `Règles: ${ruleError.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok:      true,
    product: newProduct,
    phases:  phases.length,
    rules:   rules.length,
  }, { status: 201 });
}
