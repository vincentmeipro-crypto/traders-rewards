import { getActivePeriod, getPriceForSlug } from "@/lib/pricing";
import { DEFAULT_HERO_PROMOTION_CONFIG, getHeroPromotionPresentation } from "@/lib/hero-promotion-config";

describe("Scénario 1 au 1er janvier 2027", () => {
  test("bascule à minuit Paris sans changer les tarifs 2026", () => {
    expect(getPriceForSlug("rewards-25k", 1, new Date("2026-12-31T22:59:59Z"))).toBe(9500);
    expect(getPriceForSlug("rewards-25k", 1, new Date("2026-12-31T23:00:00Z"))).toBe(6650);
  });
  test.each([
    ["2027-01-01", "A", 6650, 17100],
    ["2027-01-08", "B", 7600, 19950],
    ["2027-01-15", "C", 8550, 22800],
    ["2027-01-22", "A", 6650, 17100],
  ])("rotation %s", (day, name, unit, pack) => {
    const date = new Date(`${day}T12:00:00Z`);
    expect(getActivePeriod(date).name).toBe(`weekly-${name}`);
    expect(getPriceForSlug("rewards-25k", 1, date)).toBe(unit);
    expect(getPriceForSlug("rewards-25k", 3, date)).toBe(pack);
  });
  test("prix 100K de la semaine A", () => {
    const date = new Date("2027-01-01T12:00:00Z");
    expect(getPriceForSlug("rewards-100k", 1, date)).toBe(20650);
    expect(getPriceForSlug("rewards-100k", 3, date)).toBe(53100);
  });
  test("la semaine reste identique au passage à l’heure d’été", () => {
    expect(getActivePeriod(new Date("2027-03-28T00:59:59Z")).name)
      .toBe(getActivePeriod(new Date("2027-03-28T01:00:00Z")).name);
  });
  test("Hero synchronisé même si la campagne 2026 a expiré", () => {
    const result = getHeroPromotionPresentation({ ...DEFAULT_HERO_PROMOTION_CONFIG,
      endsAt: "2026-10-15T10:00:00Z", headline: "Ancienne offre jusqu’au 15/10/2026" }, new Date("2027-01-08T12:00:00Z"));
    expect(result).toMatchObject({ leftDiscount: 60, rightDiscount: 65, visible: true, headline: "Offres du moment" });
  });
});
