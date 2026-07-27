import { createAdminClient } from "@/lib/supabase/admin";
import Image from "next/image";

export default async function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: challenge } = await admin
    .from("challenges")
    .select("id, account_size, model, status, phase, created_at, user_id")
    .eq("id", id)
    .single();

  const { data: profile } = challenge
    ? await admin.from("profiles").select("first_name, last_name").eq("user_id", challenge.user_id).single()
    : { data: null };

  const valid = !!challenge;
  const phaseLabel: Record<string, string> = { phase1: "Phase 1", phase2: "Phase 2", funded: "Reward" };
  const traderName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "Trader";
  const issuedAt = challenge ? new Date(challenge.created_at).toLocaleDateString("fr-FR") : "-";

  return (
    <main style={{
      minHeight: "100vh",
      background: "#050505",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: "40px 20px",
    }}>
      <div style={{
        width: "100%",
        maxWidth: 480,
        background: "#0e0e0e",
        border: `1px solid ${valid ? "#3b82f630" : "#ef444430"}`,
        borderLeft: `4px solid ${valid ? "#3b82f6" : "#ef4444"}`,
        padding: "40px 44px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 28 }}>
          <Image src="/LOGO + NOM BLANC TRANSPARENT.png" alt="Traders Rewards" width={160} height={54} style={{ objectFit: "contain" }} />
        </div>

        {/* Status badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: valid ? "#3b82f615" : "#ef444415",
          border: `1px solid ${valid ? "#3b82f640" : "#ef444440"}`,
          borderRadius: 4,
          padding: "6px 14px",
          marginBottom: 28,
        }}>
          <span style={{ fontSize: 18 }}>{valid ? "✓" : "✗"}</span>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: valid ? "#3b82f6" : "#ef4444",
          }}>
            {valid ? "Certificat authentique" : "Certificat invalide"}
          </span>
        </div>

        {valid && challenge ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>Trader</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6" }}>{traderName}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 8 }}>
              {[
                { label: "Compte", value: challenge.account_size },
                { label: "Type", value: challenge.model?.toUpperCase() },
                { label: "Étape", value: phaseLabel[challenge.phase] ?? challenge.phase },
                { label: "Date d'émission", value: issuedAt },
              ].map(({ label, value }) => (
                <div key={label} style={{ borderTop: "1px solid #1a1a1a", paddingTop: 12 }}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, fontSize: 11, color: "#444", borderTop: "1px solid #1a1a1a", paddingTop: 16 }}>
              ID : {challenge.id}
            </div>
          </>
        ) : (
          <div style={{ color: "#888", fontSize: 14, lineHeight: 1.7 }}>
            Ce certificat n&apos;existe pas ou a été révoqué.<br/>
            Contactez <span style={{ color: "#3b82f6" }}>support@traders-rewards.eu</span> en cas de doute.
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, fontSize: 11, color: "#444", letterSpacing: "0.1em" }}>
        TRADERS-REWARDS.EU — VÉRIFICATION OFFICIELLE
      </div>
    </main>
  );
}
