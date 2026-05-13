import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") || "";
  const [userId, challengeId] = state.split(":");

  if (!code || !userId) {
    return NextResponse.redirect(new URL("/dashboard?ctrader=error", req.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://connect.ctrader.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/ctrader/callback`,
      client_id: process.env.CTRADER_CLIENT_ID!,
      client_secret: process.env.CTRADER_CLIENT_SECRET!,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/dashboard?ctrader=error", req.url));
  }

  const tokens = await tokenRes.json();

  // Get cTrader accounts list
  const accountsRes = await fetch("https://api.ctrader.com/connect/oauth/accounts", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const accountsData = await accountsRes.json();
  const account = accountsData.data?.[0]; // First account

  const admin = createAdminClient();

  // Update challenge with cTrader tokens + account info
  const updateData: Record<string, unknown> = {
    ctrader_access_token: tokens.access_token,
    ctrader_refresh_token: tokens.refresh_token,
    ctrader_token_expiry: Date.now() + (tokens.expires_in * 1000),
    last_synced_at: new Date().toISOString(),
  };

  if (account) {
    updateData.ctrader_account_id = String(account.accountId || account.ctidTraderAccountId);
    if (account.balance !== undefined) {
      updateData.balance = account.balance / 100; // cTrader uses cents
    }
  }

  if (challengeId) {
    await admin.from("challenges").update(updateData).eq("id", challengeId).eq("user_id", userId);
  }

  return NextResponse.redirect(new URL("/dashboard?ctrader=connected", req.url));
}
