/**
 * ============================================================
 * TRADERS REWARDS V1 — Tests métier du moteur
 * ============================================================
 *
 * Tests organisés par section selon le brief (A à P) :
 *
 * A. 3 niveaux présents dans V1_REWARD_CAPS (toutes balances)
 * B. 25K Challenge DD = 4 %
 * C. 50K Challenge DD = 4 %
 * D. 100K Challenge DD = 3 %
 * E. Aucun daily DD (V1 = trailing EOD uniquement)
 * F. Challenge ne locke jamais (lockPct = null)
 * G. Reward #1 lock : 25K → 25K / 50K → 50K / 100K → 100K
 * H. 100K lock atteint à haut EOD 103 000
 * I. Reward threshold : 26 000 / 52 000 / 104 000
 * J. Qualifying day : 50 / 100 / 150 USD
 * K. Consistency Challenge = 50 %
 * L. Consistency Reward = 33 %
 * M. Reward caps #1 à #5 corrects (3 tailles)
 * N. Level 3 floor fixe : 25K / 50K / 100K
 * O. Reward réellement versée déduite de la balance
 * P. Aucune déduction automatique du cap maximum
 *
 * Exécution : npx tsx lib/v1-engine.test.ts
 * (Pas de framework — assertions manuelles, exit(1) si un test échoue)
 * ============================================================
 */

import {
  V1_DD_PCT_BY_BALANCE,
  V1_DD_USD_BY_BALANCE,
  V1_SAFETY_NET,
  V1_DAILY_LOSS_LIMIT_CHALLENGE,
  V1_DAILY_LOSS_LIMIT_REWARD,
  V1_CONSISTENCY_PCT,
  V1_CHALLENGE,
  V1_REWARD_CAPS,
  V1_QUALIFYING_DAY_MIN_USD,
  getV1DdPctByBalance,
  getV1DdUsdByBalance,
  getV1SafetyNet,
  getV1DailyLossLimit,
  getV1LockPctByBalance,
  getV1RewardCap,
  getV1RewardThresholdUsd,
  getV1FixedFloor,
  computeV1TrailingFloor,
  isV1TrailingLocked,
  checkV1DDBreach,
  computeV1EffectiveProfitTarget,
  computeRewardRequestThreshold,
  computeRewardImpact,
  computeEligibleNewProfit,
  computeRewardAvailable,
  REWARD_REQUEST_PROFIT_PCT,
  getTraderV1Level,
  V1_MAX_REWARDS,
} from "./v1-engine";

// ── Helpers ───────────────────────────────────────────────────

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const BOLD   = "\x1b[1m";
const RESET  = "\x1b[0m";

let passed = 0;
let failed = 0;

