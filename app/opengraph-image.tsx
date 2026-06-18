import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Traders Rewards — Prop Firm Française | Challenge Trading";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0D1B3E 0%, #1565C0 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Background pattern */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.05, background: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "60px 60px", display: "flex" }} />

        {/* Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.2)", border: "1px solid rgba(201,168,76,0.5)", borderRadius: 100, padding: "8px 20px", marginBottom: 28 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#C9A84C", letterSpacing: 2, textTransform: "uppercase" }}>🇫🇷 Prop Firm Française</span>
        </div>

        {/* Title */}
        <div style={{ fontSize: 56, fontWeight: 900, color: "#ffffff", textAlign: "center", lineHeight: 1.1, marginBottom: 16, maxWidth: 900 }}>
          Traders Rewards
        </div>
        <div style={{ fontSize: 26, color: "rgba(255,255,255,0.75)", textAlign: "center", marginBottom: 40, maxWidth: 700 }}>
          Challenge Trading · Capital jusqu'à 200 000€ · 90% des profits
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 48 }}>
          {[
            { label: "Capital simulé", value: "200K€" },
            { label: "Partage profit", value: "90%" },
            { label: "Actifs tradables", value: "150+" },
          ].map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 900, color: "#C9A84C" }}>{s.value}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{ position: "absolute", bottom: 32, fontSize: 15, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>
          traders-rewards.eu
        </div>
      </div>
    ),
    { ...size }
  );
}
