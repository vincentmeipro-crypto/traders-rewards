import { createAdminClient } from "@/lib/supabase/admin";
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

    return getHeroPromotionPresentation(config);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[hero-promotion] lecture impossible: ${reason}`);
    return getHeroPromotionPresentation(DEFAULT_HERO_PROMOTION_CONFIG);
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

  return getHeroPromotionPresentation(config);
}
