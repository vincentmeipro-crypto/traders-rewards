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

// ── consumePromoCode — wrapper RPC atomique ───────────────────────────────────
//
// Appelle la fonction Postgres consume_promo_code() qui atomiquement :
//   1. Valide le code (actif, non expiré, max_uses disponible)
//   2. Vérifie l'idempotence (payment_reference déjà traitée → already_consumed)
//   3. Incrémente used_count avec guard WHERE (race condition impossible)
//   4. Insère une ligne promo_code_usages (même transaction)
//
// Appelé par :
//   - stripe/webhook  (provider: "stripe",  paymentReference: session.id)
//   - crypto/webhook  (provider: "crypto",  paymentReference: payment_id)
//   - promo/free      (provider: "free",    paymentReference: "free:{userId}:{code}:{productId}")
//
// NE JAMAIS appeler depuis les checkout endpoints (checkout = validation only).

export interface ConsumePromoResult {
  success:         boolean;
  alreadyConsumed: boolean;
  promoId:         string | null;
  usageId:         string | null;
  newUsedCount:    number;
  maxUsesVal:      number | null;
  discountPct:     number;
  errorCode:
    | "not_found"
    | "revoked"
    | "expired"
    | "exhausted"
    | "invalid_provider"
    | null;
}

export async function consumePromoCode(params: {
  code:              string;
  userId:            string;
  provider:          "stripe" | "crypto" | "free";
  paymentReference:  string | null;
  discountApplied:   number | null;
}): Promise<ConsumePromoResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("consume_promo_code", {
    p_code:              params.code,
    p_user_id:           params.userId,
    p_provider:          params.provider,
    p_payment_reference: params.paymentReference,
    p_discount_applied:  params.discountApplied,
  });

  if (error) throw error;

  // Supabase RPC retourne un tableau (RETURNS TABLE)
  const row = (data as ConsumeRpcRow[] | null)?.[0];
  if (!row) throw new Error("consume_promo_code returned no rows");

  return {
    success:         row.success,
    alreadyConsumed: row.already_consumed,
    promoId:         row.promo_id         ?? null,
    usageId:         row.usage_id         ?? null,
    newUsedCount:    row.new_used_count    ?? 0,
    maxUsesVal:      row.max_uses_val      ?? null,
    discountPct:     row.discount_pct      ?? 0,
    errorCode:       (row.error_code as ConsumePromoResult["errorCode"]) ?? null,
  };
}

// Type interne pour la réponse brute de la RPC Supabase
interface ConsumeRpcRow {
  success:          boolean;
  already_consumed: boolean;
  promo_id:         string | null;
  usage_id:         string | null;
  new_used_count:   number | null;
  max_uses_val:     number | null;
  discount_pct:     number | null;
  error_code:       string | null;
}
