/**
 * ============================================================
 * TRADERS REWARDS V1 — Tests purs moteur de Reward
 * ============================================================
 * Exécution : npx ts-node scripts/test-v1-engine.ts
 *
 * Couvre les règles V1.2 (2026-08-21) :
 *   - seuil de demande +4% sur le capital initial
 *   - montant éligible depuis la Reward précédente
 *   - plafonnement au cap du niveau
 *   - plancher de protection inchangé après versement
 * ============================================================
 */

import {
  REWARD_REQUEST_PROFIT_PCT,
  computeRewardRequestThreshold,
  isRewardRequestEligible,
  computeEligibleNewProfit,
  computeRewardAvailable,
  computeRewardImpact,
} from "../lib/v1-engine";

// ── Helpers ──────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  FAIL: ${label}`);
    failed++;
  }
}

function assertEqual(actual: number, expected: number, label: string, tolerance = 0.001): void {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) {
    console.log(`  ✓  ${label} → ${actual}`);
    passed++;
  } else {
    console.error(`  ✗  FAIL: ${label} — got ${actual}, expected ${expected}`);
    failed++;
  }
}

// ── CONSTANTE CENTRALISÉE ─────────────────────────────────────
console.log("\n=== REWARD_REQUEST_PROFIT_PCT ===");
assertEqual(REWARD_REQUEST_PROFIT_PCT, 4, "Constante centralisée = 4%");

// ── SEUILS DE DEMANDE ─────────────────────────────────────────
console.log("\n=== computeRewardRequestThreshold ===");
assertEqual(computeRewardRequestThreshold(25_000),  26_000,  "25K  seuil = 26 000 $");
assertEqual(computeRewardRequestThreshold(50_000),  52_000,  "50K  seuil = 52 000 $");
assertEqual(computeRewardRequestThreshold(100_000), 104_000, "100K seuil = 104 000 $");

// ── ÉLIGIBILITÉ ───────────────────────────────────────────────
console.log("\n=== isRewardRequestEligible — 50K ===");
assert(!isRewardRequestEligible(51_999, 50_000), "51 999 < 52 000 → refusé");
assert( isRewardRequestEligible(52_000, 50_000), "52 000 = seuil   → éligible");
assert( isRewardRequestEligible(52_400, 50_000), "52 400 > seuil   → éligible");

console.log("\n=== isRewardRequestEligible — 25K ===");
assert(!isRewardRequestEligible(25_999, 25_000), "25 999 < 26 000 → refusé");
assert( isRewardRequestEligible(26_000, 25_000), "26 000 = seuil   → éligible");

console.log("\n=== isRewardRequestEligible — 100K ===");
assert(!isRewardRequestEligible(103_999, 100_000), "103 999 < 104 000 → refusé");
assert( isRewardRequestEligible(104_000, 100_000), "104 000 = seuil    → éligible");

// ── NOUVEAU PROFIT ÉLIGIBLE ───────────────────────────────────
console.log("\n=== computeEligibleNewProfit ===");
// 50K — après Reward #1 (post-balance = 51 500)
assertEqual(computeEligibleNewProfit(52_000, 51_500), 500,  "50K après R#1 → 52K : profit = 500");
assertEqual(computeEligibleNewProfit(52_150, 51_500), 650,  "50K après R#1 → 52 150 : profit = 650");
assertEqual(computeEligibleNewProfit(52_400, 51_500), 900,  "50K après R#1 → 52 400 : profit = 900");
// Jamais négatif
assertEqual(computeEligibleNewProfit(51_000, 51_500), 0,    "balance < après-Reward → profit = 0 (protection)");

// ── MONTANT DISPONIBLE ────────────────────────────────────────
console.log("\n=== computeRewardAvailable — 50K Reward #2 (cap 650) ===");

// Cas A : limité par le profit
const caseA = computeRewardAvailable(500, 650);
assertEqual(caseA.rewardAvailable, 500, "Cas A : profit=500 < cap=650 → reward=500");
assert(caseA.limitedByProfit,  "Cas A : limitedByProfit=true");
assert(!caseA.limitedByCap,    "Cas A : limitedByCap=false");

// Cas B : profit = cap exactement
const caseB = computeRewardAvailable(650, 650);
assertEqual(caseB.rewardAvailable, 650, "Cas B : profit=650 = cap=650 → reward=650");
assert(!caseB.limitedByProfit, "Cas B : limitedByProfit=false");
assert(!caseB.limitedByCap,    "Cas B : limitedByCap=false");

// Cas C : limité par le plafond
const caseC = computeRewardAvailable(900, 650);
assertEqual(caseC.rewardAvailable, 650, "Cas C : profit=900 > cap=650 → reward=650");
assert(!caseC.limitedByProfit, "Cas C : limitedByProfit=false");
assert(caseC.limitedByCap,     "Cas C : limitedByCap=true");

// ── IMPACT APRÈS VERSEMENT ────────────────────────────────────
console.log("\n=== computeRewardImpact — 50K après Reward ===");

// Cas A : reward=500 (limité par profit), floor=50K
const impA = computeRewardImpact(52_000, 500, 50_000);
assertEqual(impA.postBalance, 51_500, "Cas A : postBalance = 51 500");
assertEqual(impA.bufferAfter, 1_500,  "Cas A : marge restante = 1 500");
assert(impA.isValid,          "Cas A : isValid=true (51 500 >= 50 000)");
assert(impA.reason === null,   "Cas A : reason=null");
// Vérification : aucun reset automatique au capital initial
assert(impA.postBalance !== 50_000, "Cas A : pas de reset à 50 000 (50K initial)");
assert(impA.postBalance !== 52_000, "Cas A : pas de reset à 52 000 (seuil)");

// Cas C : reward=650
const impC = computeRewardImpact(52_400, 650, 50_000);
assertEqual(impC.postBalance, 51_750, "Cas C : postBalance = 51 750");
assertEqual(impC.bufferAfter, 1_750,  "Cas C : marge restante = 1 750");
assert(impC.isValid,           "Cas C : isValid=true");
// Les 250$ supplémentaires restent dans le compte
const prevEligible = computeEligibleNewProfit(52_400, 51_500);
const capR2 = 650;
const rewC = computeRewardAvailable(prevEligible, capR2).rewardAvailable;
assertEqual(impC.postBalance - 50_000, 1_750, "Cas C : marge restante après 650 déduits = 1 750");
assert(prevEligible - rewC === 250, "Cas C : 250$ supplémentaires conservés dans le compte");

// Plancher inchangé
console.log("\n=== Plancher inchangé après Reward ===");
assert(impA.floor === 50_000, "plancher = 50 000 (inchangé après Reward A)");
assert(impC.floor === 50_000, "plancher = 50 000 (inchangé après Reward C)");

// ── RÉSUMÉ ────────────────────────────────────────────────────
console.log(`\n${"=".repeat(48)}`);
console.log(`Résultat : ${passed} tests passés, ${failed} tests échoués`);
console.log("=".repeat(48));
if (failed > 0) process.exit(1);
