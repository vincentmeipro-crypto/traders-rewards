import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { user_id } = await req.json();
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    let country = "unknown";
    let is_vpn = false;
    try {
      const ipRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,proxy,hosting`, {
        signal: AbortSignal.timeout(3000),
      });
      if (ipRes.ok) {
        const d = await ipRes.json();
        country = d.country || "unknown";
        is_vpn = d.hosting === true || d.proxy === true;
      }
    } catch { /* ignore */ }

    const admin = createAdminClient();
    await admin.from("profiles").update({
      registration_ip: ip,
      registration_country: country,
      registration_is_vpn: is_vpn,
    }).eq("id", user_id);

    return NextResponse.json({ ok: true, ip, country, is_vpn });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
