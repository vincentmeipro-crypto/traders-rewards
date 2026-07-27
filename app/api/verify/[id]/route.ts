import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: challenge } = await admin
    .from("challenges")
    .select("id, account_size, model, status, phase, created_at, user_id, amount_paid")
    .eq("id", id)
    .single();

  if (!challenge) return NextResponse.json({ valid: false, error: "Certificat introuvable" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("user_id", challenge.user_id)
    .single();

  const phaseLabel: Record<string, string> = {
    phase1: "Phase 1",
    phase2: "Phase 2",
    funded: "Reward",
  };

  return NextResponse.json({
    valid: true,
    id: challenge.id,
    trader_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Trader",
    account_size: challenge.account_size,
    model: challenge.model,
    phase: phaseLabel[challenge.phase] ?? challenge.phase,
    status: challenge.status,
    issued_at: challenge.created_at,
  });
}