function test(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ${GREEN}✅ PASS${RESET}  ${label}`);
    passed++;
  } else {
    console.log(`  ${RED}❌ FAIL${RESET}  ${label}`);
    console.log(`         expected : ${JSON.stringify(expected)}`);
    console.log(`         got      : ${JSON.stringify(actual)}`);
    failed++;
  }
}

function section(title: string) {
  console.log(`\n${BOLD}── ${title} ──${RESET}`);
}

// ════════════════════════════════════════════════════════════════
// A. 3 niveaux présents dans V1_REWARD_CAPS (toutes balances)
// ════════════════════════════════════════════════════════════════

section("A. V1_REWARD_CAPS — 5 niveaux disponibles pour 25K/50K/100K");

for (const balance of [25000, 50000, 100000]) {
  test(`V1_REWARD_CAPS[${balance}] a 5 niveaux`, Object.keys(V1_REWARD_CAPS[balance]).length, 5);
  for (let lvl = 1; lvl <= 5; lvl++) {
    test(`getV1RewardCap(${balance}, ${lvl}) !== null`, getV1RewardCap(balance, lvl) !== null, true);
  }
}

// ════════════════════════════════════════════════════════════════
// B-D. Challenge DD — Apex EOD : % legacy + $ fixe
// ════════════════════════════════════════════════════════════════

section("B. 25K DD — 4 % legacy, 1 000$ fixe (Apex EOD)");
test("getV1DdPctByBalance(25000) = 4 (affichage legacy)", getV1DdPctByBalance(25000), 4);
test("V1_DD_PCT_BY_BALANCE[25000] = 4", V1_DD_PCT_BY_BALANCE[25000], 4);
test("getV1DdUsdByBalance(25000) = 1 000", getV1DdUsdByBalance(25000), 1000);
test("V1_DD_USD_BY_BALANCE[25000] = 1 000", V1_DD_USD_BY_BALANCE[25000], 1000);

section("C. 50K DD — 4 % legacy, 2 000$ fixe (Apex EOD)");
test("getV1DdPctByBalance(50000) = 4 (affichage legacy)", getV1DdPctByBalance(50000), 4);
test("V1_DD_PCT_BY_BALANCE[50000] = 4", V1_DD_PCT_BY_BALANCE[50000], 4);
test("getV1DdUsdByBalance(50000) = 2 000", getV1DdUsdByBalance(50000), 2000);
test("V1_DD_USD_BY_BALANCE[50000] = 2 000", V1_DD_USD_BY_BALANCE[50000], 2000);

section("D. 100K DD — 3 % legacy, 3 000$ fixe (Apex EOD)");
test("getV1DdPctByBalance(100000) = 3 (affichage legacy)", getV1DdPctByBalance(100000), 3);
test("V1_DD_PCT_BY_BALANCE[100000] = 3", V1_DD_PCT_BY_BALANCE[100000], 3);
test("getV1DdUsdByBalance(100000) = 3 000", getV1DdUsdByBalance(100000), 3000);
test("V1_DD_USD_BY_BALANCE[100000] = 3 000", V1_DD_USD_BY_BALANCE[100000], 3000);

// ════════════════════════════════════════════════════════════════
// E. Apex EOD — trailing fixe $, aucun DD journalier séparé dans le moteur
// ════════════════════════════════════════════════════════════════

section("E. Apex EOD — floor = highest − ddUsd (montant fixe $)");
// Apex EOD : floor = highest_eod − ddUsd (pas de %). Le DLL existe mais
// est géré en dehors de ce moteur (paramètre externe, pas dans checkV1DDBreach).
{
  // 50K : floor = 50 000 − 2 000 = 48 000 (même résultat qu'avant au départ)
  const floor50K = computeV1TrailingFloor(50000, 50000, 2000, null);
  test("floor 50K start = 48 000 (2 000$ trailing, no lock)", floor50K, 48000);
  // Breach (convention stricte <)
  const breach = checkV1DDBreach(50000, 50000, 47999, 2000, null);
  test("breach 47 999 < floor 48 000", breach.breached, true);
  // Au floor — PAS de breach
  const atFloor = checkV1DDBreach(50000, 50000, 48000, 2000, null);
  test("no breach at floor (48 000 = floor)", atFloor.breached, false);
  // floor croît de façon linéaire avec highest (montant fixe $)
  const floor51K = computeV1TrailingFloor(50000, 51000, 2000, null);
  test("floor 50K highest=51 000 → 51 000 − 2 000 = 49 000", floor51K, 49000);
  const floor60K = computeV1TrailingFloor(50000, 60000, 2000, null);
  test("floor 50K highest=60 000 → 60 000 − 2 000 = 58 000", floor60K, 58000);
}

// ════════════════════════════════════════════════════════════════
// F. Challenge ne locke jamais (safetyNet = null)
// ════════════════════════════════════════════════════════════════

section("F. Challenge — aucun lock (safetyNet = null), floor = highest − ddUsd$");
{
  // 50K ddUsd=2 000 : floor croît de façon linéaire, pas de lock
  const cases: [number, number][] = [
    [50000,  48000],  // 50 000 − 2 000
    [51000,  49000],  // 51 000 − 2 000
    [52000,  50000],  // 52 000 − 2 000
    [53000,  51000],
    [54000,  52000],
    [60000,  58000],
  ];
  for (const [high, expectedFloor] of cases) {
    const floor = computeV1TrailingFloor(50000, high, 2000, null);
    test(`Challenge 50K floor à highest=${high} = ${expectedFloor}`, floor, expectedFloor);
  }
  // Même à 200 000 — pas de lock
  const floorAt200K = computeV1TrailingFloor(50000, 200000, 2000, null);
  test("Challenge pas de lock même à highest=200 000 → 198 000", floorAt200K, 198000);
  // Apex EOD: 0 jour minimum de trading
  test("V1_CHALLENGE.minTradingDays = 0 (Apex EOD)", V1_CHALLENGE.minTradingDays, 0);
}

// ════════════════════════════════════════════════════════════════
// G. Reward #1 — Safety Net lock (Apex EOD)
// ════════════════════════════════════════════════════════════════

section("G. Reward #1 — lock via Safety Net (Apex EOD)");
{
  // 25K : Safety Net = 26 100 (was 26 000 = start×1.04)
  // Avant le lock (highest < 26 100) → floor = highest − 1 000
  const f25kPre = computeV1TrailingFloor(25000, 25500, 1000, 26100);
  test("25K Reward#1 floor avant lock (highest=25 500) → 24 500", f25kPre, 24500);
  // Au lock exactement (highest = 26 100) → floor = 25 000
  const f25kLock = computeV1TrailingFloor(25000, 26100, 1000, 26100);
  test("25K Reward#1 floor au lock (highest=26 100) = 25 000", f25kLock, 25000);
  // Juste avant le lock (highest = 26 099) → floor = 26 099 − 1 000 = 25 099
  const f25kBefore = computeV1TrailingFloor(25000, 26099, 1000, 26100);
  test("25K Reward#1 floor juste avant lock (highest=26 099) = 25 099", f25kBefore, 25099);
  // Après le lock (highest > 26 100) → floor = 25 000
  const f25kPost = computeV1TrailingFloor(25000, 27000, 1000, 26100);
  test("25K Reward#1 floor après lock (highest=27 000) = 25 000", f25kPost, 25000);

  // 50K : Safety Net = 52 100
  const f50kPre  = computeV1TrailingFloor(50000, 51000, 2000, 52100);
  test("50K Reward#1 floor avant lock (highest=51 000) → 49 000", f50kPre, 49000);
  const f50kLock = computeV1TrailingFloor(50000, 52100, 2000, 52100);
  test("50K Reward#1 floor au lock (highest=52 100) = 50 000", f50kLock, 50000);
  const f50kPost = computeV1TrailingFloor(50000, 54000, 2000, 52100);
  test("50K Reward#1 floor après lock = 50 000", f50kPost, 50000);

  // 100K : Safety Net = 103 100
  const f100kPre  = computeV1TrailingFloor(100000, 102000, 3000, 103100);
  test("100K Reward#1 floor avant lock (highest=102 000) → 99 000", f100kPre, 99000);
  const f100kLock = computeV1TrailingFloor(100000, 103100, 3000, 103100);
  test("100K Reward#1 floor au lock (highest=103 100) = 100 000", f100kLock, 100000);
  const f100kPost = computeV1TrailingFloor(100000, 110000, 3000, 103100);
  test("100K Reward#1 floor après lock = 100 000", f100kPost, 100000);
}

// ════════════════════════════════════════════════════════════════
// H. Safety Net — seuil de lock par balance (Apex EOD)
// ════════════════════════════════════════════════════════════════

section("H. Safety Net — seuil de lock Apex EOD (26 100 / 52 100 / 103 100)");
{
  // isV1TrailingLocked prend maintenant (highestEod, safetyNet) — 2 args
  test("isV1TrailingLocked(103099, 103100) = false", isV1TrailingLocked(103099, 103100), false);
  test("isV1TrailingLocked(103100, 103100) = true",  isV1TrailingLocked(103100, 103100), true);
  test("isV1TrailingLocked(110000, 103100) = true",  isV1TrailingLocked(110000, 103100), true);

  // Safety Net vs ancien seuil start×1.03
  const oldLock  = 100000 * 1.03;  // 103 000 (ancien)
  const newSN    = V1_SAFETY_NET[100000];  // 103 100 (Apex EOD)
  test("Safety Net 100K = 103 100 (was 103 000)", newSN, 103100);
  test("Safety Net 100K > ancien lock start×1.03", newSN > oldLock, true);

  // Safety Net 25K / 50K / 100K
  test("getV1SafetyNet(25000)  = 26 100", getV1SafetyNet(25000),  26100);
  test("getV1SafetyNet(50000)  = 52 100", getV1SafetyNet(50000),  52100);
  test("getV1SafetyNet(100000) = 103 100", getV1SafetyNet(100000), 103100);
  test("V1_SAFETY_NET[25000]  = 26 100", V1_SAFETY_NET[25000],  26100);
  test("V1_SAFETY_NET[50000]  = 52 100", V1_SAFETY_NET[50000],  52100);
  test("V1_SAFETY_NET[100000] = 103 100", V1_SAFETY_NET[100000], 103100);
}

// ════════════════════════════════════════════════════════════════
// I. Reward threshold — Apex EOD : Safety Net + cap du niveau
// ════════════════════════════════════════════════════════════════

section("I. Reward request threshold = Safety Net + cap (Apex EOD)");
// 25K R#1 : 26 100 + 300 = 26 400
test("25K R#1 threshold = 26 400", computeRewardRequestThreshold(25000, 1), 26400);
// 50K R#1 : 52 100 + 500 = 52 600
test("50K R#1 threshold = 52 600", computeRewardRequestThreshold(50000, 1), 52600);
// 100K R#1 : 103 100 + 750 = 103 850
test("100K R#1 threshold = 103 850", computeRewardRequestThreshold(100000, 1), 103850);
// 25K R#2 : 26 100 + 400 = 26 500
test("25K R#2 threshold = 26 500", computeRewardRequestThreshold(25000, 2), 26500);
// 50K R#5 : 52 100 + 1 250 = 53 350
test("50K R#5 threshold = 53 350", computeRewardRequestThreshold(50000, 5), 53350);
// 100K R#5 : 103 100 + 1 750 = 104 850
test("100K R#5 threshold = 104 850", computeRewardRequestThreshold(100000, 5), 104850);
// getV1RewardThresholdUsd = alias
test("getV1RewardThresholdUsd(25000, 1) = 26 400", getV1RewardThresholdUsd(25000, 1), 26400);
test("getV1RewardThresholdUsd(100000, 1) = 103 850", getV1RewardThresholdUsd(100000, 1), 103850);
// REWARD_REQUEST_PROFIT_PCT conservé (deprecated) = 4
test("REWARD_REQUEST_PROFIT_PCT = 4 (deprecated)", REWARD_REQUEST_PROFIT_PCT, 4);

// ════════════════════════════════════════════════════════════════
// J. Qualifying day — Apex EOD : 100 / 250 / 300 USD (was 50/100/150)
// ════════════════════════════════════════════════════════════════

section("J. Qualifying day min USD — Apex EOD");
test("25K  = 100 USD (was  50)", V1_QUALIFYING_DAY_MIN_USD[25000],  100);
test("50K  = 250 USD (was 100)", V1_QUALIFYING_DAY_MIN_USD[50000],  250);
test("100K = 300 USD (was 150)", V1_QUALIFYING_DAY_MIN_USD[100000], 300);

// ════════════════════════════════════════════════════════════════
// K. Consistency Challenge — AUCUNE (Apex EOD supprime la consistency)
// ════════════════════════════════════════════════════════════════

section("K. Challenge — Apex EOD : aucune consistency (consistencyPct = 0)");
{
  // V1_CONSISTENCY_PCT.challenge n'existe plus — le Challenge Apex EOD n'a pas de consistency
  // computeV1EffectiveProfitTarget avec consistencyPct=0 → retourne toujours baseTargetPct
  const noAdjust1 = computeV1EffectiveProfitTarget(50000, 6, 1000, 0);
  test("50K Challenge (Apex): best_day 1000$ → cible = 6% (pas d'ajustement)", noAdjust1, 6);

  const noAdjust2 = computeV1EffectiveProfitTarget(50000, 6, 2000, 0);
  test("50K Challenge (Apex): best_day 2000$ → cible = 6% (pas d'ajustement)", noAdjust2, 6);

  const noAdjust3 = computeV1EffectiveProfitTarget(50000, 6, 5000, 0);
  test("50K Challenge (Apex): best_day 5000$ → cible = 6% (pas d'ajustement)", noAdjust3, 6);

  // Même une meilleure journée qui représente 99% du profit → pas d'ajustement
  const extreme = computeV1EffectiveProfitTarget(25000, 6, 1485, 0);  // ≈ 99% de 1500$
  test("25K Challenge (Apex): best_day 1485$ (99%) → cible = 6% (pas d'ajustement)", extreme, 6);
}

// ════════════════════════════════════════════════════════════════
// L. Consistency Reward = 50 % — Apex EOD (was 33 %)
// ════════════════════════════════════════════════════════════════

section("L. Consistency Reward = 50 % (Apex EOD — was 33 %)");
test("V1_CONSISTENCY_PCT.reward = 50 (was 33)", V1_CONSISTENCY_PCT.reward, 50);
{
  // 50K Reward #1 : profit requis = 4% × 50000 = 2000$. best_day = 500$ = 25% < 50% → cible inchangée
  const noAdjust = computeV1EffectiveProfitTarget(50000, 4, 500, 50);
  test("50K Reward: best_day 500$ (25%) < 50% × profit → cible = 4%", noAdjust, 4);

  // best_day = 999$ = 49.95% < 50% de 2000$ → cible inchangée
  const nearLimit = computeV1EffectiveProfitTarget(50000, 4, 999, 50);
  test("50K Reward: best_day 999$ (49.95%) < 50% → cible = 4%", nearLimit, 4);

  // best_day = 1000$ = exactement 50% de 2000$ → cible monte (règle strict <)
  // 1000 / 0.50 / 50000 × 100 = 4% → Math.max(4, 4) = 4 (exactement au seuil = cible inchangée si ≤ arrondi)
  // Précision : 1000 / 0.50 / 50000 * 100 = 4. Math.ceil(4*100)/100 = 4. max(4,4) = 4.
  const atLimit = computeV1EffectiveProfitTarget(50000, 4, 1000, 50);
  test("50K Reward: best_day 1000$ = 50% → cible = 4% (exactement au seuil)", atLimit, 4);

  // best_day = 1001$ > 50% de 2000$ → cible monte
  // 1001 / 0.50 / 50000 × 100 = 4.004 → cible = 4.01% (arrondi au centième supérieur)
  const raised = computeV1EffectiveProfitTarget(50000, 4, 1001, 50);
  test("50K Reward: best_day 1001$ > 50% → cible monte au-delà de 4%", raised > 4, true);
}

// ════════════════════════════════════════════════════════════════
// L2. Daily Loss Limit (DLL) — Apex EOD
// ════════════════════════════════════════════════════════════════

section("L2. DLL — Challenge et Reward Account (Apex EOD)");
{
  // Challenge DLL
  test("DLL Challenge 25K  =    500$", V1_DAILY_LOSS_LIMIT_CHALLENGE[25000],   500);
  test("DLL Challenge 50K  =  1 000$", V1_DAILY_LOSS_LIMIT_CHALLENGE[50000],  1000);
  test("DLL Challenge 100K =  1 500$", V1_DAILY_LOSS_LIMIT_CHALLENGE[100000], 1500);
  // Reward Account DLL
  test("DLL Reward   25K  =    500$", V1_DAILY_LOSS_LIMIT_REWARD[25000],   500);
  test("DLL Reward   50K  =  1 000$", V1_DAILY_LOSS_LIMIT_REWARD[50000],  1000);
  test("DLL Reward   100K =  1 750$", V1_DAILY_LOSS_LIMIT_REWARD[100000], 1750);
  // Helpers
  test("getV1DailyLossLimit(25000, 'challenge') = 500",    getV1DailyLossLimit(25000, "challenge"),   500);
  test("getV1DailyLossLimit(100000, 'challenge') = 1500",  getV1DailyLossLimit(100000, "challenge"), 1500);
  test("getV1DailyLossLimit(100000, 'reward') = 1750",     getV1DailyLossLimit(100000, "reward"),    1750);
  test("getV1DailyLossLimit(50000) = 1000 (default=reward)", getV1DailyLossLimit(50000),             1000);
}

// ════════════════════════════════════════════════════════════════
// M. Reward caps #1 à #5 par taille de compte
// ════════════════════════════════════════════════════════════════

section("M. Reward caps #1 à #5");
{
  // 25K
  test("25K Reward #1 cap = 300$",  getV1RewardCap(25000, 1), 300);
  test("25K Reward #2 cap = 400$",  getV1RewardCap(25000, 2), 400);
  test("25K Reward #3 cap = 500$",  getV1RewardCap(25000, 3), 500);
  test("25K Reward #4 cap = 600$",  getV1RewardCap(25000, 4), 600);
  test("25K Reward #5 cap = 750$",  getV1RewardCap(25000, 5), 750);

  // 50K
  test("50K Reward #1 cap = 500$",  getV1RewardCap(50000, 1), 500);
  test("50K Reward #2 cap = 650$",  getV1RewardCap(50000, 2), 650);
  test("50K Reward #3 cap = 800$",  getV1RewardCap(50000, 3), 800);
  test("50K Reward #4 cap = 1 000$",getV1RewardCap(50000, 4), 1000);
  test("50K Reward #5 cap = 1 250$",getV1RewardCap(50000, 5), 1250);

  // 100K
  test("100K Reward #1 cap = 750$",  getV1RewardCap(100000, 1), 750);
  test("100K Reward #2 cap = 1 000$",getV1RewardCap(100000, 2), 1000);
  test("100K Reward #3 cap = 1 250$",getV1RewardCap(100000, 3), 1250);
  test("100K Reward #4 cap = 1 500$",getV1RewardCap(100000, 4), 1500);
  test("100K Reward #5 cap = 1 750$",getV1RewardCap(100000, 5), 1750);
}

// ════════════════════════════════════════════════════════════════
// N. Level 3 — plancher fixe = capital initial
// ════════════════════════════════════════════════════════════════

section("N. Niveau 3 — plancher fixe = capital initial (Safety Net atteinte)");
test("25K  : getV1FixedFloor = 25 000",  getV1FixedFloor(25000),  25000);
test("50K  : getV1FixedFloor = 50 000",  getV1FixedFloor(50000),  50000);
test("100K : getV1FixedFloor = 100 000", getV1FixedFloor(100000), 100000);
{
  // Apex EOD : floor verrouillé quand highest ≥ Safety Net (52 100 pour 50K)
  const floorLocked50K = computeV1TrailingFloor(50000, 60000, 2000, 52100);  // highest=60K > 52 100 = locked
  test("50K floor verrouillé (highest=60K > safetyNet 52 100) = 50 000", floorLocked50K, 50000);
  // Exactement à la Safety Net
  const floorAtSN = computeV1TrailingFloor(50000, 52100, 2000, 52100);
  test("50K floor à safetyNet exacte (highest=52 100) = 50 000", floorAtSN, 50000);
}

// ════════════════════════════════════════════════════════════════
// O. Reward réellement versée déduite de la balance (pas de reset)
// ════════════════════════════════════════════════════════════════

section("O. Reward déduite de la balance — pas de reset");
{
  // 50K : balance = 52 000, reward #1 = 500, floor = 50 000
  const impact = computeRewardImpact(52000, 500, 50000);
  test("50K Reward #1 : preBalance = 52 000", impact.preBalance, 52000);
  test("50K Reward #1 : rewardAmount = 500",  impact.rewardAmount, 500);
  test("50K Reward #1 : postBalance = 51 500 (PAS de reset à 50 000)", impact.postBalance, 51500);
  test("50K Reward #1 : isValid = true",       impact.isValid, true);
  test("50K Reward #1 : bufferAfter = 1 500",  impact.bufferAfter, 1500);

  // 100K : balance = 104 000, reward #1 = 750, floor = 100 000
  const impact100k = computeRewardImpact(104000, 750, 100000);
  test("100K Reward #1 : postBalance = 103 250", impact100k.postBalance, 103250);
  test("100K Reward #1 : isValid = true",         impact100k.isValid, true);

  // Le plancher reste à start même après Reward (pas recalculé)
  test("50K : floor inchangé = 50 000 après Reward", impact.floor, 50000);
}

// ════════════════════════════════════════════════════════════════
// P. Aucune déduction automatique du cap maximum
// ════════════════════════════════════════════════════════════════

section("P. Reward disponible = min(newProfit, cap) — cap pas déduit automatiquement");
{
  // Exemple spécification 50K Reward #2 (cap = 650$)
  // Cas A : profit = 500$ < cap → reward = 500$ (limité par profit)
  const eligA = computeEligibleNewProfit(51500 + 500, 51500);  // = 500
  const resA  = computeRewardAvailable(eligA, 650);
  test("50K Cas A: eligibleNewProfit = 500", resA.eligibleNewProfit, 500);
  test("50K Cas A: rewardAvailable = 500 (limité par profit, pas par le cap 650)", resA.rewardAvailable, 500);
  test("50K Cas A: limitedByProfit = true",  resA.limitedByProfit, true);
  test("50K Cas A: limitedByCap = false",    resA.limitedByCap, false);

  // Cas C : profit = 900$ > cap 650$ → reward = 650$ (limité par le cap)
  const eligC = computeEligibleNewProfit(51500 + 900, 51500);  // = 900
  const resC  = computeRewardAvailable(eligC, 650);
  test("50K Cas C: eligibleNewProfit = 900", resC.eligibleNewProfit, 900);
  test("50K Cas C: rewardAvailable = 650 (limité par le cap)", resC.rewardAvailable, 650);
  test("50K Cas C: limitedByCap = true",  resC.limitedByCap, true);
  test("50K Cas C: limitedByProfit = false", resC.limitedByProfit, false);

  // Après versement de 650$ : les 250$ restants restent sur le compte
  const impactC = computeRewardImpact(51500 + 900, 650, 50000);
  test("50K Cas C: postBalance = 51750 (250$ surplus conservé)", impactC.postBalance, 51750);
}

// ════════════════════════════════════════════════════════════════
// Q. getTraderV1Level() — Niveaux runtime + terminaison parcours
// ════════════════════════════════════════════════════════════════

section("Q. getTraderV1Level() — Dérivation des 3 niveaux V1 et terminaison");
{
  // ── A. STARTER — challenge en cours (phase ≠ "funded") ───────
  const levA = getTraderV1Level("phase1", 0);
  test("A — STARTER : level = 1",            levA.level,            1);
  test("A — STARTER : key",                  levA.key,              "STARTER");
  test("A — STARTER : nextRewardNumber null", levA.nextRewardNumber, null);
  test("A — STARTER : terminated = false",   levA.terminated,       false);

  // ── B. REWARD START — Reward Account actif, Reward #1 non payée ──
  const levB = getTraderV1Level("funded", 0);
  test("B — REWARD START : level = 2",          levB.level,            2);
  test("B — REWARD START : key",                levB.key,              "REWARD_START");
  test("B — REWARD START : nextRewardNumber=1", levB.nextRewardNumber, 1);
  test("B — REWARD START : terminated=false",   levB.terminated,       false);

  // ── C. Après R#1 payée → nextRewardNumber = 2 ────────────────
  const levC = getTraderV1Level("funded", 1);
  test("C — après R#1 : level = 3",             levC.level,            3);
  test("C — après R#1 : key = TRADER_REWARD",   levC.key,              "TRADER_REWARD");
  test("C — après R#1 : nextRewardNumber = 2",  levC.nextRewardNumber, 2);
  test("C — après R#1 : terminated = false",    levC.terminated,       false);

  // ── D. Après R#1 + R#2 payées → nextRewardNumber = 3 ─────────
  const levD = getTraderV1Level("funded", 2);
  test("D — après R#1+R#2 : nextReward = 3",   levD.nextRewardNumber, 3);
  test("D — après R#1+R#2 : terminated false", levD.terminated,       false);

  // ── E. Après R#1–R#4 payées → nextRewardNumber = 5 ──────────
  const levE = getTraderV1Level("funded", 4);
  test("E — après R#1-R#4 : nextReward = 5",   levE.nextRewardNumber, 5);
  test("E — après R#1-R#4 : terminated false", levE.terminated,       false);

  // ── F. Après R#1–R#5 payées → parcours terminé ───────────────
  const levF = getTraderV1Level("funded", 5);
  test("F — après R#1-R#5 : level = 3",         levF.level,            3);
  test("F — terminé = true",                     levF.terminated,       true);
  test("F — nextRewardNumber = null",            levF.nextRewardNumber, null);

  // ── Cas limites et incohérences défensives ────────────────────
  // paidCount > 5 (impossible en prod, mais le moteur doit rester stable)
  const levExtra = getTraderV1Level("funded", 6);
  test("Incoh. paidCount=6 → terminated",     levExtra.terminated,       true);
  test("Incoh. paidCount=6 → nextNull",        levExtra.nextRewardNumber, null);

  // Phase "failed" → STARTER (pas en Reward Account)
  const levFailed = getTraderV1Level("failed", 0);
  test("Phase failed → STARTER level 1",       levFailed.level, 1);
  test("Phase failed → key STARTER",           levFailed.key,   "STARTER");

  // Phase "challenge" (V1 en cours, avant funded) → STARTER
  const levChallenge = getTraderV1Level("challenge", 0);
  test("Phase challenge → STARTER level 1",    levChallenge.level, 1);

  // Constante V1_MAX_REWARDS = 5
  test("V1_MAX_REWARDS = 5",                   V1_MAX_REWARDS, 5);
}

// ════════════════════════════════════════════════════════════════
// Résumé
// ════════════════════════════════════════════════════════════════

console.log(`\n${"═".repeat(60)}`);
const color = failed === 0 ? GREEN : RED;
const mark  = failed === 0 ? "✅" : "❌";
console.log(`  ${color}${BOLD}${mark} ${passed}/${passed + failed} tests PASS${RESET}  |  ${failed} failed`);
if (failed === 0) {
  console.log(`  ${GREEN}${BOLD}Moteur V1 validé — tous les invariants métier sont respectés.${RESET}`);
} else {
  console.log(`  ${RED}${BOLD}Des tests échouent — corriger avant de déployer.${RESET}`);
}
console.log(`${"═".repeat(60)}\n`);
if (failed > 0) process.exit(1);
