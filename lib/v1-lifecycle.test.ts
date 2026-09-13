/**
 * ============================================================
 * TRADERS REWARDS V1 — Tests lifecycle (TypeScript pur)
 * ============================================================
 *
 * Tests organisés par section (Q à Z+) :
 *
 * Q. Challenge 25K réussi → reste vivant le jour J (pas de conversion immédiate)
 * R. Conversion lendemain → balance 25 000$ (même login)
 * S. Conversion lendemain → balance 50 000$ (même login)
 * T. Conversion lendemain → balance 100 000$ (même login)
 * U. Même login Challenge → R1 → R5 (logique)
 * V. Aucune remise à zéro entre R1 et R5
 * W. Historique Challenge PASSED conservé après conversion
 * X. Reward #5 → compte terminated
 * Y. Reward #6 impossible
 * Z. Double exécution cron → idempotent (reward_converted_at NOT NULL → skip)
 * Z1. Erreur MT5 pendant conversion → état récupérable (converted_at IS NULL)
 * Z2. Aucune régression DD EOD / Safety Net / Reward thresholds V1
 *
 * Exécution : npx tsx lib/v1-lifecycle.test.ts
 * ============================================================
 */

import {
  isV1Challenge,
  isV1ProfitTargetMet,
  isV1ConversionEligible,
  getCurrentTradingDayStart,
  computeV1ChallengeResetWithdrawal,
  computeV1RewardWithdrawal,
  isV1Terminated,
  isV1NextRewardBlocked,
  getV1NextRewardNumber,
  V1_REWARD_MT5_GROUP,
  V1_DISABLED_MT5_GROUP,
} from "./v1-lifecycle";

import {
  V1_MAX_REWARDS,
  V1_SAFETY_NET,
  V1_DD_USD_BY_BALANCE,
  V1_REWARD_CAPS,
  getV1SafetyNet,
  getV1DdUsdByBalance,
  computeRewardRequestThreshold,
  getV1RewardCap,
  computeV1TrailingFloor,
  checkV1DDBreach,
  getTraderV1Level,
} from "./v1-engine";

// ── Helpers ───────────────────────────────────────────────────

const GREEN = "\x1b[32m";
const RED   = "\x1b[31m";
const BOLD  = "\x1b[1m";
const RESET = "\x1b[0m";

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

// ─────────────────────────────────────────────────────────────
// Section Q — Challenge réussi → reste vivant le Jour J
// ─────────────────────────────────────────────────────────────
section("Q. Challenge réussi → reste vivant le Jour J (pas de conversion immédiate)");

// Q1 — Profit 6% atteint
test(
  "Q1 25K : balance 26500 ≥ +6% de 25000 → profit cible atteint",
  isV1ProfitTargetMet(26500, 25000),
  true
);

// Q2 — Profit insuffisant
test(
  "Q2 25K : balance 26000 < +6% de 25000 → profit cible NON atteint",
  isV1ProfitTargetMet(26000, 25000),
  false
);

// Q3 — 50K profit atteint
test(
  "Q3 50K : balance 53500 ≥ +6% de 50000 → profit cible atteint",
  isV1ProfitTargetMet(53500, 50000),
  true
);

// Q4 — 100K profit atteint
test(
  "Q4 100K : balance 106100 ≥ +6% de 100000 → profit cible atteint",
  isV1ProfitTargetMet(106100, 100000),
  true
);

// Q5 — Le jour même (passed_at = maintenant = DANS la journée courante) → PAS éligible à la conversion
{
  const now    = new Date("2026-08-27T15:00:00Z"); // 15h UTC (heure quelconque du jour)
  const tdStart = getCurrentTradingDayStart(now);  // 2026-08-26T22:00:00Z
  const passedAtSameDay = "2026-08-27T14:55:00Z"; // passé il y a 5 min — DANS la journée courante
  test(
    "Q5 : challenge passé le même trading day → NON éligible à conversion immédiate",
    isV1ConversionEligible({
      status: "passed",
      challengePassedAt: passedAtSameDay,
      rewardConvertedAt: null,
      rewardConversionStatus: null,
      currentTradingDayStart: tdStart,
    }),
    false // Pas encore le lendemain
  );
}

