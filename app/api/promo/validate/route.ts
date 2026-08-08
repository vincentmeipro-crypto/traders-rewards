import { NextRequest, NextResponse } from "next/server";
import { validatePromoCode } from "@/lib/promo";

// Contrat frontend préservé :
//   succès → { discount: number, code: string }
//   erreur  → { error: string, errorCode?: string }
//
// userId et productId optionnels : activent la validation
// single_use_per_user et product targeting si fournis.
export async function POST(req: NextRequest) {
  try {
    const { code, userId, productId } = await req.json();
    const result = await validatePromoCode({
      code,
      userId:    userId    ?? null,
      productId: productId ?? null,
    });
    if (!result.valid) {
      return NextResponse.json(
        { error: result.message, errorCode: result.error },
        { status: 400 }
      );
    }
    return NextResponse.json({ discount: result.discountPercent, code: result.code });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
