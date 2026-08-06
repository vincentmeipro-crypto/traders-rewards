/**
 * ============================================================
 * API ADMIN — Settings
 * ============================================================
 * GET  /api/admin/settings            → tous les settings
 * GET  /api/admin/settings?category=X → settings d'une catégorie
 * GET  /api/admin/settings?key=X      → un setting précis
 * PUT  /api/admin/settings            → body: { key, value }
 *
 * RBAC :
 *   GET  → settings.read  (admin uniquement Phase 1)
 *   PUT  → settings.update (admin uniquement Phase 1)
 *
 * PATTERN DE SÉCURITÉ :
 *   1. Authentifier (session Supabase)
 *   2. Identifier (email → rôle)
 *   3. Vérifier la permission (settings.read / settings.update)
 *   4. Valider les données (clé connue, valeur dans les bornes)
 *   5. Agir
 *
 * PROTECTION :
 *   - Frontend ne peut pas bypasser : RLS Supabase = service_role only pour écriture
 *   - Clés inconnues rejetées (liste blanche SETTING_VALIDATORS)
 *   - Valeurs validées côté serveur (type, plage, format)
 *   - Jamais de secrets dans la table settings
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllSettings,
  getSettingsByCategory,
  getSetting,
  updateSetting,
  isKnownSettingKey,
  validateSettingValue,
  type SettingCategory,
  type SettingValue,
} from "@/lib/config";
import { checkPermission } from "@/lib/rbac";

// Catégories autorisées (reflète le CHECK SQL)
const VALID_CATEGORIES = new Set<SettingCategory>([
  "branding", "trading", "challenges", "payouts", "emails", "general",
]);

// ── GET ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // 1. Auth + RBAC (Bearer token depuis admin panel ou cookie navigateur)
  const check = await checkPermission("settings.read", req);
  if (!check.authenticated) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!check.authorized) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const key      = searchParams.get("key");

  // GET ?key=branding.site_url → un seul setting
  if (key) {
    if (!isKnownSettingKey(key)) {
      return NextResponse.json({ error: `Clé inconnue: ${key}` }, { status: 400 });
    }
    const value = await getSetting(key);
    return NextResponse.json({ key, value });
  }

  // GET ?category=branding → tous les settings d'une catégorie
  if (category) {
    if (!VALID_CATEGORIES.has(category as SettingCategory)) {
      return NextResponse.json(
        { error: `Catégorie invalide: ${category}` },
        { status: 400 }
      );
    }
    const settings = await getSettingsByCategory(category as SettingCategory);
    return NextResponse.json({ settings });
  }

  // GET → tous les settings
  const settings = await getAllSettings();
  return NextResponse.json({ settings });
}

// ── PUT ───────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  // 1. Auth + RBAC (Bearer token depuis admin panel ou cookie navigateur)
  const check = await checkPermission("settings.update", req);
  if (!check.authenticated) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!check.authorized) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // 2. Parser le body
  let body: { key?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { key, value } = body;

  // 3. Validation de la clé
  if (typeof key !== "string" || key.trim() === "") {
    return NextResponse.json({ error: "Le champ 'key' est requis" }, { status: 400 });
  }
  if (!isKnownSettingKey(key)) {
    return NextResponse.json(
      { error: `Clé inconnue: ${key}. Seules les clés autorisées peuvent être modifiées.` },
      { status: 400 }
    );
  }

  // 4. Validation de la valeur (type SettingValue)
  if (value === undefined || value === null) {
    return NextResponse.json({ error: "Le champ 'value' est requis" }, { status: 400 });
  }

  const typedValue = value as SettingValue;
  const validationError = validateSettingValue(key, typedValue);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  // 5. Mise à jour avec audit (userId pour updated_by)
  const userId = check.userId!;
  const result = await updateSetting(key, typedValue, userId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Setting "${key}" mis à jour avec succès`,
  });
}
