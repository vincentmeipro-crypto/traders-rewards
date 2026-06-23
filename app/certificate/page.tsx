"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef } from "react";

const CERT_CONFIG = {
  phase1: {
    image: "/PHASE1.png",
    nameColor: "#ffffff",
    amountColor: "#7dd3fc",
    dateColor: "#ffffff",
    nameTop: "56%",
    amountTop: "68%",
    dateTop: "79%",
  },
  challenge: {
    image: "/PHASE2.png",
    nameColor: "#ffffff",
    amountColor: "#7dd3fc",
    dateColor: "#ffffff",
    nameTop: "56%",
    amountTop: "68%",
    dateTop: "79%",
  },
  reward: {
    image: "/RECOMPENSE.png",
    nameColor: "#ffffff",
    amountColor: "#7dd3fc",
    dateColor: "#ffffff",
    nameTop: "57%",
    amountTop: "69%",
    dateTop: "85%",
  },
};

function CertificateContent() {
  const params = useSearchParams();
  const type = (params.get("type") || "phase1") as keyof typeof CERT_CONFIG;
  const firstName = params.get("firstname") || "";
  const lastName = params.get("lastname") || "";
  const name = firstName || lastName ? `${firstName} ${lastName}`.trim() : (params.get("name") || "Trader");
  const amount = params.get("amount") || "$100,000";
  const date = params.get("date") || new Date().toLocaleDateString("fr-FR");

  const cfg = CERT_CONFIG[type] || CERT_CONFIG.phase1;
  const certRef = useRef<HTMLDivElement>(null);

  const downloadJpeg = async () => {
    if (!certRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(certRef.current, { scale: 3, useCORS: true, backgroundColor: null });
    const link = document.createElement("a");
    link.download = `traders-rewards-${type}-${name.replace(/\s+/g, "-")}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#05050a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      fontFamily: "Inter, system-ui, sans-serif",
    }}>

      <div className="no-print" style={{ position: "fixed", top: 24, right: 24, zIndex: 100, display: "flex", gap: 10 }}>
        <button onClick={downloadJpeg} style={{ backgroundColor: "#00C2FF", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 20px rgba(45,125,210,0.4)" }}>
          ↓ Télécharger JPEG
        </button>
        <button onClick={() => window.print()} style={{ backgroundColor: "#333", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          🖨 Imprimer
        </button>
      </div>

      <div ref={certRef} style={{ position: "relative", width: "min(700px, 96vw)" }}>
        <img
          src={cfg.image}
          alt="certificate"
          style={{ width: "100%", display: "block", borderRadius: 12 }}
        />

        {/* Logo haut gauche */}
        <img
          src="/nouveau-logo.png"
          alt="Traders Rewards"
          style={{ position: "absolute", top: "4%", left: "4%", width: "clamp(32px, 7%, 52px)", height: "auto", opacity: 0.9 }}
        />

        {/* Nom */}
        <div style={{
          position: "absolute",
          top: cfg.nameTop, left: "10%", width: "80%",
          textAlign: "center", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "clamp(20px, 4.2vw, 33px)",
            fontWeight: 800, color: cfg.nameColor,
            letterSpacing: "1px",
            textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          }}>
            {name}
          </div>
        </div>

        {/* Montant */}
        <div style={{
          position: "absolute",
          top: cfg.amountTop, left: "10%", width: "80%",
          textAlign: "center", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "clamp(24px, 4.8vw, 39px)",
            fontWeight: 900, color: cfg.amountColor,
            letterSpacing: "-0.5px",
            textShadow: "0 2px 12px rgba(0,0,0,0.9)",
          }}>
            {amount}
          </div>
        </div>

        {/* Date */}
        <div style={{
          position: "absolute",
          top: cfg.dateTop,
          left: "10%", width: "80%", textAlign: "center",
          transform: "translateY(-50%)",
        }}>
          <div style={{
            fontSize: type === "reward" ? "clamp(11px, 2vw, 14px)" : "clamp(15px, 3vw, 20px)",
            fontWeight: 600,
            color: cfg.dateColor,
            letterSpacing: "0.5px",
          }}>
            {date}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #05050a !important; margin: 0; }
          img { border-radius: 0 !important; }
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
