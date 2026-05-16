"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CertificateContent() {
  const params = useSearchParams();
  const type = params.get("type") || "phase1"; // phase1 | funded
  const size = params.get("size") || "$100,000";
  const model = params.get("model") || "2step";
  const id = params.get("id") || "XXXXXXXX";
  const date = params.get("date") || new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const isFunded = type === "funded";
  const accentColor = isFunded ? "#22c55e" : "#2D7DD2";
  const bgGradient = isFunded
    ? "linear-gradient(160deg, #050e05, #080f08, #050e05)"
    : "linear-gradient(160deg, #05080e, #080a0f, #05080e)";

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "#0a0a0a",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 24px", fontFamily: "Inter, system-ui, sans-serif",
    }}>

      {/* Print button */}
      <button
        onClick={() => window.print()}
        style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          backgroundColor: accentColor, color: "#000",
          border: "none", borderRadius: 10, padding: "12px 24px",
          fontSize: 14, fontWeight: 800, cursor: "pointer",
          boxShadow: `0 4px 20px ${accentColor}44`,
        }}
        className="no-print"
      >
        ↓ Download / Print
      </button>

      {/* Certificate */}
      <div style={{
        width: "100%", maxWidth: 760,
        background: bgGradient,
        border: `1.5px solid ${accentColor}55`,
        borderRadius: 24,
        padding: "64px 72px",
        position: "relative",
        overflow: "hidden",
        boxShadow: `0 0 80px ${accentColor}11, 0 0 200px ${accentColor}06`,
      }}>

        {/* Corner decorations */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 300, height: 300, background: `radial-gradient(circle, ${accentColor}10 0%, transparent 65%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 300, height: 300, background: `radial-gradient(circle, ${accentColor}08 0%, transparent 65%)`, pointerEvents: "none" }} />

        {/* Top border line */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, marginBottom: 48, borderRadius: 100 }} />

        {/* Logo + label */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: "5px", textTransform: "uppercase", marginBottom: 16 }}>
            — ELYSIUM —
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#555", letterSpacing: "3px", textTransform: "uppercase" }}>
            {isFunded ? "Funded Trader Certificate" : "Certificate of Achievement"}
          </div>
        </div>

        {/* Main title */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{
            fontSize: 42, fontWeight: 900, color: "#fff",
            letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16,
          }}>
            {isFunded ? "Challenge Complete" : "Phase 1 — Passed"}
          </h1>
          <div style={{ fontSize: 16, color: "#555" }}>
            {isFunded
              ? "This certifies that the trader below has successfully completed all evaluation phases and is now an officially Funded Trader."
              : "This certifies that the trader below has successfully completed Phase 1 of the Elysium evaluation challenge."}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 48,
        }}>
          {[
            { label: "Account Size", value: size },
            { label: "Model", value: model === "2step" ? "2-Step" : "1-Step" },
            { label: "Profit Split", value: isFunded ? (model === "2step" ? "80%" : "90%") : "—" },
          ].map((item, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${accentColor}20`,
              borderRadius: 14, padding: "20px 24px", textAlign: "center",
            }}>
              <div style={{ color: "#444", fontSize: 11, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 10 }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: accentColor }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Badge */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            background: `${accentColor}15`,
            border: `1px solid ${accentColor}40`,
            borderRadius: 100, padding: "14px 32px",
          }}>
            <span style={{ fontSize: 20 }}>{isFunded ? "🏆" : "✓"}</span>
            <span style={{ fontWeight: 800, fontSize: 15, color: accentColor }}>
              {isFunded ? "Officially Funded" : "Phase 1 Complete"}
            </span>
          </div>
        </div>

        {/* Bottom line */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 28 }} />

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#333", marginBottom: 4 }}>Issued by</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: accentColor }}>Elysium</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#333", marginBottom: 4 }}>Date</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>{date}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#333", marginBottom: 4 }}>Certificate ID</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#555", fontFamily: "monospace" }}>#{id.slice(0, 8).toUpperCase()}</div>
          </div>
        </div>

        {/* Bottom border line */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`, marginTop: 40, borderRadius: 100 }} />
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #0a0a0a !important; }
        }
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
