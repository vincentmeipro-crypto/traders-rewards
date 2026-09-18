import { createAdminClient } from "@/lib/supabase/admin";
import { PROMOTION_CALENDAR_KEY, validatePromotionCalendar, resolvePromotionCalendar, type CalendarPromotion } from "@/lib/promotion-calendar";
import type { PricingSlug } from "@/lib/pricing";

export async function loadPromotionCalendar(): Promise<CalendarPromotion[]> {
  const { data, error } = await createAdminClient().from("settings").select("value").eq("key", PROMOTION_CALENDAR_KEY).maybeSingle();
  // Never silently use different prices if the persisted calendar is unavailable.
  if (error) throw new Error("Impossible de lire le calendrier des promotions");
  const result = validatePromotionCalendar(data?.value ?? []);
  if (!result.ok) throw new Error(result.error);
  return result.rows;
}

export async function savePromotionCalendar(rows: CalendarPromotion[]) {
  const { error } = await createAdminClient().from("settings").upsert({ key:PROMOTION_CALENDAR_KEY, value:rows, category:"general", description:"Périodes et remises communes au Hero et aux prix de paiement" }, { onConflict:"key" });
  if (error) throw new Error("Impossible d’enregistrer le calendrier");
}

export async function getEffectivePricingPlan(now = new Date()) {
  return resolvePromotionCalendar(await loadPromotionCalendar(), now);
}

export async function getEffectivePriceForSlug(slug: PricingSlug, quantity: 1 | 3, now = new Date()) {
  const plan = await getEffectivePricingPlan(now);
  return quantity === 3 ? plan.prices[slug].pack3 : plan.prices[slug].unit;
}
