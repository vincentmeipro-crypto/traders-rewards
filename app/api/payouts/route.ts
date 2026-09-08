import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadRewardAccounts } from "@/lib/reward-eligibility-server";
import { validRewardAmount } from "@/lib/reward-eligibility";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const { challenge_id, amount, wallet_address, payment_method } = body ?? {};
  if (typeof challenge_id !== "string" || typeof wallet_address !== "string" || !wallet_address.trim() || !["bank", "crypto"].includes(payment_method)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    const [account] = await loadRewardAccounts(supabase, user.id, challenge_id);
    if (!account) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
    if (!account.eligible) return NextResponse.json({ error: "Conditions de Reward non remplies", reasons: account.reasons }, { status: 409 });
    if (!validRewardAmount(amount, account.maximum)) return NextResponse.json({ error: "Montant hors limites", maximum: account.maximum }, { status: 400 });
  } catch { return NextResponse.json({ error: "Vérification indisponible, réessayez plus tard" }, { status: 503 }); }

  const { data, error } = await supabase.from("payouts").insert({
    user_id: user.id,
    challenge_id,
    amount,
    wallet_address,
    payment_method,
    status: "pending",
  }).select().single();

  if (error) return NextResponse.json({ error: error.code === "23505" ? "Une demande est déjà en cours." : "Demande impossible" }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json(data);
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase.from("payouts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json(data || []);
}
