/**
 * ============================================================
 * Tests — V1 Display Helpers (lib/v1-display.ts)
 * ============================================================
 * Fonctions pures de présentation : labels, valeurs numériques,
 * textes affichés dans l'UI admin et le cockpit trader.
 *
 * Sections :
 *  A. isV1Product — détection du modèle V1
 *  B. getV1LevelLabel — label de niveau V1
 *  C. getV1DdUsd / getV1DdDisplay — DD EOD fixe $
 *  D. getV1SafetyNetUsd / getV1SafetyNetDisplay — Safety Net
 *  E. getV1RewardThresholdUsd — seuil de déclenchement Reward
 *  F. getV1RewardCapDisplay — plafond du Reward
 *  G. getV1QualDayUsd / getV1QualDayDisplay — jour qualifiant
 *  H. getV1ConsistencyDisplay — règle de consistance
 *  I. Constantes exportées
 *
 * Exécution : npx tsx lib/v1-display.test.ts
 * (Pas de framework — assertions manuelles, exit(1) si un test échoue)
 * ============================================================
 */

import {
  isV1Product,
  getV1LevelLabel,
  getV1DdDisplay,
  getV1DdUsd,
  getV1SafetyNetDisplay,
  getV1SafetyNetUsd,
  getV1RewardThresholdDisplay,
  getV1RewardThresholdUsd,
  getV1RewardCapDisplay,
  getV1QualDayDisplay,
  getV1QualDayUsd,
  getV1ConsistencyDisplay,
  V1_QUAL_DAYS_MIN,
  V1_CHALLENGE_MIN_DAYS,
  V1_CHALLENGE_MAX_DAYS,
  V1_CHALLENGE_PROFIT_PCT,
  V1_REWARD_PROFIT_PCT,
  V1_MAX,
} from "./v1-display";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function testTrue(label: string, val: boolean) {
  test(label, val, true);
}

function testContains(label: string, haystack: string, needle: string) {
  const ok = haystack.includes(needle);
  if (ok) {
    console.log(`  ${GREEN}✅ PASS${RESET}  ${label}`);
    passed++;
  } else {
    console.log(`  ${RED}❌ FAIL${RESET}  ${label} (manque "${needle}" dans "${haystack}")`);
    failed++;
  }
}

function section(title: string) {
  console.log(`\n${BOLD}── ${title} ──${RESET}`);
}

// ═══════════════════════════════════════════════════════════════
// A. isV1Product — détection du modèle V1
// ═══════════════════════════════════════════════════════════════

section("A. isV1Product");

test("trailing_eod_lock → true",   isV1Product("trailing_eod_lock"), true);
test("null → false",               isV1Product(null),                false);
test("undefined → false",          isV1Product(undefined),           false);
test("'' → false",                 isV1Product(""),                  false);
test("trailing_balance → false",   isV1Product("trailing_balance"),  false);
test("2step → false",              isV1Product("2step"),             false);

// ═══════════════════════════════════════════════════════════════
// B. getV1LevelLabel — label de niveau V1
// ═══════════════════════════════════════════════════════════════

section("B. getV1LevelLabel");

// Challenge
test("phase1 / 0 rewards  → Challenge",        getV1LevelLabel("phase1", 0), "Challenge");
test("phase1 / 3 rewards  → Challenge",        getV1LevelLabel("phase1", 3), "Challenge");  // paidCount ignoré en challenge

// Rewards 1→5
test("funded / 0 rewards  → Reward #1",        getV1LevelLabel("funded", 0), "Reward #1");
test("funded / 1 reward   → Reward #2",        getV1LevelLabel("funded", 1), "Reward #2");
test("funded / 2 rewards  → Reward #3",        getV1LevelLabel("funded", 2), "Reward #3");
test("funded / 3 rewards  → Reward #4",        getV1LevelLabel("funded", 3), "Reward #4");
test("funded / 4 rewards  → Reward #5",        getV1LevelLabel("funded", 4), "Reward #5");

// Terminé
test("funded / 5 rewards  → Terminé (5/5)",    getV1LevelLabel("funded", 5),  "Terminé (5/5)");
test("terminatedAt fourni → Terminé (5/5)",    getV1LevelLabel("funded", 4, "2026-01-01T00:00:00Z"), "Terminé (5/5)");
test("phase1 + terminatedAt → Terminé (5/5)",  getV1LevelLabel("phase1", 0, "2026-01-01T00:00:00Z"), "Terminé (5/5)");

// ═══════════════════════════════════════════════════════════════
// C. DD EOD fixe $ — getV1DdUsd + getV1DdDisplay
// ═══════════════════════════════════════════════════════════════

section("C. DD EOD fixe $ (getV1DdUsd / getV1DdDisplay)");

test("25K → 1 000$",  getV1DdUsd(25_000),  1_000);
test("50K → 2 000$",  getV1DdUsd(50_000),  2_000);
test("100K → 3 000$", getV1DdUsd(100_000), 3_000);

testContains("getV1DdDisplay(25K) contient '000'", getV1DdDisplay(25_000), "000");
testContains("getV1DdDisplay(25K) contient '$'",   getV1DdDisplay(25_000), "$");
testContains("getV1DdDisplay(100K) contient '$'",  getV1DdDisplay(100_000), "$");

// ═══════════════════════════════════════════════════════════════
// D. Safety Net — getV1SafetyNetUsd + getV1SafetyNetDisplay
// ═══════════════════════════════════════════════════════════════

section("D. Safety Net (getV1SafetyNetUsd / getV1SafetyNetDisplay)");