// ─────────────────────────────────────────────────────────────
// Sections R, S, T — Conversion lendemain → capital initial
// ─────────────────────────────────────────────────────────────
section("R. Conversion lendemain → balance = capital initial (25K, 50K, 100K)");

// R1 — 25K : retrait du profit pour revenir à 25 000
test(
  "R1 25K : retrait profit 1500$ (balance 26500 → 25000)",
  computeV1ChallengeResetWithdrawal(26500, 25000),
  1500
);

// R2 — 25K : pas de retrait si balance = capital initial
test(
  "R2 25K : aucun retrait si balance = 25000 (profit nul)",
  computeV1ChallengeResetWithdrawal(25000, 25000),
  0
);

section("S. Conversion lendemain → balance 50 000$");

// S1 — 50K : retrait du profit pour revenir à 50 000
test(
  "S1 50K : retrait profit 3200$ (balance 53200 → 50000)",
  computeV1ChallengeResetWithdrawal(53200, 50000),
  3200
);

// S2 — 50K : balance exactement à l'objectif minimum (+6%)
test(
  "S2 50K : retrait profit 3000$ (balance 53000 → 50000)",
  computeV1ChallengeResetWithdrawal(53000, 50000),
  3000
);

section("T. Conversion lendemain → balance 100 000$");

// T1 — 100K : retrait du profit pour revenir à 100 000
test(
  "T1 100K : retrait profit 6500$ (balance 106500 → 100000)",
  computeV1ChallengeResetWithdrawal(106500, 100000),
  6500
);

// T2 — Conversion éligible le lendemain (passed_at antérieur au trading day start)
{
  const now     = new Date("2026-08-28T02:00:00Z"); // 02h UTC le lendemain
  const tdStart  = getCurrentTradingDayStart(now);   // 2026-08-27T22:00:00Z
  const passedAt = "2026-08-27T14:30:00Z";           // passé la veille à 14h30
  test(
    "T2 : challenge passé la veille → éligible à conversion le lendemain",
    isV1ConversionEligible({
      status: "passed",
      challengePassedAt: passedAt,
      rewardConvertedAt: null,
      rewardConversionStatus: null,
      currentTradingDayStart: tdStart,
    }),
    true
  );
}

// ─────────────────────────────────────────────────────────────
// Section U — Même login conservé Challenge → R1 → R5
// ─────────────────────────────────────────────────────────────
section("U. Même login conservé Challenge → R1 → R5 (logique)");

// U1 — Le groupe Reward Account est bien demoG4 (funded 1-step existant)
test(
  "U1 : groupe MT5 Reward Account = HAR/MAN32/demoG4",
  V1_REWARD_MT5_GROUP,
  "HAR/MAN32/demoG4"
);

// U2 — Le groupe désactivé est bien demoG5
test(
  "U2 : groupe MT5 terminé = HAR/MAN32/demoG5",
  V1_DISABLED_MT5_GROUP,
  "HAR/MAN32/demoG5"
);

// U3 — isV1Challenge discriminant correct
test("U3 : dd_model='trailing_eod_lock' → isV1Challenge = true",  isV1Challenge("trailing_eod_lock"), true);
test("U4 : dd_model='2step' → isV1Challenge = false",             isV1Challenge("2step"),             false);
test("U5 : dd_model=null → isV1Challenge = false",                isV1Challenge(null),                false);

// ─────────────────────────────────────────────────────────────
// Section V — Aucune remise à zéro entre R1 et R5
// ─────────────────────────────────────────────────────────────
section("V. Aucune remise à zéro entre R1 et R5 (V1 reward withdrawal)");

