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

  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, kyc_status, kyc_rejection_reason, kyc_submitted_at, kyc_reviewed_at, kyc_doc_id_front, kyc_doc_id_back, kyc_doc_residence, kyc_doc_selfie")
    .neq("kyc_status", "not_submitted")
    .order("kyc_submitted_at", { ascending: false });

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userMap = Object.fromEntries(users.map(u => [u.id, u.email]));

  const result = await Promise.all((profiles || []).map(async (p) => {
    const docFields: Record<string, string | null> = {
      id_front: p.kyc_doc_id_front,
      id_back: p.kyc_doc_id_back,
      residence: p.kyc_doc_residence,
      selfie: p.kyc_doc_selfie,
    };
    const doc_urls: Record<string, string | null> = {};
    for (const [key, path] of Object.entries(docFields)) {
      if (path) {
        const { data } = await admin.storage.from("kyc-documents").createSignedUrl(path, 3600);
        doc_urls[key] = data?.signedUrl || null;
      } else {
        doc_urls[key] = null;
      }
    }
    return { ...p, id: p.user_id, user_email: userMap[p.user_id] || "—", doc_urls };
  }));

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  if (!await checkAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user_id, status, rejection_reason } = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .update({
      kyc_status: status,
      kyc_reviewed_at: new Date().toISOString(),
      kyc_rejection_reason: rejection_reason || null,
    })
    .eq("id", user_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
