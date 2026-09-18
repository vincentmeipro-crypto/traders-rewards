import { getActivePricingPlan, getScheduledPromotion, REF_PRICES, type PriceEntry, type PricingSlug } from "@/lib/pricing";

export const PROMOTION_CALENDAR_KEY = "general.promotion_calendar";
export interface CalendarPromotion {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  unitDiscount: number;
  packDiscount: number;
  enabled: boolean;
}

export function parisDay(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validatePromotionCalendar(value: unknown): { ok: true; rows: CalendarPromotion[] } | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length > 104) return { ok: false, error: "Le calendrier accepte au maximum 104 promotions." };
  const ids = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const row = value[i];
    const fail = (message: string) => ({ ok: false as const, error: `Ligne ${i + 1} : ${message}` });
    if (!row || typeof row !== "object") return fail("promotion invalide.");
    if (typeof row.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(row.id) || ids.has(row.id)) return fail("identifiant invalide ou dupliqué.");
    ids.add(row.id);
    if (typeof row.label !== "string" || !row.label.trim() || row.label.trim().length > 80) return fail("indiquez un libellé de 1 à 80 caractères.");
    if (!validDay(row.startDate) || !validDay(row.endDate)) return fail("dates invalides.");
    if (row.endDate < row.startDate) return fail("la fin doit être postérieure ou égale au début.");
    if (typeof row.enabled !== "boolean") return fail("activation invalide.");
    if (![row.unitDiscount, row.packDiscount].every(n => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 99)) return fail("les remises doivent être des entiers entre 0 et 99 %.");
  }
  const rows: CalendarPromotion[] = value.map(r => ({ id:r.id, label:r.label.trim(), startDate:r.startDate, endDate:r.endDate, unitDiscount:r.unitDiscount, packDiscount:r.packDiscount, enabled:r.enabled }));
  const active = rows.filter(r => r.enabled).sort((a,b) => a.startDate.localeCompare(b.startDate));
  for (let i = 1; i < active.length; i++) {
    if (active[i].startDate <= active[i-1].endDate) return { ok: false, error: `Les périodes « ${active[i-1].label} » et « ${active[i].label} » se chevauchent. Les dates de fin sont inclusives.` };
  }
  return { ok: true, rows: rows.sort((a,b) => a.startDate.localeCompare(b.startDate)) };
}

export function resolvePromotionCalendar(rows: CalendarPromotion[], now = new Date()) {
  const day = parisDay(now);
  const active = rows.find(r => r.enabled && r.startDate <= day && day <= r.endDate);
  if (!active) return { ...getActivePricingPlan(now), promotion: getScheduledPromotion(now), custom: null };
  const prices = Object.fromEntries(Object.entries(REF_PRICES).map(([slug, ref]) => [slug, {
    unit: Math.round(ref.unit * (100 - active.unitDiscount) / 100),
    pack3: Math.round(ref.pack3 * (100 - active.packDiscount) / 100),
  }])) as Record<PricingSlug, PriceEntry>;
  const [y,m,d] = active.endDate.split("-");
  return { periodName: `calendar-${active.id}`, prices, custom: active,
    promotion: { name:active.label, unitDiscount:active.unitDiscount, packDiscount:active.packDiscount, endsOn:`${d}/${m}/${y}` } };
}
