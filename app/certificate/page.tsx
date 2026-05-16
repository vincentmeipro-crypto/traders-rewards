"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const CERT_CONFIG = {
  phase1: {
    image: "/PASSED-PHASE-1.png",
    nameColor: "#ffffff",
    amountColor: "#7dd3fc",
    dateColor: "#888888",
    nameTop: "63%",
    amountTop: "75%",
    dateTop: "85%",
  },
  challenge: {
    image: "/PASSED-CHALLENGE.png",
    nameColor: "#ffffff",
    amountColor: "#7dd3fc",
    dateColor: "#888888",
    nameTop: "63%",
    amountTop: "75%",
    dateTop: "85%",
  },
  reward: {
    image: "/REWARD-CERTIFICAT.png",
    nameColor: "#ffffff",
    amountColor: "#7dd3fc",
    dateColor: "#888888",
    nameTop: "63%",
    amountTop: "75%",
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

      <button
        onClick={() => window.print()}
        className="no-print"
        style={{
          position: "fixed", top: 24, right: 24, zIndex: 100,
          backgroundColor: "#2D7DD2", color: "#fff",
          border: "none", borderRadius: 10, padding: "12px 28px",
          fontSize: 14, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 4px 20px rgba(45,125,210,0.4)",
          letterSpacing: "0.5px",
        }}
      >
        ↓ Télécharger / Imprimer
      </button>

      <div style={{ position: "relative", width: "min(700px, 96vw)" }}>
        <img
          src={cfg.image}
          alt="certificate"
          style={{ width: "100%", display: "block", borderRadius: 12 }}
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
          top: cfg.dateTop, left: "10%", width: "80%",
          textAlign: "center", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "clamp(15px, 3vw, 20px)",
            fontWeight: 600,
            color: cfg.dateColor,
            letterSpacing: "1px",
            textShadow: "0 1px 6px rgba(0,0,0,0.8)",
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