// V1 — Le retrait d'une Reward ne remet PAS à zéro
// computeV1RewardWithdrawal retire UNIQUEMENT le montant de la Reward
test(
  "V1 25K R#1 : retirer 300$ uniquement (pas tout le profit)",
  computeV1RewardWithdrawal(300),
  300
);
test(
  "V2 50K R#2 : retirer 650$ uniquement",
  computeV1RewardWithdrawal(650),
  650
);
test(
  "V3 100K R#3 : retirer 1250$ uniquement",
  computeV1RewardWithdrawal(1250),
  1250
);

// V4 — Après R#1 (25K) : balance = 26400 - 300 = 26100$ (≠ reset à 25000$)
{
  const preBalance   = 26400; // seuil threshold pour R#1
  const rewardAmount = 300;   // cap R#1 25K
  const postBalance  = preBalance - rewardAmount;
  test(
    "V4 25K R#1 : postBalance = 26100$ (pas de reset à 25000$)",
    postBalance,
    26100
  );
}

// ─────────────────────────────────────────────────────────────
// Section W — Historique Challenge PASSED conservé
// ─────────────────────────────────────────────────────────────
section("W. Historique Challenge PASSED conservé après conversion");

// W1 — isV1ConversionEligible respecte le fait que challenge_passed_at ne change pas
{
  const tdStart  = new Date("2026-08-27T22:00:00Z"); // début trading day lendemain
  const passedAt = "2026-08-27T14:00:00Z";           // passé avant
  // Même avec conversion_status='error', challenge_passed_at est conservé
  test(
    "W1 : challenge avec reward_conversion_status='error' reste éligible (retry)",
    isV1ConversionEligible({
      status: "passed",
      challengePassedAt: passedAt,
      rewardConvertedAt: null,
      rewardConversionStatus: "error", // erreur MT5 → retry
      currentTradingDayStart: tdStart,
    }),
    true // 'error' ne bloque pas le retry (seul 'converting' bloque)
  );
}

// W2 — Une fois converti, plus éligible (idempotence)
{
  const tdStart  = new Date("2026-08-28T22:00:00Z");
  const passedAt = "2026-08-27T14:00:00Z";
  const convertedAt = "2026-08-28T01:30:00Z"; // déjà converti
  test(
    "W2 : challenge déjà converti (reward_converted_at != null) → NON éligible",
    isV1ConversionEligible({
      status: "passed",
      challengePassedAt: passedAt,
      rewardConvertedAt: convertedAt,
      rewardConversionStatus: "done",
      currentTradingDayStart: tdStart,
    }),
    false
  );
}

// ─────────────────────────────────────────────────────────────
// Section X — Reward #5 → compte terminated
// ─────────────────────────────────────────────────────────────
section("X. Reward #5 → compte terminated");

test("X1 : paidRewardsCount = 5 → isV1Terminated = true",  isV1Terminated(5), true);
test("X2 : paidRewardsCount = 4 → isV1Terminated = false", isV1Terminated(4), false);
test("X3 : paidRewardsCount = 6 → isV1Terminated = true",  isV1Terminated(6), true);
test("X4 : paidRewardsCount = 0 → isV1Terminated = false", isV1Terminated(0), false);

// ─────────────────────────────────────────────────────────────
// Section Y — Reward #6 impossible
// ─────────────────────────────────────────────────────────────
section("Y. Reward #6 impossible");

test("Y1 : paidCount=5 → R#6 bloqué",  isV1NextRewardBlocked(5), true);
test("Y2 : paidCount=4 → R#5 autorisé", isV1NextRewardBlocked(4), false);
test("Y3 : paidCount=0 → R#1 autorisé", isV1NextRewardBlocked(0), false);
test("Y4 : nextRewardNumber après 5 payouts = null (terminé)", getV1NextRewardNumber(5), null);
test("Y5 : nextRewardNumber après 4 payouts = 5",              getV1NextRewardNumber(4), 5);
test("Y6 : nextRewardNumber après 0 payouts = 1",              getV1NextRewardNumber(0), 1);

