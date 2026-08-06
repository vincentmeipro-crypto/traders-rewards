/**
 * ============================================================
 * PRODUCT ENGINE — Traders Rewards V2 Phase 2B
 * ============================================================
 * Source de vérité unique pour tous les accès aux produits.
 *
 * Utilisé par :
 *   - app/api/stripe/checkout   → getEffectivePrice()
 *   - app/api/stripe/webhook    → loadProductFull() + buildRulesSnapshot() + getPhase1Defaults()
 *   - app/api/crypto/checkout   → getEffectivePrice()
 *   - app/api/crypto/webhook    → idem stripe/webhook
 *   - app/api/promo/free        → idem stripe/webhook
 *   - app/api/products          → loadAllActiveProducts()
 *
 * RÈGLES ABSOLUES :
 *   - loadProduct*() vérifient toujours active=true.
 *   - Le prix est lu depuis la DB — jamais depuis le frontend.
 *   - buildRulesSnapshot() produit un JSON immuable (trigger DB).
 *   - getPhase1Defaults() alimente les colonnes que metaapi/sync lit
 *     directement : profit_target, daily_drawdown_limit, total_drawdown_limit.
 *     Ces colonnes ne doivent JAMAIS être NULL pour un challenge actif.
 *
 * INTOUCHABLE :
 *   - app/api/metaapi/sync/route.ts
 *   - app/api/cron/mt5-snapshot/route.ts
 * ============================================================
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────

export interface ChallengeProduct {
  id:                  string;
  slug:                string;
  name:                string;
  description:         string | null;
  model:               "1step" | "2step" | "vip";
  account_size:        string;
  balance_usd:         number;
  price_eur_cents:     number;
  price_crypto_cents:  number | null;   // NULL = identique à price_eur_cents
  currency:            string;
  active:              boolean;
  display_order:       number;
  max_cumul_usd:       number | null;
  leverage:            number;
  mt5_group_challenge: string | null;   // NULL = depuis settings table
  mt5_group_funded:    string | null;   // NULL = depuis settings table
  version:             number;
  created_at:          string;
  updated_at:          string;
}

export interface ChallengeProductPhase {
  id:               string;
  product_id:       string;
  phase_order:      number;
  phase_label:      string;
  phase_type:       "challenge" | "funded";
  profit_target:    number | null;   // NULL pour le funded
  daily_drawdown:   number;
  total_drawdown:   number;
  min_trading_days: number;
  max_trading_days: number | null;   // NULL = illimité
  profit_split:     number | null;   // % part trader (funded seulement)
  mt5_group:        string | null;
}

export interface ChallengeProductRule {
  id:          string;
  product_id:  string;
  rule_key:    string;
  rule_value:  unknown;
  enabled:     boolean;
  description: string | null;
}

/** Snapshot immuable stocké dans challenges.rules_snapshot à l'achat. */
export interface RulesSnapshot {
  product_id:       string;
  product_slug:     string;
  product_name:     string;
  model:            string;
  account_size:     string;
  balance_usd:      number;
  price_paid_cents: number;       // Prix réellement payé (après promo)
  leverage:         number;
  phases: Array<{
    order:            number;
    label:            string;
    type:             string;
    profit_target:    number | null;
    daily_drawdown:   number;
    total_drawdown:   number;
    min_trading_days: number;
    max_trading_days: number | null;
    profit_split:     number | null;
  }>;
  rules:       Record<string, unknown>;
  snapshot_at: string;
}

/**
 * Valeurs extraites de Phase 1 pour alimenter les colonnes
 * que metaapi/sync lit directement sur la table challenges.
 * Ces valeurs sont la vérité opérationnelle du Risk Engine.
 */
export interface Phase1ChallengeDefaults {
  profit_target:        number;
  daily_drawdown_limit: number;
  total_drawdown_limit: number;
}

/** Produit + phases + règles — résultat complet pour les webhooks. */
export interface FullProduct {
  product: ChallengeProduct;
  phases:  ChallengeProductPhase[];
  rules:   ChallengeProductRule[];
}


