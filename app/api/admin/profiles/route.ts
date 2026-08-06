import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";



export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
