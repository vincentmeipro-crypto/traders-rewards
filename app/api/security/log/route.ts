import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { user_id, user_email, fingerprint, user_agent } = await req.json();

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // VPN / proxy check via ip-api.com
    let country = "unknown";
    let is_vpn = false;
    let is_proxy = false;
    try {
      const ipRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,proxy,hosting`, { signal: AbortSignal.timeout(3000) });
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        country = ipData.country || "unknown";
        is_vpn = ipData.hosting === true;
        is_proxy = ipData.proxy === true;
      }
    } catch { /* ignore timeout */ }

    const admin = createAdminClient();
    await admin.from("login_events").insert({
      user_id,
      user_email,
      ip,
      country,
      is_vpn: is_vpn || is_proxy,
      fingerprint,
      user_agent,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
