"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CertificateContent() {
  const params = useSearchParams();
  const type = params.get("type") || "phase1"; // phase1 | challenge | payout
  const name = params.get("name") || "Trader";
  const amount = params.get("amount") || "";
  const date = params.get("date") || new Date().toLocaleDateString("fr-FR");
  const size = params.get("size") || "$100,000";

  const configs = {
    phase1: {
      line1: "PHASE 1",
      line2: "DONE !",
      sub: `${size} Account`,
      color1: "#2D7DD2",
      color2: "#5BA4E8",
      glow: "rgba(45,125,210,0.4)",
    },
    challenge: {
      line1: "CHALLENGE",
      line2: "DONE !",
      sub: `${size} — Funded Trader`,
      color1: "#22c55e",
      color2: "#4ade80",
      glow: "rgba(34,197,94,0.4)",
    },
    payout: {
      line1: "PAYOUT",
      line2: "CERTIFICATE",
      sub: "THAT EARNED A PAYOUT OF",
      color1: "#2D7DD2",
      color2: "#5BA4E8",
      glow: "rgba(45,125,210,0.4)",
    },
  };

  const cfg = configs[type as keyof typeof configs] || configs.phase1;

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#08090e",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 24px", fontFamily: "Inter, system-ui, sans-serif",
    }}>

      {/* Print button */}
      <button
        onClick={() => window.print()}
        className="no-print"
        style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          backgroundColor: cfg.color1, color: "#fff",
          border: "none", borderRadius: 10, padding: "12px 24px",
          fontSize: 14, fontWeight: 800, cursor: "pointer",
          boxShadow: `0 4px 20px ${cfg.glow}`,
        }}
      >
        ↓ Télécharger / Imprimer
      </button>

      {/* Square Certificate */}
      <div style={{
        width: 540, height: 540,
        background: "linear-gradient(145deg, #0d1220 0%, #111827 40%, #0a0f1a 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 28,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
        padding: "44px 48px",
        position: "relative", overflow: "hidden",
        boxShadow: `0 0 120px ${cfg.glow}, 0 0 60px rgba(0,0,0,0.8)`,
      }}>

        {/* Background glow blob */}
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
          width: 400, height: 400, borderRadius: "50%",
          background: `radial-gradient(circle, ${cfg.glow.replace("0.4", "0.12")} 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        {/* Top: Logo */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: "6px", textTransform: "uppercase", color: "#fff" }}>
            ELYSIUM
          </div>
        </div>

        {/* Middle: Main content */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0 }}>

          {/* Big title */}
          <div style={{
            fontSize: 72, fontWeight: 900, lineHeight: 1,
            letterSpacing: "-2px",
            background: `linear-gradient(135deg, ${cfg.color1}, ${cfg.color2})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 4,
          }}>
            {cfg.line1}
          </div>
          <div style={{
            fontSize: 72, fontWeight: 900, lineHeight: 1,
            letterSpacing: "-2px", color: "#fff",
            marginBottom: 32,
          }}>
            {cfg.line2}
          </div>

          {/* Name card */}
          <div style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: "20px 40px",
            textAlign: "center", width: "100%",
          }}>
            {type === "payout" && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>
                {cfg.sub}
              </div>
            )}
            <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: type === "payout" ? 12 : 0 }}>
              {name}
            </div>
            {type !== "payout" && (
              <div style={{ fontSize: 13, color: "#555", marginTop: 6, fontWeight: 600, letterSpacing: "1px" }}>
                {cfg.sub}
              </div>
            )}
            {type === "payout" && amount && (
              <div style={{
                fontSize: 56, fontWeight: 900, letterSpacing: "-2px",
                background: `linear-gradient(135deg, ${cfg.color1}, ${cfg.color2})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {amount}
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Date */}
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{date}</div>
          <div style={{ fontSize: 11, color: "#444", letterSpacing: "2px", textTransform: "uppercase" }}>Issued Date</div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #08090e !important; margin: 0; }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
      `}</style>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense>
      <CertificateContent />
    </Suspense>
  );
}
