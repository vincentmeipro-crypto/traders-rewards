import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isV1Challenge, isV1NextRewardBlocked } from "@/lib/v1-lifecycle";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challenge_id, amount, wallet_address, payment_method } = await req.json();

  // Vérification du challenge pour les gardes V1
  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, dd_model, terminated_at")
    .eq("id", challenge_id)
    .single();

  // Garde V1 : compte terminé après R#5 → aucun R#6 possible
  if (challenge && isV1Challenge(challenge.dd_model as string | null) && challenge.terminated_at) {
    return NextResponse.json(
      { error: "Ce compte Reward a atteint le maximum de 5 Rewards. Aucun Reward supplémentaire n'est possible." },
      { status: 409 }
    );
  }

  // Garde V1 : compter les payouts paid pour bloquer R#6
  if (challenge && isV1Challenge(challenge.dd_model as string | null)) {
    const { count: paidCount } = await supabase
      .from("payouts")
      .select("id", { count: "exact", head: true })
      .eq("challenge_id", challenge_id)
      .eq("status", "paid");
    if (isV1NextRewardBlocked(paidCount ?? 0)) {
      return NextResponse.json(
        { error: "Reward #6 impossible — le parcours V1 est limité à 5 Rewards." },
        { status: 409 }
      );
    }
  }

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
