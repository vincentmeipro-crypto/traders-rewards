import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRewardCertificateEmail } from "@/lib/mailer";

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
  const result = (data || []).map(p => ({ ...p, user_email: userMap[p.user_id] || "—" }));
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
      const user = users.find(u => u.id === data.user_id);
      const userEmail = user?.email || "";

      const { data: profile } = await admin.from("profiles").select("first_name, last_name").eq("user_id", data.user_id).single();
      const firstName = profile?.first_name || "";
      const lastName = profile?.last_name || "";

      const { data: challenge } = await admin.from("challenges").select("account_size, model").eq("id", data.challenge_id).single();
      const accountSize = challenge?.account_size || "";
      const model = challenge?.model || "2step";

      const certDate = new Date().toLocaleDateString("fr-FR");
      await sendRewardCertificateEmail(userEmail, firstName, lastName, accountSize, data.amount, model, certDate);
    } catch (e) {
      console.error("Reward cert email error:", e);
    }
  }

  return NextResponse.json(data);
}
