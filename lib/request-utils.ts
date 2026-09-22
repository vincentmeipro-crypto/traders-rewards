import { NextRequest } from "next/server";

/**
 * Extrait l'IP client depuis les headers serveur
 * Suit la même logique que app/api/security/register-ip/route.ts
 */
export function extractClientIp(req: NextRequest): string {
  // x-forwarded-for peut contenir plusieurs IPs (proxy chain),
  // on prend la première (IP client) avant trim()
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // x-real-ip : fallback pour certains proxies (nginx, etc.)
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Extrait le User-Agent client depuis les headers serveur
 */
export function extractClientUserAgent(req: NextRequest): string {
  return req.headers.get("user-agent") || "unknown";
}

/**
 * Combine IP et User-Agent extraction
 */
export function extractClientInfo(req: NextRequest): {
  ip: string;
  userAgent: string;
} {
  return {
    ip: extractClientIp(req),
    userAgent: extractClientUserAgent(req),
  };
}
