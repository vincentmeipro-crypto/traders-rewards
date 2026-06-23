import { NextResponse } from "next/server";
import { sendPhase1CertificateEmail, sendChallengeCertificateEmail, sendRewardCertificateEmail } from "@/lib/mailer";

export async function GET() {
  const date = new Date().toLocaleDateString("fr-FR");
  await sendPhase1CertificateEmail("vincentmeipro@gmail.com", "Vincent", "Mei", "$100,000", date);
  await sendChallengeCertificateEmail("vincentmeipro@gmail.com", "Vincent", "Mei", "$100,000", date);
  await sendRewardCertificateEmail("vincentmeipro@gmail.com", "Vincent", "Mei", "$100,000", 5000, "2step", date);
  return NextResponse.json({ ok: true, sent: ["phase1", "phase2", "recompense"] });
}
