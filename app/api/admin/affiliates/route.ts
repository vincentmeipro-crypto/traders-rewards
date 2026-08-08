import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/admin-auth";
import {
  normalizeCode,
  validateCode,
  validateName,
  validateDiscount,
  validateMaxUses,
  parseDate,
} from "@/lib/promo-admin";

// GET: all affiliates with their referrals
export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const { data: affiliates, error } = await admin
    .from("affiliates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch referrals, profiles, and auth users in parallel
  const [{ data: referrals }, { data: profiles }, { data: { users } }] = await Promise.all([
    admin.from("affiliate_referrals").select("*").order("created_at", { ascending: false }),
    admin.from("profiles").select("user_id, first_name, last_name"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
  const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));

  // Attach referrals + user info to each affiliate
  const result = (affiliates || []).map(a => ({
    ...a,
    first_name: profileMap[a.user_id]?.first_name || "",
    last_name: profileMap[a.user_id]?.last_name || "",
    email: userMap[a.user_id]?.email || "",
    referrals: (referrals || []).filter(r => r.affiliate_user_id === a.user_id),
  }));

  return NextResponse.json(result);
}

// POST: update commission rate OR create promo code for affiliate
export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const body = await req.json();

  // ── create_promo ──────────────────────────────────────────────────────────
  //
  // Utilise les mêmes helpers de validation que /api/admin/promo-codes (POST).
  // Defaults sûrs pour les promos affilié :
  //   targeting_mode      = 'all'   (toujours)
  //   single_use_per_user = false   (toujours)
  //   starts_at           = null    (toujours)
  //
  // Pas de product targeting pour les promos affilié.
  // Code UNIQUE vérifié par la contrainte DB (→ 409 propre si doublon).

  if (body.action === "create_promo") {
    const { code, discount_percent, max_uses, expires_at, affiliate_user_id, name } = body;

    // Validation code
    const codeRaw = normalizeCode(code);
    if (!codeRaw) return NextResponse.json({ error: "code requis" }, { status: 400 });
    const codeErr = validateCode(codeRaw);
    if (codeErr) return NextResponse.json({ error: codeErr }, { status: 400 });

    // Validation name (optionnel)
    const nameRes = validateName(name);
    if (nameRes.error) return NextResponse.json({ error: nameRes.error }, { status: 400 });

    // Validation discount
    const discountRes = validateDiscount(discount_percent);
    if (discountRes.error) return NextResponse.json({ error: discountRes.error }, { status: 400 });

    // Validation max_uses
    const maxUsesRes = validateMaxUses(max_uses);
    if (maxUsesRes.error) return NextResponse.json({ error: maxUsesRes.error }, { status: 400 });

    // Validation expires_at
    const expiresRes = parseDate(expires_at);
    if (expiresRes.error) return NextResponse.json({ error: `expires_at: ${expiresRes.error}` }, { status: 400 });

    const { data, error } = await admin.from("promo_codes").insert({
      code:                codeRaw,
      name:                nameRes.value,
      discount_percent:    discountRes.value,
      max_uses:            maxUsesRes.value,
      expires_at:          expiresRes.value,
      starts_at:           null,   // toujours null pour les promos affilié
      active:              true,
      targeting_mode:      "all",  // toujours 'all' pour les promos affilié
      single_use_per_user: false,  // toujours false pour les promos affilié
      affiliate_user_id:   affiliate_user_id || null,
    }).select().single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Code déjà existant" }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    // product_ids toujours [] pour les promos affilié (targeting_mode='all')
    return NextResponse.json({ ...data, product_ids: [] });
  }

  // Update commission rate
  if (body.action === "set_rate") {
    const { affiliate_id, commission_rate } = body;
    const { data, error } = await admin
      .from("affiliates")
      .update({ commission_rate: Number(commission_rate) })
      .eq("id", affiliate_id)
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Mark referral commission as paid
  if (body.action === "pay_commission") {
    const { referral_id } = body;
    const { data, error } = await admin
      .from("affiliate_referrals")
      .update({ status: "paid" })
      .eq("id", referral_id)
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
