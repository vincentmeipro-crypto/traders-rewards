import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MT5_URL    = process.env.MT5_API_URL!;
const MT5_SECRET = process.env.MT5_API_SECRET!;
const MT5_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": MT5_SECRET,
  "bypass-tunnel-reminder": "true",
};

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Récupérer tous les challenges actifs avec leur mt5_login
  const { data: challenges } = await admin
    .from("challenges")
    .select("id, user_email, mt5_login, account_size, model, status")
    .not("mt5_login", "is", null)
    .in("status", ["active", "funded", "passed"]);

  if (!challenges?.length) return NextResponse.json({ sessions: [] });

  // Récupérer les IPs MT5 pour chaque compte (en parallèle, max 10 à la fois)
  const BATCH = 10;
  const sessions: { user_email: string; mt5_login: number; account_size: string; model: string; status: string; last_ip: string | null; last_login: string | null }[] = [];

  for (let i = 0; i < challenges.length; i += BATCH) {
    const batch = challenges.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (c) => {
        try {
          const res = await fetch(`${MT5_URL}/accounts/${c.mt5_login}/last-ip`, {
            headers: MT5_HEADERS,
            signal: AbortSignal.timeout(5000),
          });
          if (res.ok) {
            const data = await res.json();
            return { ...c, last_ip: data.last_ip || null, last_login: data.last_login || null };
          }
        } catch { /* ignore */ }
        return { ...c, last_ip: null, last_login: null };
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) sessions.push(r.value);
    }
  }

  return NextResponse.json({ sessions });
}
