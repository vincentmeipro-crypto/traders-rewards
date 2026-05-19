import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_EMAIL = "fundedelysium@gmail.com";

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

  const { data: { users } } = await admin.auth.admin.listUsers();
  const emailMap = Object.fromEntries(users.map(u => [u.id, u.email]));

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, first_name, last_name, phone, address, city, postal_code, country");

  const result = (profiles || []).map(p => ({
    ...p,
    email: emailMap[p.user_id] || null,
  }));

  return NextResponse.json(result);
}
