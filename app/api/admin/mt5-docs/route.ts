import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MT5_URL    = process.env.MT5_API_URL!;
const MT5_SECRET = process.env.MT5_API_SECRET!;
const MT5_HEADERS = { "x-api-key": MT5_SECRET, "bypass-tunnel-reminder": "true" };

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  return user?.email === "vincentmeipro@gmail.com";
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results: Record<string, unknown> = {};

  // Tente de récupérer la doc OpenAPI (FastAPI/Flask)
  for (const path of ["/openapi.json", "/docs", "/routes", "/"]) {
    try {
      const res = await fetch(`${MT5_URL}${path}`, { headers: MT5_HEADERS });
      results[path] = { status: res.status, body: await res.text().then(t => t.slice(0, 500)) };
    } catch (e) {
      results[path] = { error: String(e) };
    }
  }

  return NextResponse.json({ mt5_url: MT5_URL.slice(0, 30) + "...", results });
}
