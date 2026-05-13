import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  return user?.email === process.env.ADMIN_EMAIL;
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token || "");
  if (user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized", userEmail: user?.email, adminEmail: process.env.ADMIN_EMAIL }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: challenges } = await admin
    .from("challenges")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));

  const result = (challenges || []).map(c => ({ ...c, user_email: userMap[c.user_id] || "—" }));

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin.from("challenges").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
