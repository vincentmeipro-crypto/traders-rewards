import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import {
  getHeroPromotion,
  saveHeroPromotion,
} from "@/lib/hero-promotion";
import { validateHeroPromotionConfig } from "@/lib/hero-promotion-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const promotion = await getHeroPromotion();
  return NextResponse.json(promotion, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function PUT(req: NextRequest) {
  if (!(await checkAdmin(req)).ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const validation = validateHeroPromotionConfig(body);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.errors.join(" · "),
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  try {
    const promotion = await saveHeroPromotion(validation.value);
    return NextResponse.json(promotion, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[hero-promotion] enregistrement impossible: ${reason}`);
    return NextResponse.json(
      { error: "Impossible d’enregistrer la Promotion Hero" },
      { status: 500 }
    );
  }
}
