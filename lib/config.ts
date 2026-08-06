/**
 * ============================================================
 * CONFIGURATION SERVICE — Traders Rewards V2 Phase 1
 * ============================================================
 * Point d'entrée unique pour tous les paramètres configurables.
 * Remplace les valeurs hardcodées dans le code.
 *
 * ARCHITECTURE :
 *   1. Cache in-process (5 min TTL) — évite un aller/retour Supabase par requête
 *   2. Query Supabase settings table — source de vérité
 *   3. Fallback hardcoded — production safety si Supabase indisponible
 *
 * RÈGLE CRITIQUE vs COSMÉTIQUE :
 *   - Paramètres trading/risque/argent (CRITICAL_KEYS) :
 *       → Fallback autorisé MAIS log console.error visible dans Vercel Logs
 *       → Jamais de silence sur un paramètre financier
 *   - Paramètres branding/URLs (cosmétique) :
 *       → Fallback silencieux acceptable
 *
 * MULTI-TENANT (Phase 8) :
 *   Quand le white-label arrive, ajouter un paramètre `tenantId` optionnel
 *   à getSetting(). Le cache deviendra `${tenantId}:${key}`.
 *   Cette évolution ne cassera aucun appelant existant (paramètre optionnel).
 *
 * SÉCURITÉ :
 *   Ne jamais stocker ici : Stripe keys, API keys, MetaAPI secrets,
 *   VPS credentials, MT5 passwords, tokens privés.
 *   Ces valeurs restent dans les variables d'environnement.
 * ============================================================
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────

/** Valeur d'un setting stockée en JSON dans Supabase */
export type SettingValue = string | number | boolean | Record<string, unknown>;

/** Catégories autorisées — reflète le CHECK de la table SQL */
export type SettingCategory =
  | "branding"
  | "trading"
  | "challenges"
  | "payouts"
  | "emails"
  | "general";

/** Résultat complet d'un setting tel que retourné par l'API */
export interface Setting {
  key:         string;
  value:       SettingValue;
  category:    SettingCategory;
  description: string | null;
  updated_at:  string;
  updated_by:  string | null;
}

/** Résultat d'une opération updateSetting */
export interface UpdateSettingResult {
  success: boolean;
  error?:  string;
}

// ── Clés critiques (financier / trading / risque) ─────────────
// Ces clés nécessitent un log d'erreur explicite en cas de fallback.
// Ne jamais échouer silencieusement sur un paramètre financier.
const CRITICAL_KEYS = new Set([
  "trading.mt5_group_2step",
  "trading.mt5_group_1step",
  "trading.mt5_group_funded_2step",
  "trading.mt5_group_funded_1step",
  "trading.mt5_group_disabled",
  "challenges.profit_target",
  "challenges.daily_dd_1step",
  "challenges.daily_dd_2step",
  "challenges.total_dd_default",
  "payouts.profit_split_1step",
  "payouts.profit_split_2step",
]);

// ── Defaults hardcodés (fallback de dernier recours) ──────────
// Doivent être identiques aux valeurs initiales de la migration SQL.
// Mis à jour manuellement si les defaults changent en production.
const HARDCODED_DEFAULTS: Record<string, SettingValue> = {
  // Branding
  "branding.brand_name":   "Traders Rewards",
  "branding.site_url":     "https://www.traders-rewards.eu",
  "branding.logo_url":     "https://www.traders-rewards.eu/logo-email-small.png",
  "branding.support_email":"contact@traders-rewards.eu",
  "branding.sender_name":  "Traders Rewards",
  "branding.sender_email": "contact@traders-rewards.eu",

  // Trading — MT5 Groups
  "trading.mt5_group_2step":        "HAR/MAN32/demoG1",
  "trading.mt5_group_1step":        "HAR/MAN32/demoG2",
  "trading.mt5_group_funded_2step": "HAR/MAN32/demoG3",
  "trading.mt5_group_funded_1step": "HAR/MAN32/demoG4",
  "trading.mt5_group_disabled":     "HAR/MAN32/demoG5",

  // Challenges defaults (Phase 1 — globaux uniquement)
  "challenges.profit_target":   10,
  "challenges.daily_dd_1step":   3,
  "challenges.daily_dd_2step":   5,
  "challenges.total_dd_default": 10,

  // Payouts
  "payouts.profit_split_1step": 90,
  "payouts.profit_split_2step": 80,

  // General
  "general.platform_version": "2.0",
};

