import { createAdminClient } from "@/lib/supabase/admin";
import Image from "next/image";
import { certificateTypeLabel, findCertificateByToken } from "@/lib/certificates";

export const dynamic = "force-dynamic";
const TOKEN_PATTERN = /^[0-9a-f]{32}$/;

function publicName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "Trader";
  return `${parts[0]} ${parts.at(-1)?.charAt(0) || ""}.`;
}

export default async function VerifyPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ source?: string }> }) {
  const { id: token } = await params;
  const { source } = await searchParams;
  const admin = createAdminClient();

  const certificate = TOKEN_PATTERN.test(token)
    ? await findCertificateByToken(admin, token)
    : null;

  const valid = !!certificate && !certificate.revoked_at;
  if (valid && certificate) {
    await admin.from("reward_certificate_scans").insert({
      certificate_id: certificate.id,
      source: source === "link" ? "link" : "qr",
    });
  }

  return (
    <main style={{ minHeight: "100vh", background: "#050505", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#0e0e0e", border: `1px solid ${valid ? "#3b82f630" : "#ef444430"}`, borderLeft: `4px solid ${valid ? "#3b82f6" : "#ef4444"}`, padding: "40px 44px" }}>
        <div style={{ marginBottom: 28 }}>
          <Image src="/Traders_Rewards_logo_E_sans_barre_BLANC_transparent_4K.png" alt="Traders Rewards" width={160} height={54} style={{ objectFit: "contain" }} />
        </div>
        <div style={{ display: "inline-flex", gap: 8, background: valid ? "#3b82f615" : "#ef444415", border: `1px solid ${valid ? "#3b82f640" : "#ef444440"}`, borderRadius: 4, padding: "6px 14px", marginBottom: 28, color: valid ? "#60a5fa" : "#ef4444", fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {valid ? "✓ Certificat authentique" : "✕ Certificat invalide"}
        </div>
        {valid && certificate ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Trader</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{publicName(certificate.trader_display_name)}</div>
            </div>
            {[
              ["Type de certificat", certificateTypeLabel(certificate.certificate_type)],
              ["Compte", certificate.account_size],
              ["Montant versé", certificate.amount],
              ["Date d’émission", new Date(`${certificate.issued_at}T00:00:00`).toLocaleDateString("fr-FR")],
            ].map(([label, value]) => value && (
              <div key={label} style={{ borderTop: "1px solid #1a1a1a", padding: "12px 0" }}>
                <div style={{ fontSize: 10, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{value}</div>
              </div>
            ))}
            <div style={{ marginTop: 20, color: "#555", fontSize: 10 }}>Référence publique : {token}</div>
          </>
        ) : (
          <div style={{ color: "#999", fontSize: 14, lineHeight: 1.7 }}>Ce certificat n’existe pas ou a été révoqué. Contactez le support en cas de doute.</div>
        )}
      </div>
      <div style={{ marginTop: 20, fontSize: 11, color: "#555", letterSpacing: "0.1em" }}>TRADERS-REWARDS.EU — VÉRIFICATION OFFICIELLE</div>
    </main>
  );
}
