import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApologyEmail } from "@/lib/mailer";

const ADMIN_EMAIL = "vincentmeipro@gmail.com";
const MT5_URL     = process.env.MT5_API_URL!;
const MT5_SECRET  = process.env.MT5_API_SECRET!;
const MT5_HEADERS = { "x-api-key": MT5_SECRET, "bypass-tunnel-reminder": "true" };

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  return user?.email === ADMIN_EMAIL;
}

function balanceToAccountSize(balance: number): { label: string; value: number } {
  if (balance >= 150000) return { label: "$200,000", value: 200000 };
  if (balance >= 70000)  return { label: "$100,000", value: 100000 };
  if (balance >= 35000)  return { label: "$50,000",  value: 50000 };
  if (balance >= 15000)  return { label: "$25,000",  value: 25000 };
  return { label: "$10,000", value: 10000 };
}

// POST body:
// {
//   server: string,           // MT5 server name (e.g. "HAR-Server")
//   masterPassword: string,   // M@SeSh2u
//   accounts: Array<{
//     login: number,
//     firstName: string,
//     lastName: string,
//     model?: "2step" | "1step",  // default "2step"
//     phase?: "phase1" | "phase2" | "funded",  // default "phase1"
//   }>
// }

export async function POST(req: NextRequest) {
  if (!await checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { accounts, masterPassword, server = "HAR-Server" } = body as {
    accounts: Array<{
      login: number;
      firstName: string;
      lastName: string;
      model?: string;
      phase?: string;
    }>;
    masterPassword: string;
    server?: string;
  };

  if (!accounts?.length) return NextResponse.json({ error: "accounts array required" }, { status: 400 });

  const admin = createAdminClient();
  const results: Record<string, unknown>[] = [];

  // Load all profiles once
  const { data: allProfiles } = await admin.from("profiles").select("user_id, first_name, last_name");
  const { data: { users: allUsers } } = await admin.auth.admin.listUsers();
  const userEmailMap = Object.fromEntries(allUsers.map(u => [u.id, u.email ?? ""]));

  for (const acct of accounts) {
    const { login, firstName, lastName, model = "2step", phase = "phase1" } = acct;

    try {
      // 1. Idempotency — skip if mt5_login already linked
      const { data: existing } = await admin.from("challenges").select("id").eq("mt5_login", login).single();
      if (existing) {
        results.push({ login, status: "already_exists", id: existing.id });
        continue;
      }

      // 2. Get real balance from VPS
      const vpsRes = await fetch(`${MT5_URL}/accounts/${login}`, { headers: MT5_HEADERS });
      if (!vpsRes.ok) { results.push({ login, status: "vps_error", error: `${vpsRes.status}` }); continue; }
      const mt5Data = await vpsRes.json();
      const balance = mt5Data.balance as number ?? 0;
      const { label: accountSize, value: startBalance } = balanceToAccountSize(balance);

      // 3. Find Supabase user by firstName + lastName (case-insensitive)
      const fnLower = firstName.toLowerCase().trim();
      const lnLower = lastName.toLowerCase().trim();
      const profile = (allProfiles ?? []).find(p =>
        (p.first_name ?? "").toLowerCase().trim() === fnLower &&
        (p.last_name  ?? "").toLowerCase().trim() === lnLower
      );

      if (!profile) {
        results.push({ login, status: "no_user", firstName, lastName, note: "Profile not found in Supabase" });
        continue;
      }

      const userId = profile.user_id;
      const email  = userEmailMap[userId] ?? "";

      // 4. Create challenge row
      const status = (phase === "funded") ? "funded" : "active";
      const { data: inserted, error: insertErr } = await admin.from("challenges").insert({
        user_id:               userId,
        account_size:          accountSize,
        model,
        status,
        phase,
        balance:               Math.round(balance),
        start_balance:         startBalance,
        profit_target:         phase === "funded" ? 0 : 10,
        daily_drawdown_limit:  model === "1step" ? 3 : 5,
        total_drawdown_limit:  10,
        trading_days:          0,
        amount_paid:           0,
        mt5_login:             login,
        mt5_password:          masterPassword,
        mt5_password_investor: null,
        mt5_server:            server,
        last_synced_at:        new Date().toISOString(),
      }).select("id").single();

      if (insertErr) {
        results.push({ login, status: "insert_error", error: insertErr.message });
        continue;
      }

      // 5. Send apology email
      if (email) {
        try {
          await sendApologyEmail(email, firstName, accountSize, phase, { login, password: masterPassword, server });
          results.push({ login, status: "restored", email, challengeId: inserted?.id, accountSize, model, phase });
        } catch (e) {
          results.push({ login, status: "restored_no_email", email, challengeId: inserted?.id, emailError: String(e) });
        }
      } else {
        results.push({ login, status: "restored_no_email", note: "No email found for user", challengeId: inserted?.id });
      }
    } catch (e) {
      results.push({ login, status: "error", error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
