/**
 * ============================================================
 * RBAC — Role-Based Access Control — Phase 1 minimal
 * ============================================================
 * Phase 1 : authentification → identification → rôle → permission
 *
 * Implémentation minimale :
 *   - Seul rôle : "admin"
 *   - Admin = email dans ADMIN_EMAIL (env var)
 *   - Permissions définies statiquement par rôle
 *
 * Phase 1.2 (évolution future sans breaking change) :
 *   - Remplacer isAdmin() par une query table user_roles
 *   - La signature checkPermission() reste identique
 *   - Aucun appelant existant ne sera cassé
 *
 * SÉCURITÉ :
 *   - Ne jamais faire confiance au frontend pour les rôles
 *   - Toujours authentifier côté serveur avant d'appeler checkPermission()
 *   - Le frontend ne doit jamais être la seule protection
 * ============================================================
 */

import { createServerClient } from "@/lib/supabase/server";

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
  /** Utilisateur authentifié avec succès */
  authenticated: boolean;
  /** L'utilisateur possède le rôle/permission requis */
  authorized: boolean;
  /** UUID de l'utilisateur authentifié */
  userId: string | null;
  /** Email de l'utilisateur authentifié */
  email:  string | null;
  /** Message d'erreur si !authenticated || !authorized */
  error?: string;
}

// ── Matrice des permissions par rôle ─────────────────────────
// Phase 1 : admin only. Étendre pour support/trader en Phase 1.2.
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
 * Phase 1 : compare l'email à ADMIN_EMAIL (env var).
 * Phase 1.2 : remplacer par une query table user_roles.
 */
function resolveRole(email: string): Role {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    // Sécurité : si ADMIN_EMAIL n'est pas configuré, personne n'est admin
    console.error("[rbac] ADMIN_EMAIL non configuré — aucun admin possible");
    return "trader";
  }
  if (email === adminEmail) return "admin";
  return "trader";
}

/**
 * Vérifie si un rôle possède une permission.
 */
function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

// ── API publique ──────────────────────────────────────────────

/**
 * Vérifie l'authentification ET la permission d'un utilisateur.
 *
 * Pattern d'utilisation dans une route API :
 * ```typescript
 * const check = await checkPermission("settings.update");
 * if (!check.authenticated) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
 * if (!check.authorized)    return NextResponse.json({ error: "Accès refusé" },    { status: 403 });
 * // check.userId et check.email sont disponibles
 * ```
 *
 * @param permission - Permission requise pour l'action
 */
export async function checkPermission(
  permission: Permission
): Promise<AuthCheckResult> {
  // 1. Authentification : récupérer l'utilisateur courant
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      authenticated: false,
      authorized:    false,
      userId:        null,
      email:         null,
      error:         "Non authentifié",
    };
  }

  const email = user.email ?? "";

  // 2. Identification : résoudre le rôle
  const role = resolveRole(email);

  // 3. Vérification de la permission
  const authorized = roleHasPermission(role, permission);

  if (!authorized) {
    console.warn(
      `[rbac] Accès refusé — user="${email}" role="${role}" permission="${permission}"`
    );
    return {
      authenticated: true,
      authorized:    false,
      userId:        user.id,
      email,
      error:         `Permission insuffisante: ${permission} requiert rôle admin`,
    };
  }

  return {
    authenticated: true,
    authorized:    true,
    userId:        user.id,
    email,
  };
}

/**
 * Vérifie si l'utilisateur courant est admin.
 * Raccourci pour les routes qui vérifient uniquement le rôle admin
 * sans se soucier d'une permission spécifique.
 */
export async function requireAdmin(): Promise<AuthCheckResult> {
  return checkPermission("settings.read"); // Permission minimale admin
}
