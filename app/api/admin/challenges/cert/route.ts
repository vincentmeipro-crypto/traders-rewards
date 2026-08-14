import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendChallengeCertificateEmail, sendPhase1CertificateEmail } from "@/lib/mailer";
import { checkAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const check = await checkAdmin(req);
  if (!check.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createAdminClient();
  const { data: c } = await admin.from("challenges").select("*").eq("id", id).single();
  if (!c) return NextResponse.json({ error: "Challenge introuvable" }, { status: 404 });

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userEmail = users.find(u => u.id === c.user_id)?.email || "";
  if (!userEmail) return NextResponse.json({ error: "Email introuvable" }, { status: 404 });

  const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", c.user_id).single();
  const firstName = profile?.first_name || "";
  const lastName  = profile?.last_name  || "";

  const certDate = new Date().toLocaleDateString("fr-FR");
  const challengeCtx = { userId: c.user_id as string, challengeId: id };

  const modelStr = ((c.model as string) ?? "").toLowerCase().replace(/[\s-]/g, "");
  const is1StepModel = modelStr.includes("1step") || modelStr.includes("instant");

  if (is1StepModel || c.phase === "phase2" || c.phase === "funded") {
    // 1STEP ou challenge complet → certificat de challenge
    await sendChallengeCertificateEmail(userEmail, firstName, lastName, c.account_size, certDate, challengeCtx);
  } else {
    // 2STEP phase1 → certificat de phase 1
    await sendPhase1CertificateEmail(userEmail, firstName, lastName, c.account_size, certDate, challengeCtx);
  }

  return NextResponse.json({ ok: true, sentTo: userEmail });
}
