import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { loadMobileDashboard, MobileAccountNotFound } from "@/lib/mobile-dashboard";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "Vary": "Authorization" };

/** Read-only companion API. The existing site-access gate still applies. */
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "Service unavailable" }, { status: 503, headers });
  try {
    // User-scoped client: RLS remains enabled, no service-role key.
    const db = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    const snapshot = await loadMobileDashboard(db, user, request.nextUrl.searchParams.get("account"));
    return NextResponse.json(snapshot, { headers });
  } catch (error) {
    if (error instanceof MobileAccountNotFound) return NextResponse.json({ error: "Account not found" }, { status: 404, headers });
    return NextResponse.json({ error: "Dashboard unavailable" }, { status: 503, headers });
  }
}
