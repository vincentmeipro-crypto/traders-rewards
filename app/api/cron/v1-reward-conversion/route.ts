/**
 * ============================================================
 * CRON — V1 Reward Conversion (bascule lendemain)
 * ============================================================
 *
 * Cadence : toutes les minutes (Vercel Cron).
 * Auth    : Bearer CRON_SECRET (comme les autres crons).
 *
 * COMPORTEMENT :
 *   Cherche les challenges V1 (dd_model='trailing_eod_lock') qui :
 *     - sont en statut 'passed'
 *     - ont un challenge_passed_at ANTÉRIEUR au début de la journée de trading courante
 *     - n'ont pas encore de reward_converted_at (pas encore convertis)
 *     - ne sont pas en cours de conversion (reward_conversion_status ≠ 'converting')
 *
 *   Pour chaque challenge éligible :
 *     1. Claim atomique → reward_conversion_status = 'converting'
 *     2. Upsert dans v1_challenge_history (permanent, immuable)
 *     3. MT5 : lecture balance réelle
 *     4. MT5 : retrait du profit (balance → capital initial)
 *     5. MT5 : changement de groupe → demoG4 (Reward Account)
 *     6. DB  : status='funded', phase='funded', reward_converted_at=now(), status='done'
 *     7. Envoi email Reward Account (sendFundedEmail)
 *
 *   IDEMPOTENCE :
 *     - reward_converted_at IS NOT NULL → challenge ignoré silencieusement
 *     - Claim atomique via UPDATE WHERE status='passed' AND reward_converted_at IS NULL
 *       et reward_conversion_status IS DISTINCT FROM 'converting'
 *
 *   ERREUR MT5 :
 *     - Si une opération MT5 échoue → reward_conversion_status = 'error'
 *     - reward_converted_at reste NULL → le challenge sera retenté au prochain tick
 *     - La DB ne marque JAMAIS 'done' si le MT5 n'a pas réussi
 *     - Pas de corruption possible : seul l'état 'error' + log identifient le problème
 *
 *   MÊME LOGIN MT5 :
 *     - Aucune création de compte MT5 — on utilise le login du challenge existant
 *     - Le login est conservé du Challenge jusqu'à R#5 inclus
 *
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getMT5Account,
  withdrawMT5Balance,
  changeMT5Group,
  enableMT5Account,
  updateMT5AccountName,
} from "@/lib/mt5";
import { sendFundedEmail } from "@/lib/mailer";
import {
  getCurrentTradingDayStart,
  isV1ConversionEligible,
  computeV1ChallengeResetWithdrawal,
  V1_REWARD_MT5_GROUP,
} from "@/lib/v1-lifecycle";

/** Forme attendue des lignes de la requête candidates. */
type V1ChallengeCandidate = {
  id: string;
  user_id: string;
  account_size: string;
  model: string;
  start_balance: number;
  mt5_login: number | null;
  rules_snapshot: unknown;
  challenge_passed_at: string | null;
  reward_converted_at: string | null;
  reward_conversion_status: string | null;
  status: string;
};

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const tradingDayStart = getCurrentTradingDayStart(now);

  // ── Chercher les challenges V1 en attente de conversion ──
  const { data: rawCandidates, error: fetchErr } = await admin
    .from("challenges")
    .select(
      "id, user_id, account_size, model, start_balance, mt5_login, " +
      "rules_snapshot, challenge_passed_at, reward_converted_at, " +
      "reward_conversion_status, status"
    )
    .eq("dd_model", "trailing_eod_lock")
    .eq("status", "passed")
    .is("reward_converted_at", null);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  const candidates = (rawCandidates ?? []) as unknown as V1ChallengeCandidate[];
  if (!candidates.length) {
    return NextResponse.json({ converted: 0, skipped: 0, errors: 0 });
  }

  const { data: { users } } = await admin.auth.admin.listUsers();
  const userEmailMap = Object.fromEntries(users.map(u => [u.id, u.email ?? ""]));

  let converted = 0;
  let skipped   = 0;
  let errors    = 0;

  for (const challenge of candidates) {
    // ── Vérifier éligibilité (lendemain) ──────────────────
    const eligible = isV1ConversionEligible({
      status:                 challenge.status,
      challengePassedAt:      challenge.challenge_passed_at,
      rewardConvertedAt:      challenge.reward_converted_at,
      rewardConversionStatus: challenge.reward_conversion_status,
      currentTradingDayStart: tradingDayStart,
    });

    if (!eligible) {
      skipped++;
      continue;
    }

    // ── Claim atomique → 'converting' (idempotence multi-instance) ──
    const { data: claimed, error: claimErr } = await admin
      .from("challenges")
      .update({ reward_conversion_status: "converting" })
      .eq("id", challenge.id)
      .eq("status", "passed")
      .is("reward_converted_at", null)
      .neq("reward_conversion_status", "converting")
      .select("id")
      .maybeSingle();

    if (claimErr || !claimed) {
      // Un autre process a déjà claimé ce challenge
      skipped++;
      continue;
    }

    // ── Upsert dans v1_challenge_history ─────────────────
    // Idempotent : ON CONFLICT DO NOTHING (une seule ligne par challenge)
    const { error: histErr } = await admin.from("v1_challenge_history").upsert(
      {
        challenge_id:   challenge.id,
        user_id:        challenge.user_id,
        account_size:   challenge.account_size,
        start_balance:  challenge.start_balance,
        mt5_login:      challenge.mt5_login,
        passed_at:      challenge.challenge_passed_at,
        dd_model:       "trailing_eod_lock",
        rules_snapshot: challenge.rules_snapshot,
      },
      { onConflict: "challenge_id", ignoreDuplicates: true }
    );
    if (histErr) {
      console.error(`[V1 Conversion] history upsert failed for ${challenge.id}:`, histErr);
      // Non bloquant : on continue la conversion même si l'historique échoue
    }

    // ── Opérations MT5 ────────────────────────────────────
    try {
      const mt5Login = challenge.mt5_login as number;
      const startBalance = challenge.start_balance as number;

      if (!mt5Login) {
        throw new Error("Pas de login MT5 sur ce challenge — conversion sans MT5");
      }

      // 1. Lecture balance réelle depuis MT5
      const mt5Info = await getMT5Account(mt5Login);
      const currentMT5Balance = mt5Info.balance ?? startBalance;

      // 2. Retrait du profit (reset au capital initial)
      const withdrawalAmount = computeV1ChallengeResetWithdrawal(currentMT5Balance, startBalance);
      if (withdrawalAmount > 0) {
        await withdrawMT5Balance(
          mt5Login,
          withdrawalAmount,
          "V1 Challenge → Reward Account : reset profit"
        );
      }

      // 3. Activation du compte (s'il avait été désactivé en attendant)
      try { await enableMT5Account(mt5Login); } catch {}

      // 4. Changement de groupe → Reward Account (demoG4)
      await changeMT5Group(mt5Login, V1_REWARD_MT5_GROUP);

      // 5. Mise à jour du nom MT5 (label "Reward")
      const { data: profile } = await admin
        .from("profiles")
        .select("first_name, last_name")
        .eq("user_id", challenge.user_id)
        .single();
      const { data: { user } } = await admin.auth.admin.getUserById(challenge.user_id as string);
      const firstName = user?.user_metadata?.first_name || profile?.first_name || "Trader";
      const lastName  = user?.user_metadata?.last_name  || profile?.last_name  || "";
      try {
        await updateMT5AccountName(mt5Login, firstName, lastName, "Trader | Reward");
      } catch {}

      // 6. Mise à jour DB → statut funded, conversion terminée
      const convertedAt = new Date().toISOString();
      await admin.from("challenges").update({
        status:                   "funded",
        phase:                    "funded",
        balance:                  startBalance,        // capital initial (profit retiré)
        trading_days:             0,                   // remise à zéro pour Reward Account
        highest_balance:          startBalance,        // reset du plus haut pour R#1
        highest_eod:              startBalance,        // reset du plus haut EOD
        best_day_profit:          0,                   // reset pour qualifying days
        daily_dd:                 0,
        reward_converted_at:      convertedAt,
        reward_conversion_status: "done",
        last_synced_at:           convertedAt,         // bloque sync immédiat post-reset
      }).eq("id", challenge.id);

      // 7. Mise à jour converted_at dans l'historique
      await admin
        .from("v1_challenge_history")
        .update({ converted_at: convertedAt })
        .eq("challenge_id", challenge.id);

      // 8. Email "Reward Account activé"
      const userEmail = userEmailMap[challenge.user_id as string] ?? "";
      if (userEmail) {
        try {
          await sendFundedEmail(
            userEmail,
            challenge.account_size,
            mt5Login
              ? { login: mt5Login, password: "", server: "" }
              : undefined,
            undefined,
            challenge.model,
            { userId: challenge.user_id as string, challengeId: challenge.id as string }
          );
        } catch (emailErr) {
          console.error(`[V1 Conversion] email failed for ${challenge.id}:`, emailErr);
          // Email non bloquant — la conversion est marquée comme réussie quand même
        }
      }

      console.info(
        `[V1 Conversion] ✅ ${challenge.id} | login=${mt5Login} | ` +
        `withdrawn=${withdrawalAmount}$ | group→demoG4 | status=funded`
      );
      converted++;

    } catch (mt5Err) {
      // ── Erreur MT5 → état récupérable ──────────────────
      // reward_converted_at reste NULL → le cron retentera au prochain tick
      // (sauf si reward_conversion_status = 'error', auquel que le cron ré-évalue l'éligibilité)
      console.error(`[V1 Conversion] ❌ MT5 error for ${challenge.id}:`, mt5Err);

      await admin.from("challenges").update({
        reward_conversion_status: "error",
        // NE PAS mettre reward_converted_at — il reste NULL pour permettre le retry
      }).eq("id", challenge.id);

      errors++;
    }
  }

  return NextResponse.json({
    converted,
    skipped,
    errors,
    total: candidates.length,
    tradingDayStart: tradingDayStart.toISOString(),
  });
}
