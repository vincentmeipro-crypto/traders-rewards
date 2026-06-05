import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challenge_id, amount, wallet_address, payment_method } = await req.json();

  // Verrou : empêcher double demande sur le même challenge
  const { data: existing } = await supabase
    .from("payouts")
    .select("id")
    .eq("challenge_id", challenge_id)
    .eq("status", "pending")
    .single();
  if (existing) return NextResponse.json({ error: "Une demande est déjà en cours pour ce compte." }, { status: 409 });

  const { data, error } = await supabase.from("payouts").insert({
    user_id: user.id,
    challenge_id,
    amount,
    wallet_address,
    payment_method,
    status: "pending",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase.from("payouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}
