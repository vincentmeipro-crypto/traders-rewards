import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/mailer";

export async function GET() {
  try {
    await sendWelcomeEmail(
      "vincentmeipro@gmail.com",
      "$10,000",
      "2step",
      { login: 900909612577, password: "TestPassword1!", server: "84.201.6.142:443" }
    );
    return NextResponse.json({ ok: true, message: "Email sent successfully" });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
