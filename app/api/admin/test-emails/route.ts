import { NextResponse } from "next/server";
import { sendPhase1CertificateEmail, sendChallengeCertificateEmail, sendRewardCertificateEmail } from "@/lib/mailer";

export async function GET() {
  const to = "vincentmeipro@gmail.com";
  const date = new Date().toLocaleDateString("fr-FR");

  await sendPhase1CertificateEmail(to, "Vincent", "Mei", "$100,000", date);
  await sendChallengeCertificateEmail(to, "Vincent", "Mei", "$100,000", date);
  await sendRewardCertificateEmail(to, "Vincent", "Mei", "$100,000", 5000, "2step", date);

  return NextResponse.json({ ok: true, sent: ["phase1", "phase2", "recompense"] });
}
