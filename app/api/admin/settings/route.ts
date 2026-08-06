/**
 * API ADMIN — Settings
 * GET  /api/admin/settings            → tous les settings
 * GET  /api/admin/settings?category=X → settings d'une catégorie
 * GET  /api/admin/settings?key=X      → un setting précis
 * PUT  /api/admin/settings            → body: { key, value }
 *
 * Auth : même pattern que les autres routes admin (Bearer token + email check)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "vincentmeipro@gmail.com";

async function checkAdmin(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { ok: false, userId: null as string | null };
  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { ok: false, userId: null as string | null };
  if (user.email !== ADMIN_EMAIL) return { ok: false, userId: null as string | null };
  return { ok: true, userId: user.id };
}

const VALID_CATEGORIES = new Set<SettingCategory>([
  "branding", "trading", "challenges", "payouts", "emails", "general",
]);

// ── GET ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await checkAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const key      = searchParams.get("key");

  if (key) {
    if (!isKnownSettingKey(key)) {
      return NextResponse.json({ error: `Clé inconnue: ${key}` }, { status: 400 });
    }
    const value = await getSetting(key);
    return NextResponse.json({ key, value });
  }

  if (category) {
    if (!VALID_CATEGORIES.has(category as SettingCategory)) {
      return NextResponse.json({ error: `Catégorie invalide: ${category}` }, { status: 400 });
    }
    const settings = await getSettingsByCategory(category as SettingCategory);
    return NextResponse.json({ settings });
  }

  const settings = await getAllSettings();
  return NextResponse.json({ settings });
}

// ── PUT ───────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const auth = await checkAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  let body: { key?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { key, value } = body;

  if (typeof key !== "string" || key.trim() === "") {
    return NextResponse.json({ error: "Le champ 'key' est requis" }, { status: 400 });
  }
  if (!isKnownSettingKey(key)) {
    return NextResponse.json({ error: `Clé inconnue: ${key}` }, { status: 400 });
  }
  if (value === undefined || value === null) {
    return NextResponse.json({ error: "Le champ 'value' est requis" }, { status: 400 });
  }

  const typedValue = value as SettingValue;
  const validationError = validateSettingValue(key, typedValue);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 422 });
  }

  const result = await updateSetting(key, typedValue, auth.userId!);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `Setting "${key}" mis à jour` });
}
