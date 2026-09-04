import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ─── Helpers SubtleCrypto (Edge Runtime) ────────────────────────────────────

const enc = (s: string) => new TextEncoder().encode(s);

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Valide le cookie site_access_token.
 * Format : "<expires_unix_ms>.<hmac_hex>"
 * HMAC-SHA256 de l'expiration (string) signé avec SITE_ACCESS_SECRET.
 */
async function validateSiteToken(token: string, secret: string): Promise<boolean> {
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;

  const expiresPart = token.slice(0, dot);
  const hmacPart    = token.slice(dot + 1);

  // Vérifier l'expiration
  const expires = parseInt(expiresPart, 10);
  if (isNaN(expires) || Date.now() > expires) return false;

  // Recalculer le HMAC attendu
  const key         = await importHmacKey(secret);
  const expectedBuf = await crypto.subtle.sign("HMAC", key, enc(expiresPart));
  const expectedHex = toHex(expectedBuf);

  // Comparaison en temps constant (même longueur garantie par toHex)
  if (expectedHex.length !== hmacPart.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ hmacPart.charCodeAt(i);
  }
  return diff === 0;
}

// ─── Routes exclues de la protection site-wide ──────────────────────────────
// Ces routes ne nécessitent pas d'authentification site (webhooks, assets, etc.)
const GATE_EXCLUDED = [
  "/gate",
  "/api/site-access",
  "/api/stripe/webhook",
  "/api/crypto/webhook",
];

function isGateExcluded(pathname: string): boolean {
  if (GATE_EXCLUDED.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/api/cron/"))  return true; // Vercel cron jobs
  if (pathname.match(/\.(png|jpe?g|svg|ico|webp|woff2?|css|js|map|txt|xml)$/i)) return true;
  return false;
}

// ─── Middleware principal ────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Gate site-wide ────────────────────────────────────────────────────
  const SITE_ACCESS_SECRET = process.env.SITE_ACCESS_SECRET;

  if (SITE_ACCESS_SECRET && !isGateExcluded(pathname)) {
    const token  = request.cookies.get("site_access_token")?.value ?? "";
    const valid  = token ? await validateSiteToken(token, SITE_ACCESS_SECRET) : false;

    if (!valid) {
      const gateUrl = new URL("/gate", request.url);
      gateUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(gateUrl);
    }
  }

  // ── 2. Auth Supabase pour /dashboard, /login, /register ─────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url === "YOUR_SUPABASE_URL") {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};
