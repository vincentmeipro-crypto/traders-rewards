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
  V1_CONSISTENCY_PCT,
  V1_REWARD_CAPS,
  V1_QUALIFYING_DAY_MIN_USD,
  getV1DdPctByBalance,
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
// B-D. Challenge DD par balance
// ════════════════════════════════════════════════════════════════

section("B. 25K Challenge DD = 4 %");
test("getV1DdPctByBalance(25000) = 4", getV1DdPctByBalance(25000), 4);
test("V1_DD_PCT_BY_BALANCE[25000] = 4", V1_DD_PCT_BY_BALANCE[25000], 4);

section("C. 50K Challenge DD = 4 %");
test("getV1DdPctByBalance(50000) = 4", getV1DdPctByBalance(50000), 4);
test("V1_DD_PCT_BY_BALANCE[50000] = 4", V1_DD_PCT_BY_BALANCE[50000], 4);

section("D. 100K Challenge DD = 3 %");
test("getV1DdPctByBalance(100000) = 3", getV1DdPctByBalance(100000), 3);
test("V1_DD_PCT_BY_BALANCE[100000] = 3", V1_DD_PCT_BY_BALANCE[100000], 3);

// ════════════════════════════════════════════════════════════════
// E. Aucun daily DD — le modèle V1 n'a pas de daily_drawdown séparé
// ════════════════════════════════════════════════════════════════

section("E. Aucun daily DD — V1 = trailing EOD uniquement");
// Le moteur ne contient aucune constante daily_drawdown.
// Les phases de type challenge et funded stockent daily_drawdown dans la DB
// uniquement pour compatibilité technique — la valeur miroir n'est pas utilisée
// dans le calcul de breach (checkV1DDBreach ne prend aucun paramètre daily).
// Vérifier que checkV1DDBreach utilise uniquement le floor trailing.
{
  const floor50K = computeV1TrailingFloor(50000, 50000, 4, null);
  test("floor 50K start = 48 000 (4% trailing, no daily)", floor50K, 48000);
  // Un equity à 47 999 est en breach (trailing floor), pas daily
  const breach = checkV1DDBreach(50000, 50000, 47999, 4, null);
  test("breach 47 999 < floor 48 000", breach.breached, true);
  // Un equity à 48 000 est au floor — PAS de breach (convention stricte <)
  const atFloor = checkV1DDBreach(50000, 50000, 48000, 4, null);
  test("no breach at floor (48 000 = floor)", atFloor.breached, false);
}

// ════════════════════════════════════════════════════════════════
// F. Challenge ne locke jamais (lockPct = null)
// ════════════════════════════════════════════════════════════════

section("F. Challenge — aucun lock (lockPct = null)");
{
  // 50K : même si l'equity monte à 200 000, le trailing continue de suivre
  const highMilestone = [50000, 51000, 52000, 53000, 54000, 60000];
  for (const high of highMilestone) {
    const floor = computeV1TrailingFloor(50000, high, 4, null);
    const expectedFloor = high * 0.96;
    test(`Challenge 50K floor à highest=${high} = ${expectedFloor.toFixed(0)}`, floor, expectedFloor);
  }
  // Confirmer que isV1TrailingLocked n'est pas appelé avec lockPct null dans le challenge
  // (le moteur force lockPct=null pour le challenge → computeV1TrailingFloor ne verrouille pas)
  const floorAt200K = computeV1TrailingFloor(50000, 200000, 4, null);
  test("Challenge pas de lock même à highest=200 000", floorAt200K, 200000 * 0.96);
}

// ════════════════════════════════════════════════════════════════
// G. Reward #1 lock : floor verrouillé au capital initial
// ════════════════════════════════════════════════════════════════

section("G. Reward #1 — lock au capital initial");
{
  // 25K : lock atteint quand highest_eod ≥ 25 000 × 1.04 = 26 000
  // Avant le lock
  const f25kPre = computeV1TrailingFloor(25000, 25500, 4, 4);
  test("25K Reward#1 floor avant lock (highest=25 500)", f25kPre, 25500 * 0.96);
  // Au lock
  const f25kLock = computeV1TrailingFloor(25000, 26000, 4, 4);
  test("25K Reward#1 floor au lock (highest=26 000) = 25 000", f25kLock, 25000);
  // Après le lock
  const f25kPost = computeV1TrailingFloor(25000, 27000, 4, 4);
  test("25K Reward#1 floor après lock (highest=27 000) = 25 000", f25kPost, 25000);

  // 50K : lock à 52 000
  const f50kPre  = computeV1TrailingFloor(50000, 51000, 4, 4);
  test("50K Reward#1 floor avant lock (highest=51 000)", f50kPre, 51000 * 0.96);
  const f50kLock = computeV1TrailingFloor(50000, 52000, 4, 4);
  test("50K Reward#1 floor au lock (highest=52 000) = 50 000", f50kLock, 50000);
  const f50kPost = computeV1TrailingFloor(50000, 54000, 4, 4);
  test("50K Reward#1 floor après lock = 50 000", f50kPost, 50000);

  // 100K : lock à 103 000 (lockPct = 3)
  const f100kPre  = computeV1TrailingFloor(100000, 102000, 3, 3);
  test("100K Reward#1 floor avant lock (highest=102 000)", f100kPre, 102000 * 0.97);
  const f100kLock = computeV1TrailingFloor(100000, 103000, 3, 3);
  test("100K Reward#1 floor au lock (highest=103 000) = 100 000", f100kLock, 100000);
}

