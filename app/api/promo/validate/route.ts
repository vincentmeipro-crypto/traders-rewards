import { NextRequest, NextResponse } from "next/server";
import { validatePromoCode } from "@/lib/promo";

// Contrat frontend préservé :
//   succès → { discount: number, code: string }
//   erreur  → { error: string }
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    const result = await validatePromoCode(code);
    if (!result.valid) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ discount: result.discountPercent, code: result.code });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
