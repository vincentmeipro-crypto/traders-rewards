"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const cfg = {
  image: "/CERTIFICAT.png",
  nameColor: "#ffffff",
  amountColor: "#7dd3fc",
  dateColor: "#aaaaaa",
  nameTop: "58%",
  amountTop: "72%",
  dateTop: "87%",
};

function CertificateContent() {
  const params = useSearchParams();
  const firstName = params.get("firstname") || "";
  const lastName = params.get("lastname") || "";
  const name = firstName || lastName ? `${firstName} ${lastName}`.trim() : (params.get("name") || "Trader");
  const amount = params.get("amount") || "$100,000";
  const date = params.get("date") || new Date().toLocaleDateString("fr-FR");

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

      {/* Certificate wrapper — landscape format */}
      <div style={{ position: "relative", width: "min(700px, 96vw)" }}>
        <img
          src={cfg.image}
          alt="certificate"
          style={{ width: "100%", display: "block", borderRadius: 16 }}
        />

        {/* Nom — cadre "PROUDLY PRESENTED TO" */}
        <div style={{
          position: "absolute",
          top: cfg.nameTop, left: "10%", width: "80%",
          textAlign: "center", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "clamp(14px, 3.5vw, 20px)",
            fontWeight: 900, color: cfg.nameColor,
            letterSpacing: "0.5px",
            textShadow: "0 2px 10px rgba(0,0,0,0.9)",
          }}>
            {name}
          </div>
        </div>

        {/* Montant — cadre "VERIFIED FUNDED ACCOUNT" */}
        <div style={{
          position: "absolute",
          top: cfg.amountTop, left: "10%", width: "80%",
          textAlign: "center", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "clamp(18px, 4.5vw, 28px)",
            fontWeight: 900, color: cfg.amountColor,
            letterSpacing: "-0.5px",
            textShadow: "0 2px 12px rgba(0,0,0,0.9)",
          }}>
            {amount}
          </div>
        </div>

        {/* Date — sous le 2ème cadre */}
        <div style={{
          position: "absolute",
          top: cfg.dateTop, left: "10%", width: "80%",
          textAlign: "center", transform: "translateY(-50%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontSize: "clamp(11px, 2.5vw, 13px)",
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