// ── Chargement individuel ──────────────────────────────────────

/**
 * Charge un produit par UUID.
 * Vérifie que le produit existe et est actif.
 * Lève une erreur explicite pour les webhooks.
 */
export async function loadProduct(productId: string): Promise<ChallengeProduct> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("challenge_products")
    .select("*")
    .eq("id", productId)
    .eq("active", true)
    .single();

  if (error || !data) {
    throw new Error(
      `[ProductEngine] Produit introuvable ou inactif (id: ${productId})`
    );
  }
  return data as ChallengeProduct;
}

/**
 * Charge un produit par slug.
 * Utilisé lors de la transition depuis l'ancien système slug-based.
 */
export async function loadProductBySlug(slug: string): Promise<ChallengeProduct> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("challenge_products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error || !data) {
    throw new Error(
      `[ProductEngine] Produit introuvable ou inactif (slug: ${slug})`
    );
  }
  return data as ChallengeProduct;
}

/**
 * Charge toutes les phases d'un produit, triées par phase_order.
 */
export async function loadProductPhases(
  productId: string
): Promise<ChallengeProductPhase[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("challenge_product_phases")
    .select("*")
    .eq("product_id", productId)
    .order("phase_order", { ascending: true });

  if (error) {
    throw new Error(
      `[ProductEngine] Erreur chargement phases (product_id: ${productId}): ${error.message}`
    );
  }
  return (data ?? []) as ChallengeProductPhase[];
}

/**
 * Charge toutes les règles actives d'un produit.
 */
export async function loadProductRules(
  productId: string
): Promise<ChallengeProductRule[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("challenge_product_rules")
    .select("*")
    .eq("product_id", productId)
    .eq("enabled", true);

  if (error) {
    throw new Error(
      `[ProductEngine] Erreur chargement règles (product_id: ${productId}): ${error.message}`
    );
  }
  return (data ?? []) as ChallengeProductRule[];
}


// ── Chargement complet (point d'entrée principal) ──────────────

/**
 * Charge produit + phases + règles en parallèle.
 * Point d'entrée principal pour les webhooks Stripe, Crypto et promo/free.
 */
export async function loadProductFull(productId: string): Promise<FullProduct> {
  const product = await loadProduct(productId);
  const [phases, rules] = await Promise.all([
    loadProductPhases(product.id),
    loadProductRules(product.id),
  ]);
  return { product, phases, rules };
}

/**
 * Même chose, par slug (compatibilité transition).
 */
export async function loadProductFullBySlug(slug: string): Promise<FullProduct> {
  const product = await loadProductBySlug(slug);
  const [phases, rules] = await Promise.all([
    loadProductPhases(product.id),
    loadProductRules(product.id),
  ]);
  return { product, phases, rules };
}


// ── Prix ──────────────────────────────────────────────────────

/**
 * Retourne le prix effectif en centimes selon le moyen de paiement.
 * Si price_crypto_cents est NULL (cas normal = prix unifiés),
 * retourne price_eur_cents dans tous les cas.
 *
 * Garantit : une seule source de vérité, aucune divergence possible.
 */
export function getEffectivePrice(
  product: ChallengeProduct,
  method: "card" | "crypto"
): number {
  if (method === "crypto" && product.price_crypto_cents !== null) {
    return product.price_crypto_cents;
  }
  return product.price_eur_cents;
}


// ── Snapshot ──────────────────────────────────────────────────

/**
 * Construit le snapshot immuable à stocker dans challenges.rules_snapshot.
 *
 * Appelé UNE SEULE FOIS dans le webhook, au moment de l'achat.
 * Jamais modifié ensuite (garanti par le trigger DB trg_lock_rules_snapshot).
 *
 * @param product         Produit chargé depuis la DB
 * @param phases          Toutes les phases, triées par phase_order
 * @param rules           Règles actives du produit
 * @param pricePaidCents  Prix réellement payé (après promo éventuelle)
 */
