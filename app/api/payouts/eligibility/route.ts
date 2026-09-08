import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadRewardAccounts } from "@/lib/reward-eligibility-server";
export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await loadRewardAccounts(db, user.id), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Eligibility unavailable" }, { status: 503 }); }
}
