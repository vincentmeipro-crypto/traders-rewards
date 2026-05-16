"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const CERT_CONFIG = {
  phase1: {
    image: "/PHASE1.png",
    nameColor: "#ffffff",
    amountColor: "#4fc3f7",
    dateColor: "#cccccc",
    nameTop: "63%",
    amountTop: "80%",
    dateTop: "90%",
  },
  challenge: {
    image: "/CHALLENGE-COMPLETED.png",
    nameColor: "#ffffff",
    amountColor: "#c084fc",
    dateColor: "#cccccc",
    nameTop: "63%",
    amountTop: "80%",
    dateTop: "90%",
  },
  payout: {
    image: "/PAYOUT.png",
    nameColor: "#ffffff",
    amountColor: "#f5c842",
    dateColor: "#cccccc",
    nameTop: "63%",
    amountTop: "79%",
    dateTop: "89%",
  },
};

function CertificateContent() {
  const params = useSearchParams();
  const type = (params.get("type") || "phase1") as keyof typeof CERT_CONFIG;
  const firstName = params.get("firstname") || "";
  const lastName = params.get("lastname") || "";
  const name = firstName || lastName ? `${firstName} ${lastName}`.trim() : (params.get("name") || "Trader");
  const amount = params.get("amount") || "";
  const date = params.get("date") || new Date().toLocaleDateString("fr-FR");

  const cfg = CERT_CONFIG[type] || CERT_CONFIG.phase1;

  const amountLabel = type === "payout"
    ? (amount || "$0")
    : (amount || "$100,000");

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

      {/* Print button */}
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

      {/* Certificate wrapper — image + text overlay */}
      <div style={{
        position: "relative",
        width: "min(480px, 92vw)",
      }}>
        {/* Background image */}
        <img
          src={cfg.image}
          alt="certificate"
          style={{ width: "100%", display: "block", borderRadius: 16 }}
        />

        {/* Name — 1er cadre "PROUDLY PRESENTED TO" */}
        <div style={{
          position: "absolute",
          top: cfg.nameTop, left: "12%", width: "76%",
          textAlign: "center", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "clamp(15px, 3.8vw, 21px)",
            fontWeight: 900, color: cfg.nameColor,
            letterSpacing: "0.5px",
            textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          }}>
            {name}
          </div>
        </div>

        {/* Montant — 2ème cadre "VERIFIED FUNDED ACCOUNT" */}
        <div style={{
          position: "absolute",
          top: cfg.amountTop, left: "12%", width: "76%",
          textAlign: "center", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "clamp(20px, 5vw, 30px)",
            fontWeight: 900, color: cfg.amountColor,
            letterSpacing: "-0.5px",
            textShadow: "0 2px 12px rgba(0,0,0,0.9)",
          }}>
            {amountLabel}
          </div>
        </div>

        {/* Date — SOUS le 2ème cadre */}
        <div style={{
          position: "absolute",
          top: cfg.dateTop, left: "12%", width: "76%",
          textAlign: "center", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "clamp(11px, 2.5vw, 14px)",
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
