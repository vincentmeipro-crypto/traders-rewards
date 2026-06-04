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

  const login = Number(req.nextUrl.searchParams.get("login") || "0");
  if (!login) return NextResponse.json({ error: "Passe ?login=XXXXXX dans l'URL" }, { status: 400 });

  // Balance avant
  const before = await fetch(`${MT5_URL}/accounts/${login}`, { headers: MT5_HEADERS }).then(r => r.json()).catch(() => null);
  const balanceBefore = before?.balance ?? 0;

  const tests = [
    { label: "deal_type=out", body: { login, amount: 1, deal_type: "out" } },
    { label: "deal_type=BALANCE_OUT", body: { login, amount: 1, deal_type: "BALANCE_OUT" } },
    { label: "operation=withdraw", body: { login, amount: 1, operation: "withdraw" } },
    { label: "action=withdraw", body: { login, amount: 1, action: "withdraw" } },
    { label: "type=out", body: { login, amount: 1, type: "out" } },
  ];

  const results: Record<string, unknown> = { balance_before: balanceBefore };

  for (const test of tests) {
    try {
      const res = await fetch(`${MT5_URL}/accounts/add-balance`, {
        method: "POST", headers: { ...MT5_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify(test.body),
      });
      const text = await res.text();
      const balanceAfter = await fetch(`${MT5_URL}/accounts/${login}`, { headers: MT5_HEADERS }).then(r => r.json()).then(d => d.balance).catch(() => null);
      results[test.label] = { status: res.status, response: text, balance_after: balanceAfter, diff: balanceAfter ? balanceAfter - balanceBefore : null };
    } catch (e) {
      results[test.label] = { error: String(e) };
    }
  }

  return NextResponse.json(results);
}
