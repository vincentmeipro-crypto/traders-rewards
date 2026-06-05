import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRewardCertificateEmail } from "@/lib/mailer";
import { getMT5Account, withdrawMT5Balance } from "@/lib/mt5";

const ADMIN_EMAIL = "vincentmeipro@gmail.com";

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  return user?.email === ADMIN_EMAIL;
}

export async function GET(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin.from("payouts").select("*").order("created_at", { ascending: false });
  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));
  const result = (data || []).map(p => ({ ...p, user_email: userMap[p.user_id] || "-" }));
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, status } = await req.json();
  const admin = createAdminClient();

  const { data: previous } = await admin.from("payouts").select("*").eq("id", id).single();
  const { data } = await admin.from("payouts").update({ status }).eq("id", id).select().single();

  if (status === "paid" && previous?.status !== "paid") {
    try {
      const { data: { users } } = await admin.auth.admin.listUsers();
      const user = users.find((u: { id: string }) => u.id === data.user_id);
      const userEmail = user?.email || "";

      const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", data.user_id).single();
      const firstName = profile?.first_name || "";
      const lastName = profile?.last_name || "";

      const { data: challenge } = await admin.from("challenges")
        .select("id, account_size, model, start_balance")
        .eq("id", data.challenge_id).single();

      if (challenge) {
        // MT5 : retrait automatique du profit (type 2, montant positif)
        if (challenge.mt5_login) {
          try {
            const mt5Info = await getMT5Account(challenge.mt5_login);
            const profit = parseFloat((mt5Info.balance - challenge.start_balance).toFixed(2));
            if (profit > 0) {
              await withdrawMT5Balance(challenge.mt5_login, profit, "Profit Withdrawal — Elysium");
            }
          } catch (e) {
            console.error("MT5 auto-withdraw error:", e);
          }
        }

        // Remettre la balance à zéro (start_balance) et reset les jours
        await admin.from("challenges").update({
          balance: challenge.start_balance,
          trading_days: 0,
          highest_balance: challenge.start_balance,
          daily_dd: 0,
          best_day_profit: 0,
        }).eq("id", challenge.id);

        // Email certificat récompense
        const certDate = new Date().toLocaleDateString("fr-FR");
        await sendRewardCertificateEmail(userEmail, firstName, lastName, challenge.account_size, data.amount, challenge.model, certDate)
          .catch((e) => console.error("Reward cert email error:", e));
      }
    } catch (e) {
      console.error("Payout approval error:", e);
    }
  }

  return NextResponse.json(data);
}
