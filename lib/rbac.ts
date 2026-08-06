/**
 * ============================================================
 * RBAC — Role-Based Access Control — Phase 1 minimal
 * ============================================================
 * Phase 1 : authentification → identification → rôle → permission
 *
 * Supporte deux modes d'authentification :
 *   1. Bearer token (Authorization header) — admin panel fetch
 *   2. Session cookie — accès navigateur direct
 *
 * Phase 1.2 (évolution future sans breaking change) :
 *   - Remplacer resolveRole() par une query table user_roles
 *   - La signature checkPermission() reste identique
 *
 * SÉCURITÉ :
 *   - Ne jamais faire confiance au frontend pour les rôles
 *   - Toujours authentifier côté serveur avant d'appeler checkPermission()
 *   - Le frontend ne doit jamais être la seule protection
 * ============================================================
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ── Types ─────────────────────────────────────────────────────

export type Role = "admin" | "support" | "trader";

/** Permissions disponibles dans la plateforme */
export type Permission =
  | "settings.read"
  | "settings.update"
  | "users.read"
  | "users.update"
  | "challenges.read"
  | "challenges.update"
  | "payouts.read"
  | "payouts.update"
  | "kyc.read"
  | "kyc.update"
  | "analytics.read";

/** Résultat d'une vérification RBAC */
export interface AuthCheckResult {
  authenticated: boolean;
  authorized:    boolean;
  userId:        string | null;
  email:         string | null;
  error?:        string;
}

// ── Matrice des permissions par rôle ─────────────────────────
const ROLE_PERMISSIONS: Record<Role, Set<Permission>> = {
  admin: new Set([
    "settings.read",
    "settings.update",
    "users.read",
    "users.update",
    "challenges.read",
    "challenges.update",
    "payouts.read",
    "payouts.update",
    "kyc.read",
    "kyc.update",
    "analytics.read",
  ]),
  support: new Set([
    "users.read",
    "challenges.read",
    "payouts.read",
    "kyc.read",
  ]),
  trader: new Set([
    "challenges.read",
    "payouts.read",
  ]),
};

// ── Résolution du rôle ────────────────────────────────────────

/**
 * Détermine le rôle d'un utilisateur.
 * Phase 1 : compare l'email à ADMIN_EMAIL (env var) avec fallback hardcodé.
 * Phase 1.2 : remplacer par une query table user_roles.
 */
function resolveRole(email: string): Role {
  // Fallback hardcodé si ADMIN_EMAIL n'est pas défini en prod (Vercel)
  const adminEmail = process.env.ADMIN_EMAIL || "vincentmeipro@gmail.com";
  if (email === adminEmail) return "admin";
  return "trader";
}

function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

// ── Résolution de l'utilisateur ───────────────────────────────

/**
 * Récupère l'utilisateur depuis :
 *   1. Bearer token (Authorization header) — admin panel
 *   2. Session cookie — navigateur direct
 * Retourne null si non authentifié.
 */
async function resolveUser(
  req?: NextRequest
): Promise<{ id: string; email: string } | null> {
  // 1. Essayer Bearer token (pattern des autres routes admin)
  if (req) {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (token) {
      try {
        const admin = createAdminClient();
        const { data: { user }, error } = await admin.auth.getUser(token);
        if (!error && user?.email) {
          return { id: user.id, email: user.email };
        }
      } catch {
        // Continuer vers le fallback cookie
      }
    }
  }

  // 2. Fallback : session cookie (Next.js server component / direct browser access)
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user?.email) {
      return { id: user.id, email: user.email };
    }
  } catch {
    // Non authentifié
  }

  return null;
}

// ── API publique ──────────────────────────────────────────────

/**
 * Vérifie l'authentification ET la permission d'un utilisateur.
 *
 * @param permission - Permission requise pour l'action
 * @param req        - NextRequest optionnel pour lire le Bearer token
 *
 * Exemple dans une route API :
 * ```typescript
 * const check = await checkPermission("settings.update", req);
 * if (!check.authenticated) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
 * if (!check.authorized)    return NextResponse.json({ error: "Accès refusé" },    { status: 403 });
 * ```
 */
export async function checkPermission(
  permission: Permission,
  req?: NextRequest
): Promise<AuthCheckResult> {
  // 1. Authentification
  const user = await resolveUser(req);
  if (!user) {
    return {
      authenticated: false,
      authorized:    false,
      userId:        null,
      email:         null,
      error:         "Non authentifié",
    };
  }

  // 2. Identification → rôle
  const role = resolveRole(user.email);

  // 3. Vérification de la permission
  const authorized = roleHasPermission(role, permission);
  if (!authorized) {
    console.warn(`[rbac] Accès refusé — user="${user.email}" role="${role}" permission="${permission}"`);
    return {
      authenticated: true,
      authorized:    false,
      userId:        user.id,
      email:         user.email,
      error:         `Permission insuffisante: ${permission} requiert rôle admin`,
    };
  }

  return {
    authenticated: true,
    authorized:    true,
    userId:        user.id,
    email:         user.email,
  };
}

/** Raccourci pour vérifier le rôle admin uniquement */
export async function requireAdmin(req?: NextRequest): Promise<AuthCheckResult> {
  return checkPermission("settings.read", req);
}