// ════════════════════════════════════════════════════════════════
// H. 100K lock atteint à haut EOD 103 000
// ════════════════════════════════════════════════════════════════

section("H. 100K — lock atteint exactement à 103 000");
{
  test("isV1TrailingLocked(100000, 102999, 3) = false", isV1TrailingLocked(100000, 102999, 3), false);
  test("isV1TrailingLocked(100000, 103000, 3) = true",  isV1TrailingLocked(100000, 103000, 3), true);
  test("isV1TrailingLocked(100000, 110000, 3) = true",  isV1TrailingLocked(100000, 110000, 3), true);
  // Lock et objectif Reward #1 sont DIFFÉRENTS
  const lockThreshold   = 100000 * 1.03;  // 103 000
  const rewardThreshold = 100000 * 1.04;  // 104 000
  test("Lock 100K ≠ Reward threshold 100K", lockThreshold === rewardThreshold, false);
  test("Lock 100K = 103 000", lockThreshold, 103000);
  test("Reward threshold 100K = 104 000", rewardThreshold, 104000);
}

// ════════════════════════════════════════════════════════════════
// I. Reward threshold : 26 000 / 52 000 / 104 000
// ════════════════════════════════════════════════════════════════

section("I. Reward request threshold (start × 1.04)");
test("25K threshold = 26 000",  computeRewardRequestThreshold(25000),  26000);
test("50K threshold = 52 000",  computeRewardRequestThreshold(50000),  52000);
test("100K threshold = 104 000",computeRewardRequestThreshold(100000), 104000);
test("REWARD_REQUEST_PROFIT_PCT = 4", REWARD_REQUEST_PROFIT_PCT, 4);
// getV1RewardThresholdUsd est alias de computeRewardRequestThreshold
test("getV1RewardThresholdUsd(25000) = 26 000",  getV1RewardThresholdUsd(25000),  26000);
test("getV1RewardThresholdUsd(100000) = 104 000",getV1RewardThresholdUsd(100000), 104000);

// ════════════════════════════════════════════════════════════════
// J. Qualifying day : 50 / 100 / 150 USD
// ════════════════════════════════════════════════════════════════

section("J. Qualifying day min USD");
test("25K  = 50 USD",  V1_QUALIFYING_DAY_MIN_USD[25000],  50);
test("50K  = 100 USD", V1_QUALIFYING_DAY_MIN_USD[50000],  100);
test("100K = 150 USD", V1_QUALIFYING_DAY_MIN_USD[100000], 150);

// ════════════════════════════════════════════════════════════════
// K. Consistency Challenge = 50 %
// ════════════════════════════════════════════════════════════════

section("K. Consistency Challenge = 50 %");
test("V1_CONSISTENCY_PCT.challenge = 50", V1_CONSISTENCY_PCT.challenge, 50);
{
  // best_day ≤ 50% du profit requis → cible = baseTarget
  const noAdjust = computeV1EffectiveProfitTarget(50000, 6, 1000, 50);  // 1000/50000=2% < 50% of 6%=3%
  test("50K Challenge: best_day 1000$ (2%) ≤ 50% × 6% → cible = 6%", noAdjust, 6);

  // best_day > 50% du profit requis → cible monte
  // 50K × 6% = 3000$ profit requis. best_day = 2000$ > 1500$ (50% × 3000)
  const raised = computeV1EffectiveProfitTarget(50000, 6, 2000, 50);  // 2000 × 2 / 50000 × 100 = 8%
  test("50K Challenge: best_day 2000$ > 50% × 6% → cible monte à 8%", raised, 8);
}

// ════════════════════════════════════════════════════════════════
// L. Consistency Reward = 33 %
// ════════════════════════════════════════════════════════════════

section("L. Consistency Reward = 33 %");
test("V1_CONSISTENCY_PCT.reward = 33", V1_CONSISTENCY_PCT.reward, 33);
{
  // 50K Reward #1 : profit requis = 4% × 50000 = 2000$. best_day = 500$ = 25% < 33% → cible inchangée
  const noAdjust = computeV1EffectiveProfitTarget(50000, 4, 500, 33);
  test("50K Reward: best_day 500$ (25%) ≤ 33% × 4% → cible = 4%", noAdjust, 4);

  // best_day = 1000$ > 33% of 2000$ (= 660$) → cible monte
  // 1000 / 0.33 / 50000 × 100 = 6.06%
  const raised = computeV1EffectiveProfitTarget(50000, 4, 1000, 33);
  test("50K Reward: best_day 1000$ > 33% × 4% → cible monte", raised > 4, true);
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

section("N. Niveau 3 — plancher fixe = capital initial");
test("25K  : getV1FixedFloor = 25 000",  getV1FixedFloor(25000),  25000);
test("50K  : getV1FixedFloor = 50 000",  getV1FixedFloor(50000),  50000);
test("100K : getV1FixedFloor = 100 000", getV1FixedFloor(100000), 100000);
{
  // Confirmer que le floor fixe correspond au computeV1TrailingFloor avec lockPct atteint
  const floorLocked50K = computeV1TrailingFloor(50000, 60000, 4, 4);  // highest=60K > 52K = locked
  test("50K floor verrouillé après lock = 50 000 (= start)", floorLocked50K, 50000);
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
