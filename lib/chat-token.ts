/**
 * TRADERS REWARDS — Live Chat — Visitor Token
 * Phase 3B-3c2
 *
 * Responsabilités :
 *  - Génération du token visiteur (server-side uniquement)
 *  - Hash SHA-256 pour stockage DB (jamais le token brut)
 *  - Lecture / écriture du cookie httpOnly
 *
 * Principe de sécurité :
 *  - Token brut    → cookie httpOnly ; Secure ; SameSite=Lax
 *  - Token en DB   → JAMAIS (seul le hash SHA-256 est stocké)
 *  - Token en JSON → JAMAIS (ne pas exposer dans les réponses API)
 *
 * Le cookie utilise SameSite=Lax (et non Strict) pour permettre
 * la reprise de conversation via des liens externes (emails, réseaux sociaux).
 * SameSite=Strict bloquerait le cookie sur les navigations top-level entrantes.
 */

import { createHash, randomBytes } from "crypto";

// ── Constantes ────────────────────────────────────────────────────────────────

/** Nom du cookie visiteur chat — versionné pour migration future sans conflit. */
export const CHAT_COOKIE_NAME = "tr_chat_v1";

/** Durée de validité du cookie : 30 jours (en secondes). */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// ── Génération ────────────────────────────────────────────────────────────────

/**
 * Génère un token visiteur aléatoire cryptographiquement fort.
 *
 * Entropie : 32 octets = 256 bits.
 * Représentation : hex lowercase 64 chars.
 *
 * Appeler UNIQUEMENT côté serveur (API Route, Server Action).
 * Ne jamais exposer ce token dans une réponse JSON ou un log.
 */
export function generateVisitorToken(): string {
  return randomBytes(32).toString("hex");
}

// ── Hash ──────────────────────────────────────────────────────────────────────

/**
 * Hash SHA-256 du token visiteur.
 *
 * Résultat : hex lowercase 64 chars.
 * Seul ce hash est stocké dans chat_conversations.visitor_token_hash.
 *
 * Propriété de sécurité : irréversible.
 * La DB ne contient jamais le token brut — même en cas de fuite DB,
 * les tokens visiteurs restent confidentiels.
 */
export function hashVisitorToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

/**
 * Construit la valeur du header Set-Cookie pour le token visiteur.
 *
 * Attributs :
 *   HttpOnly  : inaccessible à document.cookie — protection XSS
 *   Secure    : uniquement HTTPS en production (absent en développement local)
 *   SameSite=Lax : envoyé sur navigation top-level (liens email) —
 *                  bloqué sur requêtes cross-site (protection CSRF)
 *   Path=/    : disponible sur toutes les routes du site
 *   Max-Age   : 30 jours
 *
 * @param token Token brut (64 chars hex) généré par generateVisitorToken()
 */
export function buildChatCookieHeader(token: string): string {
  const parts = [
    `${CHAT_COOKIE_NAME}=${token}`,
    `Path=/`,
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    `HttpOnly`,
    `SameSite=Lax`,
  ];
  // Secure uniquement en production — permet le test local en HTTP
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Construit la valeur du header Set-Cookie pour expirer immédiatement le cookie.
 * Utiliser lors de la suppression / déconnexion visiteur.
 */
export function buildChatCookieExpireHeader(): string {
  const base = `${CHAT_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
  return process.env.NODE_ENV === "production" ? `${base}; Secure` : base;
}

// ── Lecture cookie ────────────────────────────────────────────────────────────

/**
 * Lit le visitor token depuis le header Cookie d'une requête.
 *
 * Validation stricte :
 *   - Le cookie doit être nommé CHAT_COOKIE_NAME
 *   - Le token doit faire exactement 64 chars hex lowercase
 *     (output de randomBytes(32).toString("hex"))
 *
 * Retourne null si :
 *   - Le header Cookie est absent
 *   - Le cookie tr_chat_v1 est absent
 *   - Le token ne correspond pas au format attendu (rejet silencieux)
 *
 * @param cookieHeader Valeur du header Cookie de la requête entrante
 */
export function readVisitorToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const segment = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CHAT_COOKIE_NAME}=`));

  if (!segment) return null;

  const token = segment.slice(CHAT_COOKIE_NAME.length + 1);

  // Validation : exactement 64 chars hex lowercase
  // Correspond à randomBytes(32).toString("hex")
  return /^[0-9a-f]{64}$/.test(token) ? token : null;
}
