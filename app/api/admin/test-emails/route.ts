import { NextResponse } from "next/server";
import { sendChallengeCertificateEmail } from "@/lib/mailer";

export async function GET() {
  const date = new Date().toLocaleDateString("fr-FR");
  await sendChallengeCertificateEmail("vincentmeipro@gmail.com", "Vincent", "Mei", "$100,000", date);
  return NextResponse.json({ ok: true, sent: "phase2" });
}
