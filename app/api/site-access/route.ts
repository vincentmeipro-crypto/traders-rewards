import { NextRequest, NextResponse } from "next/server";

// ─── Helpers SubtleCrypto (Edge-compatible) ─────────────────────────────────

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

/** Comparaison en temps constant pour éviter les timing attacks */
function bufferEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {
  if (a.byteLength !== b.byteLength) return false;
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

// ─── POST /api/site-access ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const SITE_PASSWORD    = process.env.SITE_PASSWORD;
  const SITE_ACCESS_SECRET = process.env.SITE_ACCESS_SECRET;

  if (!SITE_PASSWORD || !SITE_ACCESS_SECRET) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const submitted = body.password ?? "";

  // Comparaison timing-safe : HMAC des deux chaînes, comparaison bit-à-bit
  const key = await importHmacKey(SITE_ACCESS_SECRET);
  const expectedHmac  = await crypto.subtle.sign("HMAC", key, enc(SITE_PASSWORD));
  const submittedHmac = await crypto.subtle.sign("HMAC", key, enc(submitted));

  if (!bufferEqual(expectedHmac, submittedHmac)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  // Génère le token : "<expires_ms>.<hmac_hex>"
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const expires = Date.now() + THIRTY_DAYS_MS;
  const tokenKey  = await importHmacKey(SITE_ACCESS_SECRET);
  const tokenHmac = await crypto.subtle.sign("HMAC", tokenKey, enc(String(expires)));
  const token = `${expires}.${toHex(tokenHmac)}`;

  const res = NextResponse.json({ ok: true });
  res.cookies.set("site_access_token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   30 * 24 * 60 * 60, // 30 jours en secondes
  });

  return res;
}
