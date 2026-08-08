import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PromoValidResult {
  valid: true;
  discountPercent: number;
  code: string; // normalisé UPPERCASE
}

export interface PromoInvalidResult {
  valid: false;
  error:
    | "no_code"
    | "not_found"
    | "revoked"
    | "expired"
    | "exhausted"
    | "invalid_discount";
  message: string;
}

export type PromoResult = PromoValidResult | PromoInvalidResult;

// ── Validator partagé ─────────────────────────────────────────────────────────
//
// Appelé par :
//   - /api/promo/validate   (endpoint public checkout UI)
//   - /api/stripe/checkout  (validation server-side avant session Stripe)
//   - /api/crypto/checkout  (validation server-side avant invoice NOWPayments)
//
// NE fait PAS :
//   - incrémenter used_count (responsabilité du webhook post-paiement)
//   - vérifier le ciblage produit (feature future P2)
//   - vérifier single_use_per_user (feature future P1)

export async function validatePromoCode(
  code: string | undefined | null
): Promise<PromoResult> {
  if (!code || !code.trim()) {
    return { valid: false, error: "no_code", message: "No code provided" };
  }

  const normalized = code.toUpperCase().trim();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("promo_codes")
    .select("code, discount_percent, active, expires_at, max_uses, used_count")
    .eq("code", normalized)
    .single();

  if (error || !data) {
    return { valid: false, error: "not_found", message: "Invalid code" };
  }

  if (!data.active) {
    return { valid: false, error: "revoked", message: "Code revoked" };
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: "expired", message: "Code expired" };
  }

  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    return { valid: false, error: "exhausted", message: "Code limit reached" };
  }

  if (data.discount_percent <= 0 || data.discount_percent > 100) {
    return {
      valid: false,
      error: "invalid_discount",
      message: "Invalid discount",
    };
  }

  return {
    valid: true,
    discountPercent: data.discount_percent,
    code: data.code as string,
  };
}
