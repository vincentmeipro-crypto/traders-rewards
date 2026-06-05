import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MT5_URL    = process.env.MT5_API_URL!;
const MT5_SECRET = process.env.MT5_API_SECRET!;
const H = { "Content-Type": "application/json", "x-api-key": MT5_SECRET, "bypass-tunnel-reminder": "true" };

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  return user?.email === "vincentmeipro@gmail.com";
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const login = Number(req.nextUrl.searchParams.get("login"));
  if (!login) return NextResponse.json({ error: "?login=XXXXX requis" }, { status: 400 });

  const balBefore = await fetch(`${MT5_URL}/accounts/${login}`, { headers: H })
    .then(r => r.json()).then(d => d.balance).catch(() => null);

  const tests = [
    { label: "add-balance / amount:-1 / comment",            url: `${MT5_URL}/accounts/add-balance`,        body: { login, amount: -1, comment: "test" } },
    { label: "add-balance / amount:1 / deal_type:out",       url: `${MT5_URL}/accounts/add-balance`,        body: { login, amount: 1, deal_type: "out" } },
    { label: "add-balance / amount:1 / operation:withdraw",  url: `${MT5_URL}/accounts/add-balance`,        body: { login, amount: 1, operation: "withdraw" } },
    { label: "add-balance / amount:1 / type:withdrawal",     url: `${MT5_URL}/accounts/add-balance`,        body: { login, amount: 1, type: "withdrawal" } },
    { label: "balance     / amount:-1",                      url: `${MT5_URL}/accounts/balance`,            body: { login, amount: -1, comment: "test" } },
    { label: "debit       / amount:1",                       url: `${MT5_URL}/accounts/debit`,              body: { login, amount: 1, comment: "test" } },
    { label: "withdraw    / amount:1",                       url: `${MT5_URL}/accounts/withdraw`,           body: { login, amount: 1, comment: "test" } },
  ];

  const results: Record<string, unknown> = { balance_before: balBefore };

  for (const t of tests) {
    try {
      const res = await fetch(t.url, { method: "POST", headers: H, body: JSON.stringify(t.body) });
      const text = await res.text();
      const balAfter = await fetch(`${MT5_URL}/accounts/${login}`, { headers: H })
        .then(r => r.json()).then(d => d.balance).catch(() => null);
      results[t.label] = { status: res.status, response: text.slice(0, 200), balance_after: balAfter, diff: balAfter != null && balBefore != null ? +(balAfter - balBefore).toFixed(2) : null };
    } catch (e) {
      results[t.label] = { error: String(e) };
    }
  }

  return NextResponse.json(results, { headers: { "Content-Type": "application/json" } });
}
