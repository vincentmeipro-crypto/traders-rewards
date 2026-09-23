import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/admin/promotion-calendar/route";
import { getEffectivePriceForSlug, loadPromotionCalendar } from "@/lib/promotion-calendar-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/admin-auth";

jest.mock("@/lib/supabase/admin",()=>({createAdminClient:jest.fn()}));
jest.mock("@/lib/admin-auth",()=>({checkAdmin:jest.fn()}));
const rows=[{id:"test",label:"Promotion test",startDate:"2026-11-01",endDate:"2026-11-30",unitDiscount:40,packDiscount:50,enabled:true}];
let saved: unknown;
let readError: unknown;
let writeError: unknown;
const upsert=jest.fn(async(payload:{value:unknown})=>{if(!writeError)saved=payload.value;return {error:writeError};});
beforeEach(()=>{
 saved=null;readError=null;writeError=null;jest.clearAllMocks();
 jest.mocked(checkAdmin).mockResolvedValue({ok:true,userId:"test-admin",email:"admin@test"});
 jest.mocked(createAdminClient).mockReturnValue({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:saved===null?null:{value:saved},error:readError})})}),upsert})} as unknown as ReturnType<typeof createAdminClient>);
});
const request=(value:unknown)=>new NextRequest("http://localhost/api/admin/promotion-calendar",{method:"PUT",body:JSON.stringify(value)});
test("enregistrement puis relecture et tarification utilisent le même calendrier",async()=>{
 expect((await PUT(request({rows}))).status).toBe(200);
 expect((await (await GET(new NextRequest("http://localhost"))).json()).rows).toEqual(rows);
 const date=new Date("2026-11-15T12:00:00Z");
 expect(await getEffectivePriceForSlug("rewards-100k",3,date)).toBe(88500);
 expect(await getEffectivePriceForSlug("rewards-100k",1,date)).toBe(35400);
 expect(upsert).toHaveBeenCalledTimes(1);
});
test("échec de lecture bloque le prix au lieu d’appliquer une remise différente",async()=>{
 readError={message:"Unavailable"};
 await expect(getEffectivePriceForSlug("rewards-25k",1)).rejects.toThrow();
 expect((await GET(new NextRequest("http://localhost"))).status).toBe(503);
});
test("refuse les écritures invalides sans toucher au stockage",async()=>{
 expect((await PUT(request({rows:[...rows,{...rows[0],id:"other"}]}))).status).toBe(400);
 expect(upsert).not.toHaveBeenCalled();
});
test("API protégée en lecture et écriture",async()=>{
 jest.mocked(checkAdmin).mockResolvedValue({ok:false,userId:null,email:null});
 expect((await GET(new NextRequest("http://localhost"))).status).toBe(401);
 expect((await PUT(request({rows}))).status).toBe(401);
 expect(createAdminClient).not.toHaveBeenCalled();
});
test("stockage absent utilise la rotation, stockage corrompu échoue",async()=>{
 expect(await loadPromotionCalendar()).toEqual([]);
 saved={invalid:true};await expect(loadPromotionCalendar()).rejects.toThrow();
});
test("échec d’enregistrement signalé",async()=>{
 writeError={message:"Unavailable"};
 expect((await PUT(request({rows}))).status).toBe(503);
 expect(saved).toBeNull();
});