// ── Validateurs par clé ───────────────────────────────────────
// Chaque validateur reçoit la valeur candidate et retourne null (OK)
// ou une chaîne d'erreur. L'API settings appelle ces validateurs
// avant d'écrire en base. Les clés inconnues sont rejetées.
type Validator = (value: SettingValue) => string | null;

function isString(v: SettingValue): v is string { return typeof v === "string"; }
function isPositiveInt(v: SettingValue): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}
function isPositiveFloat(v: SettingValue): v is number {
  return typeof v === "number" && v > 0;
}
function isPercent(min: number, max: number): Validator {
  return (v) => {
    if (!isPositiveFloat(v)) return "Doit être un nombre positif";
    if (v < min || v > max) return `Doit être entre ${min} et ${max}`;
    return null;
  };
}
function isHttpsUrl(v: SettingValue): string | null {
  if (!isString(v)) return "Doit être une chaîne de caractères";
  try {
    const url = new URL(v);
    if (url.protocol !== "https:") return "L'URL doit commencer par https://";
    return null;
  } catch {
    return "URL invalide";
  }
}
function isEmail(v: SettingValue): string | null {
  if (!isString(v)) return "Doit être une chaîne de caractères";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(v)) return "Email invalide";
  return null;
}
function isMT5Group(v: SettingValue): string | null {
  if (!isString(v)) return "Doit être une chaîne de caractères";
  if (v.trim().length === 0) return "Le groupe MT5 ne peut pas être vide";
  // Format attendu : "PREFIX/BROKER/groupName"
  if (!v.includes("/")) return "Format attendu: PREFIX/BROKER/groupName (ex: HAR/MAN32/demoG1)";
  return null;
}
function isNonEmptyString(v: SettingValue): string | null {
  if (!isString(v)) return "Doit être une chaîne de caractères";
  if (v.trim().length === 0) return "Ne peut pas être vide";
  return null;
}

export const SETTING_VALIDATORS: Record<string, Validator> = {
  // Branding
  "branding.brand_name":   isNonEmptyString,
  "branding.site_url":     isHttpsUrl,
  "branding.logo_url":     isHttpsUrl,
  "branding.support_email": isEmail,
  "branding.sender_name":  isNonEmptyString,
  "branding.sender_email": isEmail,

  // Trading — MT5 Groups
  "trading.mt5_group_2step":        isMT5Group,
  "trading.mt5_group_1step":        isMT5Group,
  "trading.mt5_group_funded_2step": isMT5Group,
  "trading.mt5_group_funded_1step": isMT5Group,
  "trading.mt5_group_disabled":     isMT5Group,

  // Challenges
  "challenges.profit_target":   isPercent(1, 50),
  "challenges.daily_dd_1step":  isPercent(1, 20),
  "challenges.daily_dd_2step":  isPercent(1, 20),
  "challenges.total_dd_default":isPercent(1, 30),

  // Payouts
  "payouts.profit_split_1step": isPercent(50, 100),
  "payouts.profit_split_2step": isPercent(50, 100),

  // General
  "general.platform_version":   isNonEmptyString,
};

/** Vérifie qu'une clé est connue et validable */
export function isKnownSettingKey(key: string): boolean {
  return key in SETTING_VALIDATORS;
}

/** Valide une valeur pour une clé donnée. Retourne null si OK, message d'erreur sinon. */
export function validateSettingValue(key: string, value: SettingValue): string | null {
  if (!isKnownSettingKey(key)) return `Clé inconnue: ${key}`;
  return SETTING_VALIDATORS[key](value);
}

// ── Cache in-process ──────────────────────────────────────────
// TTL de 5 minutes. Invalidé manuellement après une écriture.
// En production Vercel (serverless), le cache est par instance.
// Ce comportement est intentionnel : les paramètres peu fréquents
// tolèrent un délai de propagation de 5 min maximum.

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value:     SettingValue;
  expiresAt: number;
}

const settingsCache = new Map<string, CacheEntry>();

