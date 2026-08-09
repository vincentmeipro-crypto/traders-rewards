/**
 * Auth admin partagée — utilisée par toutes les routes /api/admin/*
 *
 * Deux méthodes acceptées :
 *  1. Header  x-admin-key: <ADMIN_KEY>  (page admin sans login)
 *  2. Header  Authorization: Bearer <token>  (session Supabase — compat)
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "vincentmeipro@gmail.com";
export const ADMIN_KEY   = process.env.ADMIN_KEY || "tr2026-admin-k9x";

export async function checkAdmin(
  req: NextRequest
): Promise<{ ok: boolean; userId: string | null; reason?: string }> {

  // ── Méthode 1 : clé statique (page sans login) ─────────────────
  const staticKey = req.headers.get("x-admin-key");
  if (staticKey) {
    if (staticKey === ADMIN_KEY) return { ok: true, userId: "admin-static" };
    return { ok: false, userId: null, reason: "invalid admin key" };
  }

  // ── Méthode 2 : Bearer token Supabase (compat session) ─────────
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { ok: false, userId: null, reason: "no token" };

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { ok: false, userId: null, reason: error?.message || "no user" };
  if (user.email !== ADMIN_EMAIL) return { ok: false, userId: null, reason: `email mismatch: ${user.email}` };

  return { ok: true, userId: user.id };
}
