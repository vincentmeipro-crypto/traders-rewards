import { parisDay, resolvePromotionCalendar, validatePromotionCalendar, type CalendarPromotion } from "@/lib/promotion-calendar";
import { getHeroPromotionPresentation, DEFAULT_HERO_PROMOTION_CONFIG } from "@/lib/hero-promotion-config";

const row = (patch: Partial<CalendarPromotion> = {}): CalendarPromotion => ({id:"one",label:"Semaine spéciale",startDate:"2026-10-01",endDate:"2026-10-07",unitDiscount:40,packDiscount:50,enabled:true,...patch});

describe("Calendrier de promotions",()=>{
  test.each([null,{},[row({endDate:"2026-02-30"})],[row({startDate:"2026-10-08"})],[row({unitDiscount:100})],[row({packDiscount:-1})],[row({unitDiscount:NaN})],[row({label:" "})],[row(),row()]])("rejette une saisie invalide %p",value=>{
    expect(validatePromotionCalendar(value).ok).toBe(false);
  });
  test("dates inclusives : chevauchement interdit, jours consécutifs acceptés",()=>{
    expect(validatePromotionCalendar([row(),row({id:"two",startDate:"2026-10-07",endDate:"2026-10-14"})]).ok).toBe(false);
    expect(validatePromotionCalendar([row(),row({id:"two",startDate:"2026-10-08",endDate:"2026-10-14"})]).ok).toBe(true);
    expect(validatePromotionCalendar([row(),row({id:"two",enabled:false})]).ok).toBe(true);
  });
  test("priorité personnalisée sur les trois tailles et le Hero",()=>{
    const now=new Date("2026-10-01T10:00:00Z");
    const plan=resolvePromotionCalendar([row()],now);
    expect(plan.prices).toEqual({"rewards-25k":{unit:11400,pack3:28500},"rewards-50k":{unit:17400,pack3:43500},"rewards-100k":{unit:35400,pack3:88500}});
    expect(getHeroPromotionPresentation(DEFAULT_HERO_PROMOTION_CONFIG,now,plan.promotion)).toMatchObject({leftDiscount:40,rightDiscount:50,headline:"Offres promotionnelles jusqu’au 07/10/2026 inclus"});
  });
  test("minuit Paris de début et lendemain de fin",()=>{
    const rows=[row()];
    expect(resolvePromotionCalendar(rows,new Date("2026-09-30T21:59:59Z")).custom).toBeNull();
    expect(resolvePromotionCalendar(rows,new Date("2026-09-30T22:00:00Z")).custom?.id).toBe("one");
    expect(resolvePromotionCalendar(rows,new Date("2026-10-07T21:59:59Z")).custom?.id).toBe("one");
    expect(resolvePromotionCalendar(rows,new Date("2026-10-07T22:00:00Z")).prices["rewards-25k"].unit).toBe(6650);
  });
  test("dates de Paris après le changement d’heure",()=>{
    expect(parisDay(new Date("2026-10-25T22:59:59Z"))).toBe("2026-10-25");
    expect(parisDay(new Date("2026-10-25T23:00:00Z"))).toBe("2026-10-26");
    expect(resolvePromotionCalendar([row({startDate:"2026-10-25",endDate:"2026-10-25"})],new Date("2026-10-25T22:59:59Z")).custom).not.toBeNull();
  });
  test("désactivation, trou et calendrier vide retrouvent la rotation 2027",()=>{
    const now=new Date("2027-01-01T12:00:00Z");
    for(const rows of [[],[row()],[row({enabled:false,startDate:"2027-01-01",endDate:"2027-01-02"})]]){
      expect(resolvePromotionCalendar(rows,now).prices["rewards-25k"]).toEqual({unit:6650,pack3:17100});
    }
  });
  test("0 % signifie prix catalogue",()=>{
    const rows=[row({unitDiscount:0,packDiscount:0})];
    expect(validatePromotionCalendar(rows).ok).toBe(true);
    expect(resolvePromotionCalendar(rows,new Date("2026-10-03T12:00:00Z")).prices["rewards-25k"]).toEqual({unit:19000,pack3:57000});
  });
});