function getCached(key: string): SettingValue | undefined {
  const entry = settingsCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    settingsCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: string, value: SettingValue): void {
  settingsCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Invalide le cache pour une clé spécifique (après écriture) */
export function invalidateSettingsCache(key?: string): void {
  if (key) {
    settingsCache.delete(key);
  } else {
    settingsCache.clear();
  }
}

// ── Helpers internes ──────────────────────────────────────────

/**
 * Retourne la valeur de fallback hardcodée pour une clé.
 * Si la clé est critique, log une erreur visible dans Vercel Logs.
 * Les paramètres cosmétiques peuvent tomber en fallback silencieusement.
 */
function useFallback(key: string, reason: string): SettingValue {
  const defaultValue = HARDCODED_DEFAULTS[key];

  if (CRITICAL_KEYS.has(key)) {
    console.error(
      `[config] FALLBACK CRITIQUE — clé="${key}" | raison="${reason}" | ` +
      `valeur utilisée="${JSON.stringify(defaultValue)}" | ` +
      `ACTION REQUISE: vérifier la disponibilité de Supabase et la table settings`
    );
  }

  return defaultValue;
}

// ── API publique ──────────────────────────────────────────────

/**
 * Récupère la valeur d'un seul setting.
 *
 * Ordre de résolution :
 *   1. Cache in-process (5 min)
 *   2. Supabase (table settings)
 *   3. Fallback hardcodé (avec log si clé critique)
 *
 * @param key - Clé du setting (ex: "branding.site_url")
 * @returns La valeur du setting
 */
export async function getSetting(key: string): Promise<SettingValue> {
  // 1. Cache
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  // 2. Supabase
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("settings")
      .select("value")
      .eq("key", key)
      .single();

    if (error) throw new Error(error.message);
    if (data?.value !== undefined) {
      const value = data.value as SettingValue;
      setCached(key, value);
      return value;
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return useFallback(key, `Supabase error: ${reason}`);
  }

  // 3. Fallback (clé absente de la DB — ne devrait pas arriver après migration)
  return useFallback(key, "Clé absente de la table settings");
}

/**
 * Récupère plusieurs settings en une seule requête Supabase.
 * Retourne un objet { key: value } avec fallbacks pour les clés manquantes.
 *
 * @param keys - Tableau de clés à récupérer
 */
export async function getSettings(
  keys: string[]
): Promise<Record<string, SettingValue>> {
  const result: Record<string, SettingValue> = {};
  const missingFromCache: string[] = [];

  // Résoudre ce qui est en cache
  for (const key of keys) {
    const cached = getCached(key);
    if (cached !== undefined) {
      result[key] = cached;
    } else {
      missingFromCache.push(key);
    }
  }

  if (missingFromCache.length === 0) return result;

  // Requête Supabase pour les clés manquantes
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("settings")
      .select("key, value")
      .in("key", missingFromCache);

    if (error) throw new Error(error.message);

    const foundKeys = new Set<string>();
    for (const row of data ?? []) {
      const value = row.value as SettingValue;
      result[row.key] = value;
      setCached(row.key, value);
      foundKeys.add(row.key);
    }

    // Fallback pour les clés non trouvées
    for (const key of missingFromCache) {
      if (!foundKeys.has(key)) {
        result[key] = useFallback(key, "Clé absente de la table settings");
      }
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    for (const key of missingFromCache) {
      if (!(key in result)) {
        result[key] = useFallback(key, `Supabase error: ${reason}`);
      }
    }
  }

  return result;
}

/**
 * Récupère tous les settings d'une catégorie.
 * Utile pour l'interface admin (affichage par onglet de catégorie).
 *
 * @param category - Catégorie à charger
 */
export async function getSettingsByCategory(
  category: SettingCategory
): Promise<Setting[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("settings")
      .select("key, value, category, description, updated_at, updated_by")
      .eq("category", category)
      .order("key");

    if (error) throw new Error(error.message);
    return (data ?? []) as Setting[];
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[config] getSettingsByCategory("${category}") failed: ${reason}`);
    return [];
  }
}

/**
 * Récupère TOUS les settings (toutes catégories).
 * Utilisé par l'interface admin Settings complète.
 */
export async function getAllSettings(): Promise<Setting[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("settings")
      .select("key, value, category, description, updated_at, updated_by")
      .order("category, key");

    if (error) throw new Error(error.message);
    return (data ?? []) as Setting[];
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[config] getAllSettings() failed: ${reason}`);
    return [];
  }
}

/**
 * Met à jour un setting en base.
 * Valide la valeur avant écriture (type, plage, format).
 * Invalide le cache après écriture réussie.
 *
 * NE PAS appeler depuis le frontend — passer par l'API settings (RBAC + audit).
 *
 * @param key      - Clé du setting
 * @param value    - Nouvelle valeur
 * @param userId   - UUID de l'utilisateur qui effectue la modification (pour audit)
 */
