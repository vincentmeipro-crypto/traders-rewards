/**
 * Tests unitaires — Éligibilité Rewards V1
 *
 * Couvre :
 *  - V1_TRAILING_LOCK_BALANCE (valeurs canoniques)
 *  - getEffectiveRewardFloor (CAS A — trailing hit nominal, CAS B — reward paid)
 *  - evaluateReward :
 *      floor = start_balance (pas de seuil trailingLock + cap)
 *      available = min(balance, equity) − start_balance
 *      maximum   = min(available, cap)
 *      eligibilité "floor" = maximum < 100$
 *  - Les 5 scénarios mandatoires (spec 2026-09-11)
 *  - validRewardAmount
 */

import {
  V1_TRAILING_LOCK_BALANCE,
  getV1TrailingLockBalance,
  getEffectiveRewardFloor,
  getV1DdUsdByBalance,
} from "../v1-engine";
import { evaluateReward, validRewardAmount } from "../reward-eligibility";

// ── Fixtures ──────────────────────────────────────────────────────────────

/** 5 jours qualifiants 50K (≥ 250 $ chacun), consistance 20% */
const FIVE_DAYS_50K  = [500, 500, 500, 500, 500];
/** 5 jours qualifiants 25K (≥ 100 $ chacun) */
const FIVE_DAYS_25K  = [200, 200, 200, 200, 200];
/** 5 jours qualifiants 100K (≥ 300 $ chacun) */
const FIVE_DAYS_100K = [400, 400, 400, 400, 400];

/** Base 50K R1, toutes conditions OK sauf les montants (tests à la carte) */
const BASE_50K = {
  start:        50000,
  balance:      50500,
  equity:       50500,
  phase:        "funded",
  status:       "funded",
  paidCount:    0,
  terminated:   false,
  pending:      false,
  kyc:          true,
  dailyProfits: FIVE_DAYS_50K,
};

// ═══════════════════════════════════════════════════════════════
// V1_TRAILING_LOCK_BALANCE — Balance EOD de lock du trailing
// ═══════════════════════════════════════════════════════════════

describe("V1_TRAILING_LOCK_BALANCE — balances EOD de verrouillage", () => {
  test("25K = start + ddUsd = 26 000", () => {
    expect(V1_TRAILING_LOCK_BALANCE[25000]).toBe(26000);
    expect(getV1TrailingLockBalance(25000)).toBe(26000);
    expect(getV1TrailingLockBalance(25000)).toBe(25000 + getV1DdUsdByBalance(25000));
  });

  test("50K = start + ddUsd = 52 000", () => {
    expect(V1_TRAILING_LOCK_BALANCE[50000]).toBe(52000);
    expect(getV1TrailingLockBalance(50000)).toBe(52000);
    expect(getV1TrailingLockBalance(50000)).toBe(50000 + getV1DdUsdByBalance(50000));
  });

  test("100K = start + ddUsd = 103 000", () => {
    expect(V1_TRAILING_LOCK_BALANCE[100000]).toBe(103000);
    expect(getV1TrailingLockBalance(100000)).toBe(103000);
    expect(getV1TrailingLockBalance(100000)).toBe(100000 + getV1DdUsdByBalance(100000));
  });

  test("V1_TRAILING_LOCK_BALANCE n'est PAS un floor (le floor = start_balance)", () => {
    // La trailing lock balance ≠ floor. Le floor = start_balance une fois verrouillé.
    expect(V1_TRAILING_LOCK_BALANCE[50000]).not.toBe(50000); // 52000 ≠ 50000
  });
});

// ═══════════════════════════════════════════════════════════════
// getEffectiveRewardFloor — Plancher canonique
// ═══════════════════════════════════════════════════════════════

describe("getEffectiveRewardFloor — plancher canonique", () => {

  test("Trailing non atteint, 0 reward → TRAILING, floor < start", () => {
    const r = getEffectiveRewardFloor(50000, 51000, 2000, 0);
    expect(r.isFixed).toBe(false);
    expect(r.mode).toBe("TRAILING");
    expect(r.rawFloor).toBe(49000);
    expect(r.floor).toBe(49000);
    expect(r.lockReason).toBeNull();
  });

  test("CAS A : highest_eod=52 000 → rawFloor=50 000 = start → FIXED", () => {
    const r = getEffectiveRewardFloor(50000, 52000, 2000, 0);
    expect(r.isFixed).toBe(true);
    expect(r.floor).toBe(50000);           // floor = start_balance
    expect(r.rawFloor).toBe(50000);
    expect(r.lockReason).toBe("trailing_hit_nominal");
  });

  test("CAS A : highest > trailingLockBalance → floor toujours start_balance", () => {
    const r = getEffectiveRewardFloor(50000, 55000, 2000, 0);
    expect(r.isFixed).toBe(true);
    expect(r.floor).toBe(50000);           // cap à start_balance, pas rawFloor=53000
  });

  test("CAS B : 1 reward payée, trailing pas encore au lock → FIXED", () => {
    const r = getEffectiveRewardFloor(50000, 51000, 2000, 1);
    expect(r.isFixed).toBe(true);
    expect(r.rawFloor).toBe(49000);        // rawFloor < start, mais FIXE car CAS B
    expect(r.floor).toBe(50000);
    expect(r.lockReason).toBe("reward_paid");
  });

  test("25K CAS A : highest=26 000 → rawFloor=25 000 = start → FIXED", () => {
    const r = getEffectiveRewardFloor(25000, 26000, 1000, 0);
    expect(r.isFixed).toBe(true);
    expect(r.floor).toBe(25000);
  });

  test("100K CAS A : highest=103 000 → rawFloor=100 000 = start → FIXED", () => {
    const r = getEffectiveRewardFloor(100000, 103000, 3000, 0);
    expect(r.isFixed).toBe(true);
    expect(r.floor).toBe(100000);
  });

  test("Floor ne dépasse JAMAIS start_balance", () => {
    // Avant CAS A, le rawFloor peut être < start, jamais >
    const r = getEffectiveRewardFloor(50000, 50500, 2000, 0);
    expect(r.floor).toBeLessThanOrEqual(50000); // rawFloor = 48500 < 50000
  });
});

