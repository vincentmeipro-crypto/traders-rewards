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
    | "not_started_yet"
    | "expired"
    | "exhausted"
    | "invalid_discount"
    | "product_required"
    | "product_not_targeted"
    | "already_used_by_user";
  message: string;
}

export type PromoResult = PromoValidResult | PromoInvalidResult;

// Params de validatePromoCode (objet, pas une string nue)
export interface ValidatePromoParams {
  code:       string | undefined | null;
  userId?:    string | null;
  productId?: string | null;
}

// ── validatePromoCode ─────────────────────────────────────────────────────────
//
// Appelé par :
//   - /api/promo/validate   (endpoint public checkout UI)
//   - /api/stripe/checkout  (validation server-side avant session Stripe)
//   - /api/crypto/checkout  (validation server-side avant invoice NOWPayments)
//
// Validation pré-checkout : vérifications complètes mais non-atomiques.
// L'enforcement final atomique reste consumePromoCode (RPC) lors du webhook.
//
// Ordre des checks :
//   1. no_code
//   2. not_found
//   3. revoked
//   4. not_started_yet  (starts_at > now)
//   5. expired
//   6. exhausted
//   7. invalid_discount
//   8. product targeting (targeting_mode='specific')
//   9. already_used_by_user (single_use_per_user=true ET userId fourni)
//
// Race checkout/webhook : ces checks sont non-atomiques.
// Un code valide ici peut être exhausted au moment du webhook (limitation
// acceptée en 3A-2 — pas de table de réservation).

export async function validatePromoCode(
  params: ValidatePromoParams
): Promise<PromoResult> {
  const { code, userId, productId } = params;

  if (!code || !code.trim()) {
    return { valid: false, error: "no_code", message: "No code provided" };
  }

  const normalized = code.toUpperCase().trim();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("promo_codes")
    .select(
      "id, code, discount_percent, active, starts_at, expires_at, max_uses, used_count, single_use_per_user, targeting_mode"
    )
    .eq("code", normalized)
    .single();

  if (error || !data) {
    return { valid: false, error: "not_found", message: "Invalid code" };
  }

  if (!data.active) {
    return { valid: false, error: "revoked", message: "Code revoked" };
  }

  if (data.starts_at && new Date(data.starts_at as string) > new Date()) {
    return {
      valid: false,
      error: "not_started_yet",
      message: "Code not yet active",
    };
  }

  if (data.expires_at && new Date(data.expires_at as string) < new Date()) {
    return { valid: false, error: "expired", message: "Code expired" };
  }

  if (
    data.max_uses !== null &&
    (data.used_count as number) >= (data.max_uses as number)
  ) {
    return { valid: false, error: "exhausted", message: "Code limit reached" };
  }

  if (
    (data.discount_percent as number) <= 0 ||
    (data.discount_percent as number) > 100
  ) {
    return { valid: false, error: "invalid_discount", message: "Invalid discount" };
  }

  // ── Product targeting ─────────────────────────────────────────────────────
  //
  // Même sémantique que la RPC — fail-closed :
  //   targeting_mode = 'all'      → aucune restriction
  //   targeting_mode = 'specific' + productId absent → product_required
  //   targeting_mode = 'specific' + produit non ciblé → product_not_targeted
  //
  if (data.targeting_mode === "specific") {
    if (!productId) {
      return {
        valid: false,
        error: "product_required",
        message: "Product required for this code",
      };
    }

    const { data: row } = await admin
      .from("promo_code_products")
      .select("product_id")
      .eq("promo_code_id", data.id as string)
      .eq("product_id", productId)
      .maybeSingle();

    if (!row) {
      return {
        valid: false,
        error: "product_not_targeted",
        message: "Code not valid for this product",
      };
    }
  }

  // ── Single use pre-check (non-atomique) ───────────────────────────────────
  //
  // Optimisation UX : évite de créer une session de paiement avec une promo
  // déjà consommée par cet utilisateur.
  // L'enforcement atomique reste l'index unique partiel en DB :
  //   promo_usages_single_use_idx ON (promo_code_id, user_id) WHERE single_use_enforced.
  //
  if (data.single_use_per_user && userId) {
    const { data: existingUsage } = await admin
      .from("promo_code_usages")
      .select("id")
      .eq("promo_code_id", data.id as string)
      .eq("user_id", userId)
      .eq("single_use_enforced", true)
      .maybeSingle();

    if (existingUsage) {
      return {
        valid: false,
        error: "already_used_by_user",
        message: "Code already used by this account",
      };
    }
  }

  return {
    valid: true,
    discountPercent: data.discount_percent as number,
    code: data.code as string,
  };
}

// ── consumePromoCode — wrapper RPC atomique ───────────────────────────────────
//
// Appelle la fonction Postgres consume_promo_code() qui atomiquement :
//   1. Valide le code (actif, starts_at, non expiré, max_uses, targeting, single_use)
//   2. Vérifie l'idempotence (payment_reference → already_consumed)
//   3. Incrémente used_count avec guard WHERE (race impossible)
//   4. Insère promo_code_usages avec single_use_enforced propagé
//
// Appelé par :
//   - stripe/webhook  (provider: "stripe",  paymentReference: session.id)
//   - crypto/webhook  (provider: "crypto",  paymentReference: payment_id)
//   - promo/free      (provider: "free",    paymentReference: "free:{userId}:{code}:{productId}")
//
// productId : NULL autorisé uniquement pour targeting_mode='all'.
// Pour targeting_mode='specific', la RPC retourne product_required si null.
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
    | "not_started_yet"
    | "expired"
    | "exhausted"
    | "invalid_provider"
    | "payment_reference_conflict"
    | "product_required"
    | "product_not_targeted"
    | "already_used_by_user"
    | null;
}

export async function consumePromoCode(params: {
  code:              string;
  userId:            string;
  provider:          "stripe" | "crypto" | "free";
  paymentReference:  string | null;
  discountApplied:   number | null;
  productId:         string | null;   // requis — null autorisé pour targeting_mode='all'
}): Promise<ConsumePromoResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("consume_promo_code", {
    p_code:              params.code,
    p_user_id:           params.userId,
    p_provider:          params.provider,
    p_payment_reference: params.paymentReference,
    p_discount_applied:  params.discountApplied,
    p_product_id:        params.productId ?? null,
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