export async function updateSetting(
  key:    string,
  value:  SettingValue,
  userId: string
): Promise<UpdateSettingResult> {
  // Validation : clé connue
  if (!isKnownSettingKey(key)) {
    return { success: false, error: `Clé inconnue: ${key}` };
  }

  // Validation : valeur
  const validationError = validateSettingValue(key, value);
  if (validationError) {
    return { success: false, error: validationError };
  }

  // Écriture via service_role (bypasse RLS)
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("settings")
      .update({
        value:      value,
        updated_by: userId,
        // updated_at est géré par le trigger SQL
      })
      .eq("key", key);

    if (error) throw new Error(error.message);

    // Invalider le cache pour cette clé uniquement
    invalidateSettingsCache(key);

    return { success: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[config] updateSetting("${key}") failed: ${reason}`);
    return { success: false, error: `Erreur interne: ${reason}` };
  }
}

// ── Helpers typés pour l'usage courant ───────────────────────
// Évitent les casts répétitifs dans les fichiers consommateurs.

/** Récupère un setting sous forme de string */
export async function getStringConfig(key: string): Promise<string> {
  const value = await getSetting(key);
  if (typeof value !== "string") {
    console.warn(`[config] getStringConfig("${key}") : valeur non-string (${typeof value}), cast forcé`);
    return String(value);
  }
  return value;
}

/** Récupère un setting sous forme de number */
export async function getNumberConfig(key: string): Promise<number> {
  const value = await getSetting(key);
  if (typeof value !== "number") {
    const num = Number(value);
    if (isNaN(num)) {
      console.error(`[config] getNumberConfig("${key}") : valeur non-numérique "${value}", fallback 0`);
      return 0;
    }
    return num;
  }
  return value;
}

// ── Exports groupés pour la compatibilité mailer / mt5 ───────
// Ces fonctions sont des raccourcis spécifiques utilisés dans lib/mailer.ts
// et lib/mt5.ts pour éviter de dupliquer les clés.

/** Config branding complète (un seul aller Supabase) */
export async function getBrandingConfig() {
  const values = await getSettings([
    "branding.brand_name",
    "branding.site_url",
    "branding.logo_url",
    "branding.support_email",
    "branding.sender_name",
    "branding.sender_email",
  ]);
  return {
    brandName:    values["branding.brand_name"]    as string,
    siteUrl:      values["branding.site_url"]      as string,
    logoUrl:      values["branding.logo_url"]      as string,
    supportEmail: values["branding.support_email"] as string,
    senderName:   values["branding.sender_name"]   as string,
    senderEmail:  values["branding.sender_email"]  as string,
  };
}

/** MT5 group map complète (un seul aller Supabase) */
export async function getMT5GroupMap(): Promise<Record<string, string>> {
  const values = await getSettings([
    "trading.mt5_group_2step",
    "trading.mt5_group_1step",
    "trading.mt5_group_funded_2step",
    "trading.mt5_group_funded_1step",
    "trading.mt5_group_disabled",
  ]);
  return {
    "2step":        values["trading.mt5_group_2step"]        as string,
    "1step":        values["trading.mt5_group_1step"]        as string,
    "funded_2step": values["trading.mt5_group_funded_2step"] as string,
    "funded_1step": values["trading.mt5_group_funded_1step"] as string,
    "disabled":     values["trading.mt5_group_disabled"]     as string,
  };
}

/** Challenge defaults (un seul aller Supabase) */
export async function getChallengeDefaults() {
  const values = await getSettings([
    "challenges.profit_target",
    "challenges.daily_dd_1step",
    "challenges.daily_dd_2step",
    "challenges.total_dd_default",
  ]);
  return {
    profitTarget:   values["challenges.profit_target"]    as number,
    dailyDd1step:   values["challenges.daily_dd_1step"]   as number,
    dailyDd2step:   values["challenges.daily_dd_2step"]   as number,
    totalDdDefault: values["challenges.total_dd_default"] as number,
  };
}

/** Payout splits (un seul aller Supabase) */
export async function getPayoutSplits() {
  const values = await getSettings([
    "payouts.profit_split_1step",
    "payouts.profit_split_2step",
  ]);
  return {
    split1step: values["payouts.profit_split_1step"] as number,
    split2step: values["payouts.profit_split_2step"] as number,
  };
}
