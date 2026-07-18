import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = "vincentmeipro@gmail.com";

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user || user.email !== ADMIN_EMAIL) return null;
  return { admin, token };
}

// GET: all affiliates with their referrals
export async function GET(req: NextRequest) {
  const auth = await checkAdmin(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { admin } = auth;

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
  const auth = await checkAdmin(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { admin } = auth;

  const body = await req.json();

  // Create promo code for affiliate
  if (body.action === "create_promo") {
    const { code, discount_percent, max_uses, expires_at, affiliate_user_id } = body;
    if (!code || !discount_percent) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const { data, error } = await admin.from("promo_codes").insert({
      code: code.toUpperCase().trim(),
      discount_percent: Number(discount_percent),
      max_uses: max_uses ? Number(max_uses) : null,
      expires_at: expires_at || null,
      active: true,
      affiliate_user_id: affiliate_user_id || null,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
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
