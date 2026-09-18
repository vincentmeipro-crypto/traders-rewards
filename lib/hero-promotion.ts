import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectivePricingPlan } from "@/lib/promotion-calendar-store";
import {
  DEFAULT_HERO_PROMOTION_CONFIG,
  HERO_PROMOTION_DESCRIPTION,
  HERO_PROMOTION_SETTING_KEY,
  getHeroPromotionPresentation,
  normalizeHeroPromotionConfig,
  type HeroPromotionConfig,
  type HeroPromotionPresentation,
} from "@/lib/hero-promotion-config";

export async function getHeroPromotion(): Promise<HeroPromotionPresentation> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("settings")
      .select("value")
      .eq("key", HERO_PROMOTION_SETTING_KEY)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const config = data
      ? normalizeHeroPromotionConfig(data.value)
      : DEFAULT_HERO_PROMOTION_CONFIG;

    const now = new Date();
    const plan = await getEffectivePricingPlan(now);
    return getHeroPromotionPresentation(config, now, plan.promotion);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[hero-promotion] lecture impossible: ${reason}`);
    return { ...DEFAULT_HERO_PROMOTION_CONFIG, status: "disabled", visible: false };
  }
}

export async function saveHeroPromotion(
  config: HeroPromotionConfig
): Promise<HeroPromotionPresentation> {
  const admin = createAdminClient();
  const { error } = await admin.from("settings").upsert(
    {
      key: HERO_PROMOTION_SETTING_KEY,
      value: config,
      category: "general",
      description: HERO_PROMOTION_DESCRIPTION,
    },
    { onConflict: "key" }
  );

  if (error) throw new Error(error.message);

  const now = new Date();
  const plan = await getEffectivePricingPlan(now);
  return getHeroPromotionPresentation(config, now, plan.promotion);
}