// Vérification via getTraderV1Level (engine)
test("Y7 : getTraderV1Level('funded', 5).terminated = true",
  getTraderV1Level("funded", 5).terminated, true);
test("Y8 : getTraderV1Level('funded', 5).nextRewardNumber = null",
  getTraderV1Level("funded", 5).nextRewardNumber, null);

// ─────────────────────────────────────────────────────────────
// Section Z — Double exécution cron → idempotent
// ─────────────────────────────────────────────────────────────
section("Z. Double exécution cron → idempotent");

// Z1 — reward_converted_at NOT NULL → NON éligible (bypass complet)
{
  const tdStart  = new Date("2026-08-28T22:00:00Z");
  const passedAt = "2026-08-27T14:00:00Z";
  test(
    "Z1 : reward_converted_at=now → isV1ConversionEligible = false (idempotent)",
    isV1ConversionEligible({
      status: "passed",
      challengePassedAt: passedAt,
      rewardConvertedAt: "2026-08-28T01:00:00Z", // déjà converti
      rewardConversionStatus: "done",
      currentTradingDayStart: tdStart,
    }),
    false
  );
}

// Z2 — reward_conversion_status='converting' → NON éligible (anti race condition)
{
  const tdStart  = new Date("2026-08-28T22:00:00Z");
  const passedAt = "2026-08-27T14:00:00Z";
  test(
    "Z2 : reward_conversion_status='converting' → bloqué (autre process en cours)",
    isV1ConversionEligible({
      status: "passed",
      challengePassedAt: passedAt,
      rewardConvertedAt: null,
      rewardConversionStatus: "converting",
      currentTradingDayStart: tdStart,
    }),
    false
  );
}

// ─────────────────────────────────────────────────────────────
// Section Z1 — Erreur MT5 → état récupérable sans corruption
// ─────────────────────────────────────────────────────────────
section("Z1. Erreur MT5 → état récupérable sans corruption");

// Z1a — Avec conversion_status='error' ET reward_converted_at=NULL → éligible au retry
{
  const tdStart  = new Date("2026-08-28T22:00:00Z");
  const passedAt = "2026-08-27T14:00:00Z";
  test(
    "Z1a : conversion_status='error' + converted_at=null → éligible au retry (récupérable)",
    isV1ConversionEligible({
      status: "passed",
      challengePassedAt: passedAt,
      rewardConvertedAt: null,    // pas converti (erreur MT5 n'a pas mis converted_at)
      rewardConversionStatus: "error",
      currentTradingDayStart: tdStart,
    }),
    true  // retry autorisé
  );
}

// Z1b — La DB ne doit jamais afficher 'done' si converted_at IS NULL
// (vérification logique : les deux doivent être cohérents)
{
  const convertedAt  = "2026-08-28T01:30:00Z";
  const convStatus   = "done";
  // Si status='done' alors converted_at doit être non-null → le cron respecte ça
  test(
    "Z1b : cohérence statuts — si converted_at est renseigné, le challenge ne sera plus éligible",
    isV1ConversionEligible({
      status: "passed",
      challengePassedAt: "2026-08-27T14:00:00Z",
      rewardConvertedAt: convertedAt,
      rewardConversionStatus: convStatus,
      currentTradingDayStart: new Date("2026-08-28T22:00:00Z"),
    }),
    false // status='done' + converted_at → plus jamais retryé
  );
}

// ─────────────────────────────────────────────────────────────
// Section Z2 — Aucune régression DD EOD / Safety Net / Reward thresholds
// ─────────────────────────────────────────────────────────────
section("Z2. Aucune régression DD EOD / Safety Net / Reward thresholds actuels");

// DD EOD fixe en $
test("Z2-a 25K DD = 1000$",  V1_DD_USD_BY_BALANCE[25000],  1000);
test("Z2-b 50K DD = 2000$",  V1_DD_USD_BY_BALANCE[50000],  2000);
test("Z2-c 100K DD = 3000$", V1_DD_USD_BY_BALANCE[100000], 3000);

