/**
 * ============================================================
 * PROMO ADMIN — Helpers de validation partagés
 * ============================================================
 * Utilisé par :
 *   - app/api/admin/promo-codes/route.ts  (POST + PATCH)
 *   - app/api/admin/affiliates/route.ts   (action create_promo)
 *
 * Pas de framework de validation externe.
 * Pas de Zod.
 * ============================================================
 */

// ── Code ──────────────────────────────────────────────────────────────────────

const CODE_PATTERN = /^[A-Z0-9-]{2,32}$/;

/**
 * Normalise un code raw → UPPERCASE trimmed, ou null si non-string.
 * Ne valide pas le pattern — appeler validateCode() ensuite.
 */
export function normalizeCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return raw.trim().toUpperCase();
}

/**
 * Valide le pattern du code normalisé.
 * Retourne un message d'erreur ou null si OK.
 */
export function validateCode(code: string): string | null {
  if (!CODE_PATTERN.test(code)) {
    return "Code invalide — 2 à 32 caractères, A-Z 0-9 tiret uniquement (pas d'espace, underscore, ni caractère spécial)";
  }
  return null;
}

// ── Name ──────────────────────────────────────────────────────────────────────

/**
 * Valide et normalise le champ name.
 * "" après trim → null (règle explicite : chaîne vide traitée comme null).
 * undefined/null → null sans erreur.
 */
export function validateName(
  raw: unknown
): { value: string | null; error: string | null } {
  if (raw === undefined || raw === null) return { value: null, error: null };
  if (typeof raw !== "string") return { value: null, error: "name doit être une chaîne" };
  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, error: null }; // "" → null
  if (trimmed.length > 120) return { value: null, error: "name doit faire ≤ 120 caractères" };
  return { value: trimmed, error: null };
}

// ── Discount ──────────────────────────────────────────────────────────────────

/**
 * Valide discount_percent : entier entre 1 et 100 inclus.
 * 100% autorisé (flow free).
 * Pas de float.
 */
export function validateDiscount(
  raw: unknown
): { value: number; error: string | null } {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    return { value: 0, error: "discount_percent doit être un entier entre 1 et 100" };
  }
  return { value: n, error: null };
}

// ── max_uses ──────────────────────────────────────────────────────────────────

/**
 * Valide max_uses : null (illimité) ou entier > 0.
 * Refuse 0, négatif, float, string invalide.
 */
export function validateMaxUses(
  raw: unknown
): { value: number | null; error: string | null } {
  if (raw === null || raw === undefined) return { value: null, error: null };
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    return { value: null, error: "max_uses doit être null ou un entier > 0" };
  }
  return { value: n, error: null };
}

// ── Dates ─────────────────────────────────────────────────────────────────────

/**
 * Parse une date ISO.
 * null / undefined / "" → null sans erreur.
 * Chaîne invalide → erreur.
 */
export function parseDate(
  raw: unknown
): { value: string | null; error: string | null } {
  if (raw === null || raw === undefined || raw === "") return { value: null, error: null };
  if (typeof raw !== "string") return { value: null, error: "date doit être une chaîne ISO" };
  const d = new Date(raw);
  if (isNaN(d.getTime())) return { value: null, error: `date invalide: ${raw}` };
  return { value: d.toISOString(), error: null };
}

/**
 * Valide la cohérence du couple starts_at / expires_at.
 * Retourne un message d'erreur ou null si OK.
 * Appliqué sur le couple FINAL (valeur DB + valeurs du PATCH combinées).
 */
export function validateDates(
  startsAt: string | null,
  expiresAt: string | null
): string | null {
  if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
    return "starts_at doit être strictement antérieur à expires_at";
  }
  return null;
}

// ── targeting_mode ────────────────────────────────────────────────────────────

export function validateTargetingMode(
  raw: unknown
): { value: "all" | "specific"; error: string | null } {
  if (raw !== "all" && raw !== "specific") {
    return { value: "all", error: "targeting_mode doit être 'all' ou 'specific'" };
  }
  return { value: raw, error: null };
}

// ── Status calculé ────────────────────────────────────────────────────────────

/**
 * Status calculé côté serveur — jamais stocké en DB.
 *
 * Ordre de priorité :
 *   1. active=false          → revoked
 *   2. used_count >= max_uses → exhausted
 *   3. expires_at < now      → expired
 *   4. starts_at > now       → scheduled
 *   5. sinon                 → active
 */
export type PromoStatus = "revoked" | "exhausted" | "expired" | "scheduled" | "active";

export function computeStatus(p: {
  active:    boolean;
  max_uses:  number | null;
  used_count: number;
  expires_at: string | null;
  starts_at:  string | null;
}): PromoStatus {
  if (!p.active) return "revoked";
  if (p.max_uses !== null && (p.used_count ?? 0) >= p.max_uses) return "exhausted";
  if (p.expires_at !== null && new Date(p.expires_at) < new Date()) return "expired";
  if (p.starts_at  !== null && new Date(p.starts_at)  > new Date()) return "scheduled";
  return "active";
}
