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

function getRate(totalSales: number): number {
  if (totalSales >= 30) return 20;
  if (totalSales >= 11) return 15;
  return 10;
}

function getTier(rate: number): string {
  if (rate >= 20) return "Elite";
  if (rate >= 15) return "Partenaire";
  return "Débutant";
}

export async function GET(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user, admin } = auth;

  // Get or create affiliate record
  let { data: affiliate } = await admin.from("affiliates").select("*").eq("user_id", user.id).single();

  if (!affiliate) {
    // Generate unique code
    let code = "";
    let attempt = 0;
    while (attempt < 10) {
      const candidate = generateCode();
      const { data: existing } = await admin.from("affiliates").select("id").eq("code", candidate).single();
      if (!existing) { code = candidate; break; }
      attempt++;
    }
    const { data: created } = await admin.from("affiliates").insert({
      user_id: user.id,
      code,
      commission_rate: 10,
      total_earned: 0,
      total_paid: 0,
    }).select().single();
    affiliate = created;
  }

  // Get referrals for stats
  const { data: referrals } = await admin
    .from("affiliate_referrals")
    .select("commission_amount, status")
    .eq("affiliate_user_id", user.id);

  const total_conversions = referrals?.length || 0;
  const total_commission = referrals?.reduce((s, r) => s + (r.commission_amount || 0), 0) || 0;
  const pending_commission = referrals?.filter(r => r.status === "pending").reduce((s, r) => s + (r.commission_amount || 0), 0) || 0;
  const paid_commission = referrals?.filter(r => r.status === "paid").reduce((s, r) => s + (r.commission_amount || 0), 0) || 0;

  // Update rate if needed
  const newRate = getRate(total_conversions);
  if (affiliate && newRate !== affiliate.commission_rate) {
    await admin.from("affiliates").update({ commission_rate: newRate }).eq("user_id", user.id);
  }

  const currentRate = newRate;

  return NextResponse.json({
    code: affiliate?.code,
    link: `https://www.traders-rewards.eu/?ref=${affiliate?.code}`,
    total_conversions,
    total_commission,
    pending_commission,
    paid_commission,
    current_rate: currentRate / 100,
    current_tier: getTier(currentRate),
  });
}
