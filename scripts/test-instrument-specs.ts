/**
 * TRADERS REWARDS — Tests automatiques
 *
 * Exécution : npx tsx scripts/test-instrument-specs.ts
 *
 * Couvre :
 *   1. Specs instruments (pip, valeur, risque monétaire)
 *   2. Pourcentages de risque (capital actuel + marges restantes)
 */

import {
  runInstrumentTests,
  runLotTests,
  TEST_CASES,
  LOT_TEST_CASES,
} from "../lib/instrument-specs";

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function approxEq(a: number, b: number, tolerancePct = 0.001): boolean {
  if (b === 0) return Math.abs(a) < 1e-9;
  return Math.abs(a - b) / Math.abs(b) <= tolerancePct;
}

interface SimpleResult {
  name:    string;
  passed:  boolean;
  errors:  string[];
}

function checkValues(
  name: string,
  cases: Array<{ label: string; got: number; expected: number; tol?: number }>,
): SimpleResult {
  const errors: string[] = [];
  for (const c of cases) {
    if (!approxEq(c.got, c.expected, c.tol ?? 0.001)) {
      errors.push(`${c.label}: attendu ${c.expected.toFixed(4)}, obtenu ${c.got.toFixed(4)}`);
    }
  }
  return { name, passed: errors.length === 0, errors };
}

// ─── Suite 1 : Instruments (existante) ───────────────────────────────────────

const instrumentResults = runInstrumentTests();

// ─── Suite 2 : Pourcentages risque & marges ───────────────────────────────────
//
// Formules à valider :
//
//   riskPercentCurrentCapital = riskAmount / currentCapital × 100
//   dailyMarginImpactPercent  = riskAmount / dailyMarginRemaining × 100
//   maxMarginImpactPercent    = riskAmount / maxMarginRemaining × 100
//
// Cas de référence fourni par la spec :
//   riskAmount          = $1 000
//   currentCapital      = $95 230
//   dailyRemaining      = $4 770
//   maxRemaining        = $5 400
//
// Résultats attendus :
//   riskPercentCurrentCapital ≈ 1.0501 %
//   dailyMarginImpactPercent  ≈ 20.964 %
//   maxMarginImpactPercent    ≈ 18.519 %
//
// ─────────────────────────────────────────────────────────────────────────────

const percentageTests: SimpleResult[] = [];

// ── Test P1 : cas de référence de la spec ────────────────────────────────────
{
  const riskAmount     = 1_000;
  const currentCapital = 95_230;
  const dailyRemaining =  4_770;
  const maxRemaining   =  5_400;

  const riskPct   = (riskAmount / currentCapital) * 100;
  const dailyImpact = (riskAmount / dailyRemaining) * 100;
  const maxImpact   = (riskAmount / maxRemaining)   * 100;

  percentageTests.push(checkValues("Pourcentages — cas de référence spec", [
    { label: "riskPercentCurrentCapital", got: riskPct,    expected: 1.0501,  tol: 0.01 },
    { label: "dailyMarginImpactPercent",  got: dailyImpact, expected: 20.964, tol: 0.01 },
    { label: "maxMarginImpactPercent",    got: maxImpact,   expected: 18.519, tol: 0.01 },
  ]));
}

// ── Test P2 : risque = 0 → tous à 0 ─────────────────────────────────────────
{
  const riskAmount = 0;
  percentageTests.push(checkValues("Risque zéro → impact zéro", [
    { label: "riskPct",      got: (riskAmount / 100_000) * 100,  expected: 0 },
    { label: "dailyImpact",  got: (riskAmount / 5_000)   * 100,  expected: 0 },
    { label: "maxImpact",    got: (riskAmount / 10_000)  * 100,  expected: 0 },
  ]));
}

// ── Test P3 : risque = marge journalière → 100 % d'impact ────────────────────
{
  const riskAmount     = 4_770;
  const dailyRemaining = 4_770;
  const dailyImpact    = (riskAmount / dailyRemaining) * 100;
  percentageTests.push(checkValues("Risque = marge journalière → impact 100 %", [
    { label: "dailyMarginImpactPercent", got: dailyImpact, expected: 100 },
  ]));
}

// ── Test P4 : risque > marge → impact > 100 % (violation) ───────────────────
{
  const riskAmount     = 6_000;
  const dailyRemaining = 4_770;
  const dailyImpact    = (riskAmount / dailyRemaining) * 100;
  percentageTests.push(checkValues("Risque > marge → impact > 100 % (violation)", [
    { label: "dailyMarginImpactPercent", got: dailyImpact, expected: 125.786, tol: 0.01 },
  ]));
}

// ─── Suite 3 : Calculateur de Lot (16 cas) ───────────────────────────────────

const lotResults = runLotTests();

// ─── Affichage ────────────────────────────────────────────────────────────────

let totalPassed = 0;
let totalFailed = 0;

function printResults(sectionTitle: string, results: Array<{ name: string; passed: boolean; errors: string[]; got?: unknown; expected?: unknown }>) {
  console.log(`\n${BOLD}  ${sectionTitle}${RESET}`);
  console.log(`  ${"─".repeat(53)}`);
  for (const r of results) {
    if (r.passed) {
      console.log(`  ${GREEN}✅ PASS${RESET}  ${r.name}`);
      totalPassed++;
    } else {
      console.log(`  ${RED}❌ FAIL${RESET}  ${r.name}`);
      for (const e of r.errors) {
        console.log(`         ${DIM}→ ${e}${RESET}`);
      }
      totalFailed++;
    }
  }
}

console.log(`\n${BOLD}═══════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}  TRADERS REWARDS — Tests automatiques${RESET}`);
console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}`);

printResults("Instruments (pip · valeur · risque monétaire)", instrumentResults);
printResults("Pourcentages (capital actuel · marges restantes)", percentageTests);
printResults("Calculateur de Lot (lot · arrondi · invariants)", lotResults);

const totalTests = TEST_CASES.length + percentageTests.length + LOT_TEST_CASES.length;
// ↑ Attendu : 8 instruments + 4 pourcentages + 18 lot = 30 tests
console.log(`\n${BOLD}───────────────────────────────────────────────────────${RESET}`);
const col = totalFailed === 0 ? GREEN : RED;
console.log(`  ${col}${BOLD}${totalPassed}/${totalTests} passed${RESET}  |  ${totalFailed} failed`);
console.log(`${BOLD}═══════════════════════════════════════════════════════${RESET}\n`);

if (totalFailed > 0) process.exit(1);
