import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CertificateSummary = {
  public_token: string;
  certificate_type: "phase1" | "phase2" | "reward";
  challenge_id: string | null;
  payout_id: string | null;
  issued_at: string;
};

function missingCertificateType(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42703" || /certificate_type/i.test(error?.message || "");
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: challenges, error: challengeError } = await admin
    .from("challenges")
    .select("id")
    .eq("user_id", user.id);

  if (challengeError) return NextResponse.json({ error: "Unable to load certificates" }, { status: 500 });
  const challengeIds = (challenges ?? []).map(challenge => challenge.id);
  if (challengeIds.length === 0) return NextResponse.json([]);

  const { data, error } = await admin
    .from("reward_certificates")
    .select("public_token, certificate_type, challenge_id, payout_id, issued_at")
    .in("challenge_id", challengeIds)
    .is("revoked_at", null)
    .order("issued_at", { ascending: false });

  // Pendant un déploiement progressif, les anciens Rewards restent disponibles.
  if (error && missingCertificateType(error)) {
    const fallback = await admin
      .from("reward_certificates")
      .select("public_token, challenge_id, payout_id, issued_at")
      .in("challenge_id", challengeIds)
      .is("revoked_at", null)
      .order("issued_at", { ascending: false });
    if (fallback.error) return NextResponse.json([]);
    const legacy = (fallback.data ?? []).map(cert => ({ ...cert, certificate_type: "reward" as const }));
    return NextResponse.json(legacy);
  }

  if (error) return NextResponse.json([]);
  return NextResponse.json((data ?? []) as unknown as CertificateSummary[]);
}