test("25K → 26 100$",  getV1SafetyNetUsd(25_000),  26_100);
test("50K → 52 100$",  getV1SafetyNetUsd(50_000),  52_100);
test("100K → 103 100$", getV1SafetyNetUsd(100_000), 103_100);

testContains("getV1SafetyNetDisplay(25K) contient '100'", getV1SafetyNetDisplay(25_000), "100");
testContains("getV1SafetyNetDisplay(25K) contient '$'",   getV1SafetyNetDisplay(25_000), "$");

// ═══════════════════════════════════════════════════════════════
// E. Seuil de déclenchement Reward — getV1RewardThresholdUsd
// ═══════════════════════════════════════════════════════════════

section("E. Seuil Reward (getV1RewardThresholdUsd)");

// Seuil = Safety Net + cap du Reward level
// 25K R#1 : 26 100 + 300 = 26 400
test("25K R#1 → 26 400$", getV1RewardThresholdUsd(25_000, 1), 26_400);
// 25K R#2 : 26 100 + 400 = 26 500
test("25K R#2 → 26 500$", getV1RewardThresholdUsd(25_000, 2), 26_500);
// 50K R#1 : 52 100 + 500 = 52 600
test("50K R#1 → 52 600$", getV1RewardThresholdUsd(50_000, 1), 52_600);
// 100K R#1 : 103 100 + 750 = 103 850
test("100K R#1 → 103 850$", getV1RewardThresholdUsd(100_000, 1), 103_850);

testContains("getV1RewardThresholdDisplay(25K, 1) contient '400'", getV1RewardThresholdDisplay(25_000, 1), "400");

// ═══════════════════════════════════════════════════════════════
// F. Plafond Reward — getV1RewardCapDisplay
// ═══════════════════════════════════════════════════════════════

section("F. Plafond Reward (getV1RewardCapDisplay)");

testContains("25K R#1 → '300'",   getV1RewardCapDisplay(25_000, 1), "300");
testContains("25K R#2 → '400'",   getV1RewardCapDisplay(25_000, 2), "400");
testContains("25K R#3 → '500'",   getV1RewardCapDisplay(25_000, 3), "500");
testContains("25K R#4 → '600'",   getV1RewardCapDisplay(25_000, 4), "600");
testContains("25K R#5 → '750'",   getV1RewardCapDisplay(25_000, 5), "750");

testContains("50K R#1 → '500'",   getV1RewardCapDisplay(50_000, 1), "500");
testContains("50K R#5 → '250'",   getV1RewardCapDisplay(50_000, 5), "250");   // 1 250$

testContains("100K R#1 → '750'",  getV1RewardCapDisplay(100_000, 1), "750");
testContains("100K R#5 → '750'",  getV1RewardCapDisplay(100_000, 5), "750");  // 1 750$

test("R#6 hors range → '—'", getV1RewardCapDisplay(25_000, 6), "—");

// ═══════════════════════════════════════════════════════════════
// G. Jour qualifiant — getV1QualDayUsd + getV1QualDayDisplay
// ═══════════════════════════════════════════════════════════════

section("G. Jour qualifiant (getV1QualDayUsd / getV1QualDayDisplay)");

test("25K  → 100$/jour",  getV1QualDayUsd(25_000),  100);
test("50K  → 250$/jour",  getV1QualDayUsd(50_000),  250);
test("100K → 300$/jour",  getV1QualDayUsd(100_000), 300);

testContains("getV1QualDayDisplay(25K) contient '100'",    getV1QualDayDisplay(25_000), "100");
testContains("getV1QualDayDisplay(25K) contient '/jour'",  getV1QualDayDisplay(25_000), "/jour");

// ═══════════════════════════════════════════════════════════════
// H. Règle de consistance — getV1ConsistencyDisplay
// ═══════════════════════════════════════════════════════════════

section("H. Consistance (getV1ConsistencyDisplay)");

test("phase1 → 'AUCUNE'",  getV1ConsistencyDisplay("phase1"), "AUCUNE");
test("phase2 → 'AUCUNE'",  getV1ConsistencyDisplay("phase2"), "AUCUNE");
test("funded → '≤ 50%'",   getV1ConsistencyDisplay("funded"), "≤ 50%");

// ═══════════════════════════════════════════════════════════════
// I. Constantes exportées
// ═══════════════════════════════════════════════════════════════

section("I. Constantes V1 exportées");

test("V1_QUAL_DAYS_MIN = 5",          V1_QUAL_DAYS_MIN,        5);
test("V1_CHALLENGE_MIN_DAYS = 0",     V1_CHALLENGE_MIN_DAYS,   0);
test("V1_CHALLENGE_MAX_DAYS = 30",    V1_CHALLENGE_MAX_DAYS,   30);
test("V1_CHALLENGE_PROFIT_PCT = 6",   V1_CHALLENGE_PROFIT_PCT, 6);
test("V1_REWARD_PROFIT_PCT = 4",      V1_REWARD_PROFIT_PCT,    4);
test("V1_MAX = 5",                    V1_MAX,                  5);

// ═══════════════════════════════════════════════════════════════
// Résumé
// ═══════════════════════════════════════════════════════════════

console.log(`\n${BOLD}── Résultat ──${RESET}`);
console.log(`  ${GREEN}Passés  : ${passed}${RESET}`);
if (failed > 0) {
  console.log(`  ${RED}Échoués : ${failed}${RESET}`);
  process.exit(1);
} else {
  console.log(`  ${GREEN}✅ ${passed}/${passed + failed} tests passés${RESET}`);
}
