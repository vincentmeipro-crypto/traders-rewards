import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const challengeId = req.nextUrl.searchParams.get("challenge_id") || "";

  const params = new URLSearchParams({
    client_id: process.env.CTRADER_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/ctrader/callback`,
    response_type: "code",
    scope: "accounts",
    state: `${user.id}:${challengeId}`,
  });

  return NextResponse.redirect(
    `https://connect.ctrader.com/oauth/authorize?${params.toString()}`
  );
}
