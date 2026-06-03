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

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, admin } = auth;

  // Get or generate affiliate code
  const { data: profile } = await admin.from("profiles").select("affiliate_code").eq("user_id", user.id).single();

  let code = profile?.affiliate_code as string | undefined;
  if (!code) {
    // Generate unique code
    let attempt = 0;
    while (attempt < 10) {
      const candidate = generateCode();
      const { data: existing } = await admin.from("profiles").select("user_id").eq("affiliate_code", candidate).single();
      if (!existing) { code = candidate; break; }
      attempt++;
    }
    if (code) {
      await admin.from("profiles").update({ affiliate_code: code }).eq("user_id", user.id);
    }
  }

  // Get conversions stats
  const { data: conversions } = await admin
    .from("affiliate_conversions")
    .select("commission_amount, status")
    .eq("affiliate_user_id", user.id);

  const total_conversions = conversions?.length || 0;
  const total_commission = conversions?.reduce((s, c) => s + (c.commission_amount || 0), 0) || 0;
  const pending_commission = conversions?.filter(c => c.status === "pending").reduce((s, c) => s + (c.commission_amount || 0), 0) || 0;
  const paid_commission = conversions?.filter(c => c.status === "paid").reduce((s, c) => s + (c.commission_amount || 0), 0) || 0;

  let current_rate = 0.10;
  let current_tier = "Débutant";
  if (total_conversions >= 30) { current_rate = 0.20; current_tier = "Elite"; }
  else if (total_conversions >= 11) { current_rate = 0.15; current_tier = "Partenaire"; }

  return NextResponse.json({
    code,
    link: `https://www.elysium-rewards.com/?ref=${code}`,
    total_conversions,
    total_commission,
    pending_commission,
    paid_commission,
    current_rate,
    current_tier,
  });
}