export function buildRulesSnapshot(
  product:         ChallengeProduct,
  phases:          ChallengeProductPhase[],
  rules:           ChallengeProductRule[],
  pricePaidCents:  number
): RulesSnapshot {
  // Convertir les règles en objet clé→valeur
  const rulesMap: Record<string, unknown> = {};
  for (const rule of rules) {
    rulesMap[rule.rule_key] = rule.rule_value;
  }

  return {
    product_id:       product.id,
    product_slug:     product.slug,
    product_name:     product.name,
    model:            product.model,
    account_size:     product.account_size,
    balance_usd:      product.balance_usd,
    price_paid_cents: pricePaidCents,
    leverage:         product.leverage,
    phases: phases.map((ph) => ({
      order:            ph.phase_order,
      label:            ph.phase_label,
      type:             ph.phase_type,
      profit_target:    ph.profit_target,
      daily_drawdown:   ph.daily_drawdown,
      total_drawdown:   ph.total_drawdown,
      min_trading_days: ph.min_trading_days,
      max_trading_days: ph.max_trading_days,
      profit_split:     ph.profit_split,
    })),
    rules:       rulesMap,
    snapshot_at: new Date().toISOString(),
  };
}


// ── Valeurs opérationnelles Phase 1 ───────────────────────────

/**
 * Extrait les valeurs de Phase 1 pour alimenter les colonnes
 * que metaapi/sync lit directement sur la table challenges :
 *   - challenges.profit_target
 *   - challenges.daily_drawdown_limit
 *   - challenges.total_drawdown_limit
 *
 * CRITIQUE : si la Phase 1 est absente ou corrompue, lève une erreur
 * explicite plutôt que de créer un challenge avec des valeurs NULL.
 * Un challenge sans règles opérationnelles ne doit jamais exister.
 */
export function getPhase1Defaults(
  phases: ChallengeProductPhase[]
): Phase1ChallengeDefaults {
  const phase1 = phases.find(
    (ph) => ph.phase_order === 1 && ph.phase_type === "challenge"
  );

  if (!phase1) {
    throw new Error(
      "[ProductEngine] Phase 1 introuvable — impossible de créer le challenge sans règles opérationnelles"
    );
  }
  if (phase1.profit_target === null) {
    throw new Error(
      "[ProductEngine] profit_target NULL en Phase 1 — données produit corrompues"
    );
  }

  return {
    profit_target:        phase1.profit_target,
    daily_drawdown_limit: phase1.daily_drawdown,
    total_drawdown_limit: phase1.total_drawdown,
  };
}


// ── Chargement bulk pour l'API publique ───────────────────────

/**
 * Charge tous les produits actifs avec leurs phases et règles.
 * Utilisé par GET /api/products (Pricing page, Checkout page).
 *
 * Optimisé : 3 requêtes totales (pas N×2), résultats groupés par produit.
 */
export async function loadAllActiveProducts(): Promise<FullProduct[]> {
  const admin = createAdminClient();

  const { data: products, error: prodError } = await admin
    .from("challenge_products")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (prodError) {
    throw new Error(
      `[ProductEngine] Erreur chargement produits actifs: ${prodError.message}`
    );
  }
  if (!products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  const [phasesResult, rulesResult] = await Promise.all([
    admin
      .from("challenge_product_phases")
      .select("*")
      .in("product_id", productIds)
      .order("phase_order", { ascending: true }),
    admin
      .from("challenge_product_rules")
      .select("*")
      .in("product_id", productIds)
      .eq("enabled", true),
  ]);

  if (phasesResult.error) {
    throw new Error(
      `[ProductEngine] Erreur chargement phases: ${phasesResult.error.message}`
    );
  }
  if (rulesResult.error) {
    throw new Error(
      `[ProductEngine] Erreur chargement règles: ${rulesResult.error.message}`
    );
  }

  const allPhases = (phasesResult.data ?? []) as ChallengeProductPhase[];
  const allRules  = (rulesResult.data  ?? []) as ChallengeProductRule[];

  return (products as ChallengeProduct[]).map((product) => ({
    product,
    phases: allPhases.filter((ph) => ph.product_id === product.id),
    rules:  allRules.filter((r)  => r.product_id  === product.id),
  }));
}
