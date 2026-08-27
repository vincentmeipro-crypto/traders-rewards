/**
 * Tests unitaires — lib/pricing.ts
 * Vérifie tous les scénarios (6 tailles × quantités × 4 périodes)
 * et les frontières de changement de période.
 */

import { getActivePeriod, getPriceForSlug, isPricingSlug, REF_PRICES } from "@/lib/pricing";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Crée une date à 12h00 UTC pour un jour donné (toujours bien dans le bon jour Paris). */
function d(year: number, month: number, day: number): Date {
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00Z`);
}

// ── Période 1 : 1–15 octobre ─────────────────────────────────────────────────

describe("Période 1 — 1 au 15 octobre", () => {
  const dates = [d(2026, 10, 1), d(2026, 10, 8), d(2026, 10, 15)];

  test.each(dates)("nom de période correct pour %p", (dt) => {
    expect(getActivePeriod(dt).name).toBe("oct-1-15");
  });

  test("25K · 1 challenge = 38€ (3 800 cts)", () => {
    expect(getPriceForSlug("rewards-25k", 1, d(2026, 10, 1))).toBe(3800);
  });
  test("25K · pack ×3 = 57€ (5 700 cts)", () => {
    expect(getPriceForSlug("rewards-25k", 3, d(2026, 10, 1))).toBe(5700);
  });
  test("50K · 1 challenge = 58€ (5 800 cts)", () => {
    expect(getPriceForSlug("rewards-50k", 1, d(2026, 10, 1))).toBe(5800);
  });
  test("50K · pack ×3 = 87€ (8 700 cts)", () => {
    expect(getPriceForSlug("rewards-50k", 3, d(2026, 10, 1))).toBe(8700);
  });
  test("100K · 1 challenge = 118€ (11 800 cts)", () => {
    expect(getPriceForSlug("rewards-100k", 1, d(2026, 10, 1))).toBe(11800);
  });
  test("100K · pack ×3 = 177€ (17 700 cts)", () => {
    expect(getPriceForSlug("rewards-100k", 3, d(2026, 10, 1))).toBe(17700);
  });
});

// ── Période 2 : 16 octobre – 15 novembre ─────────────────────────────────────

describe("Période 2 — 16 octobre au 15 novembre", () => {
  const dates = [d(2026, 10, 16), d(2026, 11, 1), d(2026, 11, 15)];

  test.each(dates)("nom de période correct pour %p", (dt) => {
    expect(getActivePeriod(dt).name).toBe("oct-16-nov-15");
  });

  test("25K · 1 challenge = 57€ (5 700 cts)", () => {
    expect(getPriceForSlug("rewards-25k", 1, d(2026, 10, 16))).toBe(5700);
  });
  test("25K · pack ×3 = 114€ (11 400 cts)", () => {
    expect(getPriceForSlug("rewards-25k", 3, d(2026, 10, 16))).toBe(11400);
  });
  test("50K · 1 challenge = 87€ (8 700 cts)", () => {
    expect(getPriceForSlug("rewards-50k", 1, d(2026, 10, 16))).toBe(8700);
  });
  test("50K · pack ×3 = 174€ (17 400 cts)", () => {
    expect(getPriceForSlug("rewards-50k", 3, d(2026, 10, 16))).toBe(17400);
  });
  test("100K · 1 challenge = 177€ (17 700 cts)", () => {
    expect(getPriceForSlug("rewards-100k", 1, d(2026, 10, 16))).toBe(17700);
  });
  test("100K · pack ×3 = 354€ (35 400 cts)", () => {
    expect(getPriceForSlug("rewards-100k", 3, d(2026, 10, 16))).toBe(35400);
  });
});

// ── Période 3 : 16 novembre – 15 décembre ────────────────────────────────────

describe("Période 3 — 16 novembre au 15 décembre", () => {
  const dates = [d(2026, 11, 16), d(2026, 12, 1), d(2026, 12, 15)];

  test.each(dates)("nom de période correct pour %p", (dt) => {
    expect(getActivePeriod(dt).name).toBe("nov-16-dec-15");
  });

  test("25K · 1 challenge = 76€ (7 600 cts)", () => {
    expect(getPriceForSlug("rewards-25k", 1, d(2026, 11, 16))).toBe(7600);
  });
  test("25K · pack ×3 = 171€ (17 100 cts)", () => {
    expect(getPriceForSlug("rewards-25k", 3, d(2026, 11, 16))).toBe(17100);
  });
  test("50K · 1 challenge = 116€ (11 600 cts)", () => {
    expect(getPriceForSlug("rewards-50k", 1, d(2026, 11, 16))).toBe(11600);
  });
  test("50K · pack ×3 = 261€ (26 100 cts)", () => {
    expect(getPriceForSlug("rewards-50k", 3, d(2026, 11, 16))).toBe(26100);
  });
  test("100K · 1 challenge = 236€ (23 600 cts)", () => {
    expect(getPriceForSlug("rewards-100k", 1, d(2026, 11, 16))).toBe(23600);
  });
  test("100K · pack ×3 = 531€ (53 100 cts)", () => {
    expect(getPriceForSlug("rewards-100k", 3, d(2026, 11, 16))).toBe(53100);
  });
});

// ── Période 4 : 16–31 décembre ───────────────────────────────────────────────

describe("Période 4 — 16 au 31 décembre", () => {
  const dates = [d(2026, 12, 16), d(2026, 12, 24), d(2026, 12, 31)];

  test.each(dates)("nom de période correct pour %p", (dt) => {
    expect(getActivePeriod(dt).name).toBe("dec-16-31");
  });

  test("25K · 1 challenge = 95€ (9 500 cts)", () => {
    expect(getPriceForSlug("rewards-25k", 1, d(2026, 12, 16))).toBe(9500);
  });
  test("25K · pack ×3 = 228€ (22 800 cts)", () => {
    expect(getPriceForSlug("rewards-25k", 3, d(2026, 12, 16))).toBe(22800);
  });
  test("50K · 1 challenge = 145€ (14 500 cts)", () => {
    expect(getPriceForSlug("rewards-50k", 1, d(2026, 12, 16))).toBe(14500);
  });
  test("50K · pack ×3 = 348€ (34 800 cts)", () => {
    expect(getPriceForSlug("rewards-50k", 3, d(2026, 12, 16))).toBe(34800);
  });
  test("100K · 1 challenge = 295€ (29 500 cts)", () => {
    expect(getPriceForSlug("rewards-100k", 1, d(2026, 12, 16))).toBe(29500);
  });
  test("100K · pack ×3 = 708€ (70 800 cts)", () => {
    expect(getPriceForSlug("rewards-100k", 3, d(2026, 12, 16))).toBe(70800);
  });
});

// ── Frontières de période ─────────────────────────────────────────────────────

describe("Frontières de changement de période", () => {
  test("oct 15 midday → période 1", () => {
    expect(getActivePeriod(d(2026, 10, 15)).name).toBe("oct-1-15");
  });
  test("oct 16 midday → période 2", () => {
    expect(getActivePeriod(d(2026, 10, 16)).name).toBe("oct-16-nov-15");
  });
  test("nov 15 midday → période 2", () => {
    expect(getActivePeriod(d(2026, 11, 15)).name).toBe("oct-16-nov-15");
  });
  test("nov 16 midday → période 3", () => {
    expect(getActivePeriod(d(2026, 11, 16)).name).toBe("nov-16-dec-15");
  });
  test("dec 15 midday → période 3", () => {
    expect(getActivePeriod(d(2026, 12, 15)).name).toBe("nov-16-dec-15");
  });
  test("dec 16 midday → période 4", () => {
    expect(getActivePeriod(d(2026, 12, 16)).name).toBe("dec-16-31");
  });
  test("dec 31 midday → période 4", () => {
    expect(getActivePeriod(d(2026, 12, 31)).name).toBe("dec-16-31");
  });
});

// ── Fallback hors plages ──────────────────────────────────────────────────────

describe("Fallback hors des périodes définies", () => {
  test("août 2026 → fallback période 1 (avant campagne)", () => {
    expect(getActivePeriod(d(2026, 8, 27)).name).toBe("oct-1-15");
  });
  test("janvier 2027 → fallback période 4 (après campagne)", () => {
    expect(getActivePeriod(d(2027, 1, 5)).name).toBe("dec-16-31");
  });
});

// ── Prix de référence ─────────────────────────────────────────────────────────

describe("Prix de référence (barrés)", () => {
  test("25K ref unitaire = 190€", () => {
    expect(REF_PRICES["rewards-25k"].unit).toBe(19000);
  });
  test("25K ref ×3 = 570€", () => {
    expect(REF_PRICES["rewards-25k"].pack3).toBe(57000);
  });
  test("50K ref unitaire = 290€", () => {
    expect(REF_PRICES["rewards-50k"].unit).toBe(29000);
  });
  test("50K ref ×3 = 870€", () => {
    expect(REF_PRICES["rewards-50k"].pack3).toBe(87000);
  });
  test("100K ref unitaire = 590€", () => {
    expect(REF_PRICES["rewards-100k"].unit).toBe(59000);
  });
  test("100K ref ×3 = 1 770€", () => {
    expect(REF_PRICES["rewards-100k"].pack3).toBe(177000);
  });
});

// ── Type-guard isPricingSlug ──────────────────────────────────────────────────

describe("isPricingSlug", () => {
  test("rewards-25k → true",  () => { expect(isPricingSlug("rewards-25k")).toBe(true); });
  test("rewards-50k → true",  () => { expect(isPricingSlug("rewards-50k")).toBe(true); });
  test("rewards-100k → true", () => { expect(isPricingSlug("rewards-100k")).toBe(true); });
  test("rewards-200k → false",() => { expect(isPricingSlug("rewards-200k")).toBe(false); });
  test("25k-vip → false",     () => { expect(isPricingSlug("25k-vip")).toBe(false); });
  test("vide → false",        () => { expect(isPricingSlug("")).toBe(false); });
});