// ═══════════════════════════════════════════════════════════════
// evaluateReward — Scénarios mandatoires (spec 2026-09-11)
// ═══════════════════════════════════════════════════════════════

describe("evaluateReward — scénarios mandatoires", () => {

  // ── Scénario 1 : 50K / balance $50 500 / R1 cap $500 ─────────
  // max = min(50500 - 50000 = 500, cap 500) = 500 → éligible
  // PAS besoin d'atteindre $52 500 ou toute autre forme de 52K + cap
  test("50K balance=50 500, R1 cap=500 → éligible, maximum=500", () => {
    const r = evaluateReward(BASE_50K); // balance=50500
    expect(r.eligible).toBe(true);
    expect(r.floor).toBe(50000);
    expect(r.maximum).toBe(500);
    expect(r.rewardNumber).toBe(1);
    expect(r.reasons).toHaveLength(0);
  });

  // ── Scénario 2 : 50K / balance $50 320 ───────────────────────
  // max = min(320, 500) = 320 → éligible (320 >= 100$)
  test("50K balance=50 320 → max=$320, éligible", () => {
    const r = evaluateReward({ ...BASE_50K, balance: 50320, equity: 50320 });
    expect(r.eligible).toBe(true);
    expect(r.maximum).toBe(320);
  });

  // ── Scénario 3 : 50K / balance $50 080 ───────────────────────
  // available = 80 < 100 → raison "floor", inéligible
  test("50K balance=50 080 → disponible $80, refus (< minimum $100)", () => {
    const r = evaluateReward({ ...BASE_50K, balance: 50080, equity: 50080 });
    expect(r.eligible).toBe(false);
    expect(r.maximum).toBe(80);
    expect(r.reasons).toContain("floor");
  });

  // ── Scénario 4 : 50K R2 / paidCount=1 / balance $50 500 / cap $750 ──
  // max = min(500, 750) = 500 → éligible
  // PAS besoin d'atteindre $52 750 ou autre threshold
  test("50K R2, paidCount=1, balance=50 500, cap=750 → max=$500, éligible", () => {
    const r = evaluateReward({ ...BASE_50K, balance: 50500, equity: 50500, paidCount: 1 });
    expect(r.eligible).toBe(true);
    expect(r.maximum).toBe(500);
    expect(r.rewardNumber).toBe(2);
  });

  // ── Scénario 5 : 100K / balance $100 500 / R1 cap $1 000 ─────
  // max = min(500, 1000) = 500 → éligible
  // PAS besoin d'atteindre $104 000 ou $104 100
  test("100K balance=100 500, R1 cap=1 000 → max=$500, éligible", () => {
    const r = evaluateReward({
      ...BASE_50K,
      start:        100000,
      balance:      100500,
      equity:       100500,
      dailyProfits: FIVE_DAYS_100K,
    });
    expect(r.eligible).toBe(true);
    expect(r.floor).toBe(100000);
    expect(r.maximum).toBe(500);
    expect(r.rewardNumber).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════
// evaluateReward — Formule générale (floor = start_balance)
// ═══════════════════════════════════════════════════════════════

describe("evaluateReward — floor = start_balance, available = balance − start", () => {

  test("floor est toujours start_balance, jamais start × 1.04", () => {
    const r = evaluateReward(BASE_50K);
    expect(r.floor).toBe(50000);
    expect(r.floor).not.toBe(50000 * 1.04); // 52000 interdit
  });

  test.each([25000, 50000, 100000])(
    "floor = start_balance (%d) pour tous les niveaux",
    start => {
      const r = evaluateReward({ ...BASE_50K, start });
      expect(r.floor).toBe(start);
    }
  );

  test("cap plafonne le maximum, ne bloque pas l'accès", () => {
    // balance=55000 → available=5000, cap=500 → max=500 (capé, pas bloqué)
    const r = evaluateReward({ ...BASE_50K, balance: 55000, equity: 55000 });
    expect(r.eligible).toBe(true);
    expect(r.maximum).toBe(500); // capé au cap R1
  });

  test("equity < balance → available = min(balance, equity) - start", () => {
    // balance=50600, equity=50350 → available=350, max=min(350,500)=350
    const r = evaluateReward({ ...BASE_50K, balance: 50600, equity: 50350 });
    expect(r.eligible).toBe(true);
    expect(r.maximum).toBe(350);
  });

  test("equity sous start_balance → available=0, raison floor", () => {
    const r = evaluateReward({ ...BASE_50K, balance: 50200, equity: 49500 });
    expect(r.eligible).toBe(false);
    expect(r.maximum).toBe(0);
    expect(r.reasons).toContain("floor");
  });

  test("R2 : maximum = min(balance − start, cap_R2)", () => {
    // paidCount=1 → R2, cap=750 ; balance=51000 → available=1000 → max=750
    const r = evaluateReward({ ...BASE_50K, paidCount: 1, balance: 51000, equity: 51000 });
    expect(r.eligible).toBe(true);
    expect(r.maximum).toBe(750);
    expect(r.rewardNumber).toBe(2);
  });

  test("25K R1 : cap=250, balance=25300 → max=min(300,250)=250", () => {
    const r = evaluateReward({
      ...BASE_50K,
      start:        25000,
      balance:      25300,
      equity:       25300,
      dailyProfits: FIVE_DAYS_25K,
    });
    expect(r.eligible).toBe(true);
    expect(r.maximum).toBe(250);
  });

  test("25K R1 : balance=25100 → max=100, éligible exactement au minimum", () => {
    const r = evaluateReward({
      ...BASE_50K,
      start:        25000,
      balance:      25100,
      equity:       25100,
      dailyProfits: FIVE_DAYS_25K,
    });
    expect(r.eligible).toBe(true);
    expect(r.maximum).toBe(100);
  });

  test("25K R1 : balance=25099 → max=99 < 100$, raison floor", () => {
    const r = evaluateReward({
      ...BASE_50K,
      start:        25000,
      balance:      25099,
      equity:       25099,
      dailyProfits: FIVE_DAYS_25K,
    });
    expect(r.eligible).toBe(false);
    expect(r.reasons).toContain("floor");
  });
});

// ═══════════════════════════════════════════════════════════════
// evaluateReward — Autres conditions d'inéligibilité
// ═══════════════════════════════════════════════════════════════

describe("evaluateReward — motifs d'inéligibilité", () => {
  test.each([
    { kyc: false },
    { pending: true },
    { terminated: true },
    { status: "failed" },
    { phase: "phase1" },
    { paidCount: 5 },                              // terminé
    { equity: NaN },
    { dailyProfits: [500, 500] },                  // 2 jours seulement (< 5)
    { dailyProfits: [3000, 250, 250, 250, 250] },  // consistency 73% > 50%
  ])("bloque les conditions non remplies %j", patch => {
    const r = evaluateReward({ ...BASE_50K, ...patch });
    expect(r.eligible).toBe(false);
  });

  test("phase != funded → raison inactive", () => {
    expect(evaluateReward({ ...BASE_50K, phase: "challenge" }).reasons).toContain("inactive");
  });

  test("kyc = false → raison kyc", () => {
    expect(evaluateReward({ ...BASE_50K, kyc: false }).reasons).toContain("kyc");
  });

  test("< 5 jours qualifiants → raison days", () => {
    expect(evaluateReward({ ...BASE_50K, dailyProfits: [500, 500, 500, 500] }).reasons).toContain("days");
  });

  test("consistency > 50% → raison consistency", () => {
    expect(evaluateReward({ ...BASE_50K, dailyProfits: [3000, 250, 250, 250, 250] }).reasons).toContain("consistency");
  });

  test("terminé (paidCount=5) → raison terminated", () => {
    expect(evaluateReward({ ...BASE_50K, balance: 60000, equity: 60000, paidCount: 5 }).reasons).toContain("terminated");
  });
});

// ═══════════════════════════════════════════════════════════════
// validRewardAmount
// ═══════════════════════════════════════════════════════════════

describe("validRewardAmount", () => {
  test("montant valide : 100, 250, 499.99", () => {
    expect(validRewardAmount(100, 500)).toBe(true);
    expect(validRewardAmount(250, 500)).toBe(true);
    expect(validRewardAmount(499.99, 500)).toBe(true);
    expect(validRewardAmount(500, 500)).toBe(true);
  });

  test("minimum absolu = 100$", () => {
    expect(validRewardAmount(99.99, 500)).toBe(false);
    expect(validRewardAmount(100, 500)).toBe(true);
  });

  test.each([0, -1, NaN, Infinity, 500.01, 0.001, "100", null])(
    "rejette les montants invalides : %s",
    amount => expect(validRewardAmount(amount, 500)).toBe(false)
  );

  test("montant > maximum → invalide", () => expect(validRewardAmount(501, 500)).toBe(false));

  test("fractions de centimes rejetées", () => {
    expect(validRewardAmount(100.001, 500)).toBe(false);
    expect(validRewardAmount(100.01, 500)).toBe(true);
  });
});
