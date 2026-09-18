import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { loadPromotionCalendar, savePromotionCalendar } from "@/lib/promotion-calendar-store";
import { validatePromotionCalendar } from "@/lib/promotion-calendar";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control":"no-store, max-age=0" };

export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({error:"Unauthorized"},{status:401});
  try { return NextResponse.json({rows:await loadPromotionCalendar()},{headers}); }
  catch { return NextResponse.json({error:"Impossible de charger le calendrier"},{status:503,headers}); }
}

export async function PUT(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) return NextResponse.json({error:"Unauthorized"},{status:401});
  let body: unknown;
  try { body=await req.json(); } catch { return NextResponse.json({error:"Corps JSON invalide"},{status:400}); }
  const result=validatePromotionCalendar(body && typeof body === "object" && "rows" in body ? body.rows : null);
  if (!result.ok) return NextResponse.json({error:result.error},{status:400});
  try {
    await savePromotionCalendar(result.rows);
    return NextResponse.json({rows:result.rows},{headers});
  } catch { return NextResponse.json({error:"Impossible d’enregistrer le calendrier"},{status:503,headers}); }
}
