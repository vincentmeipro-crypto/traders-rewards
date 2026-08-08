import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ── GET /api/admin/promo-codes/[id]/usages ────────────────────────────────────
//
// Historique paginé des usages pour une promo donnée.
//
// Query params :
//   page  (défaut 1)
//   limit (défaut 25, max 100)
//
// Joins sans N+1 :
//   1. Fetch usages paginés
//   2. Batch fetch profiles   (user_id IN [...])
//   3. Batch fetch challenges  (id IN [...])
//   4. Batch fetch challenge_products (id IN [...] des product_id de challenges)
//
// Données sensibles : payment_reference exposé (usage interne admin uniquement).
// profiles.email utilisé directement — pas de appel auth.admin.listUsers().

const MAX_LIMIT     = 100;
const DEFAULT_LIMIT = 25;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin  = createAdminClient();

  // Vérifier que la promo existe
  const { data: promo, error: promoErr } = await admin
    .from("promo_codes")
    .select("id,code")
    .eq("id", id)
    .single();

  if (promoErr || !promo)
    return NextResponse.json({ error: "Promo introuvable" }, { status: 404 });

  const url = new URL(req.url);

  const pageParam  = parseInt(url.searchParams.get("page")  ?? "1",  10);
  const limitParam = parseInt(url.searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);

  const page  = isNaN(pageParam)  || pageParam  < 1 ? 1          : pageParam;
  const limit = isNaN(limitParam) || limitParam < 1 ? DEFAULT_LIMIT
    : Math.min(limitParam, MAX_LIMIT);
  const offset = (page - 1) * limit;

  // ── Count total ──────────────────────────────────────────────────────
  const { count: total, error: countErr } = await admin
    .from("promo_code_usages")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", id);

  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

  // ── Fetch page ───────────────────────────────────────────────────────
  const { data: usages, error: usagesErr } = await admin
    .from("promo_code_usages")
    .select("id,used_at,provider,discount_applied,user_id,challenge_id,payment_reference")
    .eq("promo_code_id", id)
    .order("used_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (usagesErr) return NextResponse.json({ error: usagesErr.message }, { status: 500 });

  const rows = usages ?? [];

  if (rows.length === 0) {
    return NextResponse.json({
      items:      [],
      page,
      limit,
      total:      total ?? 0,
      totalPages: Math.ceil((total ?? 0) / limit),
    });
  }

  // ── Batch joins — pas de N+1 ─────────────────────────────────────────
  const userIds      = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const challengeIds = [...new Set(rows.map((r) => r.challenge_id).filter(Boolean))] as string[];

  const [profilesRes, challengesRes] = await Promise.all([
    userIds.length > 0
      ? admin.from("profiles").select("user_id,first_name,last_name,email").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    challengeIds.length > 0
      ? admin.from("challenges").select("id,amount_paid,product_id").in("id", challengeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  type Profile  = { user_id: string; first_name: string | null; last_name: string | null; email: string | null };
  type Chall    = { id: string; amount_paid: number | null; product_id: string | null };
  type Product  = { id: string; name: string };

  const profileMap  = Object.fromEntries(
    ((profilesRes.data ?? []) as Profile[]).map((p) => [p.user_id, p])
  ) as Record<string, Profile>;

  const challengeMap = Object.fromEntries(
    ((challengesRes.data ?? []) as Chall[]).map((c) => [c.id, c])
  ) as Record<string, Chall>;

  // Batch fetch product names
  const productIds = [
    ...new Set(
      ((challengesRes.data ?? []) as Chall[])
        .map((c) => c.product_id)
        .filter((pid): pid is string => Boolean(pid))
    ),
  ];

  const productsRes = productIds.length > 0
    ? await admin.from("challenge_products").select("id,name").in("id", productIds)
    : { data: [], error: null };

  const productMap = Object.fromEntries(
    ((productsRes.data ?? []) as Product[]).map((p) => [p.id, p.name])
  ) as Record<string, string>;

  // ── Assembler les items ──────────────────────────────────────────────
  const items = rows.map((r) => {
    const profile   = profileMap[r.user_id as string]      ?? null;
    const challenge = challengeMap[r.challenge_id as string] ?? null;
    const productId = challenge?.product_id ?? null;

    const firstName  = profile?.first_name ?? "";
    const lastName   = profile?.last_name  ?? "";
    const traderName = (firstName + " " + lastName).trim() || null;

    return {
      id:                r.id,
      used_at:           r.used_at,
      provider:          r.provider,
      discount_applied:  r.discount_applied,
      user_id:           r.user_id,
      trader_email:      profile?.email ?? null,
      trader_name:       traderName,
      challenge_id:      r.challenge_id,
      product_name:      productId ? (productMap[productId] ?? null) : null,
      amount_paid:       challenge?.amount_paid ?? null,
      payment_reference: r.payment_reference,
    };
  });

  return NextResponse.json({
    items,
    page,
    limit,
    total:      total ?? 0,
    totalPages: Math.ceil((total ?? 0) / limit),
  });
}
