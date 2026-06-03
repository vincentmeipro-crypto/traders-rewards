import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRewardCertificateEmail, sendFundedEmail } from "@/lib/mailer";
import { createMT5Account, disableMT5Account } from "@/lib/mt5";

const ADMIN_EMAIL = "vincentmeipro@gmail.com";

const FUNDED_GROUP: Record<string, string> = {
  "2step": "Starwave\\demo\\FX1\\grp3",
  "1step": "Starwave\\demo\\FX1\\grp4",
};

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
        .select("id, account_size, model, start_balance, daily_drawdown_limit, total_drawdown_limit, mt5_login")
        .eq("id", data.challenge_id).single();

      if (challenge) {
        const { account_size, model, start_balance, daily_drawdown_limit, total_drawdown_limit, mt5_login } = challenge;
        const is1Step = model?.toLowerCase().replace(/[\s-]/g, "").includes("1step");
        const group = is1Step ? FUNDED_GROUP["1step"] : FUNDED_GROUP["2step"];

        // Marquer l'ancien compte certified comme "passed"
        await admin.from("challenges").update({ status: "passed" }).eq("id", challenge.id);

        // Désactiver l'ancien compte MT5
        if (mt5_login) await disableMT5Account(mt5_login).catch(() => {});

        // Créer un nouveau compte MT5 certified
        let newMT5 = null;
        try {
          newMT5 = await createMT5Account({
            firstName, lastName, email: userEmail,
            leverage: 50, group, account_size,
          });
        } catch (e) { console.error("MT5 creation error on reward:", e); }

        // Insérer le nouveau challenge certified
        const { error: insertErr } = await admin.from("challenges").insert({
          user_id: data.user_id,
          account_size,
          model,
          status: "funded",
          phase: "funded",
          balance: start_balance,
          start_balance,
          profit_target: 0,
          daily_drawdown_limit,
          total_drawdown_limit,
          trading_days: 0,
          amount_paid: 0,
          payment_method: "card",
          mt5_login: newMT5?.login ?? null,
          mt5_password: newMT5?.password ?? null,
          mt5_password_investor: newMT5?.password_investor ?? null,
          mt5_server: newMT5?.server ?? null,
        });
        if (insertErr) console.error("INSERT new certified error:", insertErr);

        // Emails
        const certDate = new Date().toLocaleDateString("fr-FR");
        await sendRewardCertificateEmail(userEmail, firstName, lastName, account_size, data.amount, model, certDate).catch((e) => console.error("Reward cert email error:", e));
        await sendFundedEmail(userEmail, account_size, newMT5 ?? undefined).catch((e) => console.error("Funded email error:", e));
      }
    } catch (e) {
      console.error("Payout approval error:", e);
    }
  }

  return NextResponse.json(data);
}
