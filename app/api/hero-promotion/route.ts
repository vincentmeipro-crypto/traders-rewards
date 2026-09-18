import { NextResponse } from "next/server";
import { getHeroPromotion } from "@/lib/hero-promotion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const promotion = await getHeroPromotion();

  return NextResponse.json(promotion, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
