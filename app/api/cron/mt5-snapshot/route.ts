import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMT5Account, getMT5Positions } from "@/lib/mt5";

// Called by Vercel Cron every 5 minutes
// Snapshots balance + equity + open positions for every active MT5 account
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch all active challenges with a MT5 login
  const { data: challenges, error } = await admin
    .from("challenges")
    .select("id, mt5_login, user_id, account_size, model, status")
    .not("mt5_login", "is", null)
    .in("status", ["active", "funded", "phase2"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!challenges?.length) return NextResponse.json({ synced: 0 });

  let synced = 0;
  let errors = 0;

  for (const challenge of challenges) {
    try {
      const [account, positions] = await Promise.all([
        getMT5Account(challenge.mt5_login),
        getMT5Positions(challenge.mt5_login).catch(() => []),
      ]);

      await admin.from("challenges").update({
        equity:              account.equity ?? null,
        open_positions:      positions,
        positions_synced_at: new Date().toISOString(),
      }).eq("id", challenge.id);

      // Insert into history table
      await admin.from("mt5_snapshots").insert({
        challenge_id:    challenge.id,
        mt5_login:       challenge.mt5_login,
        balance:         account.balance ?? null,
        equity:          account.equity  ?? null,
        margin:          account.margin  ?? null,
        free_margin:     account.margin_free ?? null,
        profit:          account.profit  ?? null,
        positions_count: positions.length,
        positions:       positions,
      });

      synced++;
    } catch (e) {
      console.error(`MT5 snapshot failed for login ${challenge.mt5_login}:`, e);
      errors++;
    }
  }

  return NextResponse.json({ synced, errors, total: challenges.length });
}
