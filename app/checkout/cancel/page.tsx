"use client";
import Image from "next/image";
import { XCircle } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function CancelPage() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <Image src="/Traders_Rewards_logo_E_sans_barre_BLANC_transparent_4K.png" alt="Traders Rewards" width={80} height={80} style={{ objectFit: "contain", marginBottom: 32 }} />

        <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #111", borderRadius: 20, padding: "48px 40px", boxShadow: "0 8px 40px rgba(21,101,192,0.08)" }}>
          <XCircle size={56} color="#ef4444" style={{ marginBottom: 24 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: "#0D1B3E" }}>
            {L("Paiement annulé", "Pago cancelado", "Payment Cancelled")}
          </h1>
          <p style={{ color: "#7a90b0", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            {L(
              "Pas d'inquiétude — votre paiement n'a pas été traité. Vous pouvez réessayer quand vous le souhaitez.",
              "Sin problema — tu pago no fue procesado. Puedes intentarlo de nuevo cuando quieras.",
              "No worries — your payment was not processed. You can try again whenever you're ready."
            )}
          </p>
          <a href="/#pricing" className="btn-primary" style={{ display: "block", textAlign: "center", padding: "14px", fontSize: 14 }}>
            {L("Retour aux Challenges", "Volver a los Challenges", "Back to Challenges")}
          </a>
          <a href="/dashboard" style={{ display: "block", textAlign: "center", color: "#7a90b0", fontSize: 13, marginTop: 16, textDecoration: "none" }}>
            {L("Aller au Dashboard", "Ir al Panel", "Go to Dashboard")}
          </a>
        </div>
      </div>
    </div>
  );
}
