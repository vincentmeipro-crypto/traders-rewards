import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/chat-rate-limit";
import { findCertificateByToken } from "@/lib/certificates";

// ── Rate limit ────────────────────────────────────────────────────────────────
// 30 vérifications / minute / IP — réutilise lib/chat-rate-limit.ts (in-memory)
// La clé "verify:<ip>" est indépendante des clés chat.
// Le message 429 ne révèle pas si le token existe ou non.

const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

function publicName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "Trader";
  return `${parts[0]} ${parts.at(-1)?.charAt(0) || ""}.`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Rate limit ─────────────────────────────────────────────────────────
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!checkRateLimit(`verify:${ip}`, 30, 60_000)) {
    return NextResponse.json(
      { valid: false, error: "Trop de requêtes. Réessayez dans un instant." },
      { status: 429 }
    );
  }

  // ── 2. Validation du token ────────────────────────────────────────────────
  const { id: token } = await params;
  if (!TOKEN_PATTERN.test(token)) {
    return NextResponse.json({ valid: false, error: "Certificat introuvable" }, { status: 404 });
  }

  // ── 3. Lookup DB ──────────────────────────────────────────────────────────
  const admin = createAdminClient();
  const certificate = await findCertificateByToken(admin, token);

  if (!certificate || certificate.revoked_at) {
    return NextResponse.json(
      { valid: false, error: "Certificat introuvable ou révoqué" },
      { status: 404 }
    );
  }

  // ── 4. Enregistrement du scan ─────────────────────────────────────────────
  // ?track=false → désactive le scan (usage développement/test)
  // source : 'link' si paramètre explicite, 'qr' par défaut
  if (req.nextUrl.searchParams.get("track") !== "false") {
    await admin.from("reward_certificate_scans").insert({
      certificate_id: certificate.id,
      source: req.nextUrl.searchParams.get("source") === "link" ? "link" : "qr",
    });
  }

  // ── 5. Réponse publique ───────────────────────────────────────────────────
  // Champs exposés : token public, nom masqué, taille compte, montant, date
  // Jamais : id interne, source_key, payout_id, challenge_id, user_id
  return NextResponse.json({
    valid: true,
    certificate: {
      token,
      type:         certificate.certificate_type,
      trader_name:  publicName(certificate.trader_display_name),
      account_size: certificate.account_size,
      amount:       certificate.amount,
      issued_at:    certificate.issued_at,
    },
  });
}
