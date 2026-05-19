import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("kyc_status, kyc_rejection_reason, kyc_submitted_at")
    .eq("id", user.id)
    .single();

  return NextResponse.json(data || { kyc_status: "not_submitted" });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { doc_id_front, doc_id_back, doc_residence, doc_selfie } = await req.json();

  const admin = createAdminClient();
  const { error } = await admin.rpc("submit_kyc_docs", {
    p_user_id: user.id,
    p_doc_id_front: doc_id_front || null,
    p_doc_id_back: doc_id_back || null,
    p_doc_residence: doc_residence || null,
    p_doc_selfie: doc_selfie || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
