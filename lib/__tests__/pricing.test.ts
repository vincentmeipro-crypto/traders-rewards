import { getActivePeriod, getPriceForSlug, getScheduledPromotion, isPricingSlug, REF_PRICES, type PricingSlug } from "@/lib/pricing";
import { DEFAULT_HERO_PROMOTION_CONFIG, getHeroPromotionPresentation } from "@/lib/hero-promotion-config";

describe("Promotions Q4 2026", () => {
  test("offre immédiate le 18 septembre à minuit Paris", () => {
    const before = new Date("2026-09-17T21:59:59.999Z");
    expect(getScheduledPromotion(before)).toBeNull();
    expect(getPriceForSlug("rewards-25k", 1, before)).toBe(3800);
    expect(getPriceForSlug("rewards-25k", 3, before)).toBe(5700);
    expect(getPriceForSlug("rewards-25k", 1, new Date("2026-09-30T22:00:00Z"))).toBe(4750);
    expect(getPriceForSlug("rewards-25k", 1, new Date("2026-09-17T22:00:00Z"))).toBe(4750);
    expect(getScheduledPromotion(new Date("2026-09-18T12:00:00Z"))?.endsOn).toBe("30/09/2026");
    expect(getScheduledPromotion(new Date("2026-10-01T12:00:00Z"))?.endsOn).toBe("07/10/2026");
    expect(getScheduledPromotion(new Date("2026-12-31T12:00:00Z"))?.endsOn).toBe("31/12/2026");
  });
  test.each([
    ["2026-10-01", "A"], ["2026-10-07", "A"],
    ["2026-10-08", "B"], ["2026-10-15", "C"], ["2026-10-22", "A"],
    ["2026-11-01", "B"], ["2026-11-12", "A"],
    ["2026-12-01", "C"], ["2026-12-24", "A"], ["2026-12-31", "B"],
  ])("rotation hebdomadaire %s : %s", (day, promo) => {
    expect(getActivePeriod(new Date(`${day}T12:00:00Z`)).name).toBe(`weekly-${promo}`);
  });
  const amounts: [string, PricingSlug, number, number][] = [
    ["2026-10-01", "rewards-25k", 4750, 8550],
    ["2026-10-01", "rewards-50k", 7250, 13050],
    ["2026-10-01", "rewards-100k", 14750, 26550],
    ["2026-10-08", "rewards-25k", 6650, 14250],
    ["2026-10-08", "rewards-50k", 10150, 21750],
    ["2026-10-08", "rewards-100k", 20650, 44250],
    ["2026-10-15", "rewards-25k", 8550, 19950],
    ["2026-10-15", "rewards-50k", 13050, 30450],
    ["2026-10-15", "rewards-100k", 26550, 61950],
  ];
  test.each(amounts)("prix facturés %s %s", (day, slug, unit, pack) => {
    const date = new Date(`${day}T12:00:00Z`);
    expect(getPriceForSlug(slug, 1, date)).toBe(unit);
    expect(getPriceForSlug(slug, 3, date)).toBe(pack);
  });
  test("frontière hebdomadaire après le passage à l’heure d’hiver", () => {
    expect(getScheduledPromotion(new Date("2026-10-28T22:59:59Z"))?.name).toBe("A");
    expect(getScheduledPromotion(new Date("2026-10-28T23:00:00Z"))?.name).toBe("B");
    expect(getScheduledPromotion(new Date("2026-10-25T00:59:59Z"))?.name).toBe("A");
    expect(getScheduledPromotion(new Date("2026-10-25T01:00:00Z"))?.name).toBe("A");
  });
  test.each([
    ["2026-10-01",75,85], ["2026-10-08",65,75], ["2026-10-15",55,65],
  ])("Hero synchronisé aux prix %s", (day, unit, pack) => {
    const config = {...DEFAULT_HERO_PROMOTION_CONFIG, headline:"Ancienne promotion", endsAt:"2026-09-20T00:00:00Z"};
    expect(getHeroPromotionPresentation(config, new Date(`${day}T12:00:00Z`))).toMatchObject({leftDiscount:unit,rightDiscount:pack,visible:true,headline:expect.stringContaining("Offres promotionnelles jusqu’au")});
    expect(getHeroPromotionPresentation({...config,enabled:false}, new Date(`${day}T12:00:00Z`)).visible).toBe(false);
  });
  test("références catalogue et slugs inchangés", () => {
    expect(REF_PRICES).toEqual({"rewards-25k":{unit:19000,pack3:57000},"rewards-50k":{unit:29000,pack3:87000},"rewards-100k":{unit:59000,pack3:177000}});
    expect(isPricingSlug("rewards-100k")).toBe(true);
    expect(isPricingSlug("rewards-200k")).toBe(false);
  });
});