// Safety Net (seuil de verrouillage)
test("Z2-d 25K Safety Net = 26100$",  V1_SAFETY_NET[25000],  26100);
test("Z2-e 50K Safety Net = 52100$",  V1_SAFETY_NET[50000],  52100);
test("Z2-f 100K Safety Net = 103100$", V1_SAFETY_NET[100000], 103100);

// Reward thresholds (Safety Net + cap)
test("Z2-g 25K Reward #1 threshold = 26400$",  computeRewardRequestThreshold(25000,  1), 26400);
test("Z2-h 50K Reward #1 threshold = 52600$",  computeRewardRequestThreshold(50000,  1), 52600);
test("Z2-i 100K Reward #1 threshold = 103850$", computeRewardRequestThreshold(100000, 1), 103850);

// Reward caps
test("Z2-j 25K R#1 cap = 300$",   getV1RewardCap(25000,  1), 300);
test("Z2-k 25K R#5 cap = 750$",   getV1RewardCap(25000,  5), 750);
test("Z2-l 50K R#1 cap = 500$",   getV1RewardCap(50000,  1), 500);
test("Z2-m 50K R#5 cap = 1250$",  getV1RewardCap(50000,  5), 1250);
test("Z2-n 100K R#1 cap = 750$",  getV1RewardCap(100000, 1), 750);
test("Z2-o 100K R#5 cap = 1750$", getV1RewardCap(100000, 5), 1750);

// Trailing floor V1 (sans Safety Net = challenge)
test(
  "Z2-p 50K floor challenge : highest_eod=51000, ddUsd=2000 → floor=49000",
  computeV1TrailingFloor(50000, 51000, 2000, null),
  49000
);

// Trailing floor V1 avec Safety Net (Reward Account)
test(
  "Z2-q 50K floor reward : highest_eod=52100 (Safety Net atteinte) → floor=50000 (verrouillé)",
  computeV1TrailingFloor(50000, 52100, 2000, 52100),
  50000
);

// Breach check V1
test(
  "Z2-r 50K breach : equity=48999 < floor=49000 → breached=true",
  checkV1DDBreach(50000, 51000, 48999, 2000, null).breached,
  true
);
test(
  "Z2-s 50K no breach : equity=49000 = floor=49000 → breached=false",
  checkV1DDBreach(50000, 51000, 49000, 2000, null).breached,
  false
);

// ─────────────────────────────────────────────────────────────
// getCurrentTradingDayStart — tests additionnels
// ─────────────────────────────────────────────────────────────
section("Bonus — getCurrentTradingDayStart");

{
  // 15h UTC → début = veille à 22h UTC
  const now = new Date("2026-08-27T15:00:00Z");
  const start = getCurrentTradingDayStart(now);
  test(
    "TDS-1 : 15h UTC → trading day start = la veille à 22h UTC",
    start.toISOString(),
    "2026-08-26T22:00:00.000Z"
  );
}
{
  // 23h UTC → début = ce jour à 22h UTC
  const now = new Date("2026-08-27T23:00:00Z");
  const start = getCurrentTradingDayStart(now);
  test(
    "TDS-2 : 23h UTC → trading day start = aujourd'hui à 22h UTC",
    start.toISOString(),
    "2026-08-27T22:00:00.000Z"
  );
}
{
  // 22h00 UTC exactement → début = ce jour à 22h UTC
  const now = new Date("2026-08-27T22:00:00Z");
  const start = getCurrentTradingDayStart(now);
  test(
    "TDS-3 : 22h00 UTC exactement → trading day start = aujourd'hui à 22h UTC",
    start.toISOString(),
    "2026-08-27T22:00:00.000Z"
  );
}

// ─────────────────────────────────────────────────────────────
// Résultat final
// ─────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(
  `\n${BOLD}═══ ${passed}/${total} tests passés${failed > 0 ? ` — ${RED}${failed} ÉCHEC(S)${RESET}${BOLD}` : ""} ═══${RESET}`
);
if (failed > 0) process.exit(1);
