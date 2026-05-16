"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const items = [
  { en: "🔥 LIMITED OFFER — 50% OFF all challenges", fr: "🔥 OFFRE LIMITÉE — 50% DE RÉDUCTION sur tous les challenges" },
  { en: "⚡ Use code ELITE50 at checkout", fr: "⚡ Utilisez le code ELITE50 au paiement" },
  { en: "🏆 No time limit · Fee refunded at first reward", fr: "🏆 Aucune limite de temps · Frais remboursés à la 1ère récompense" },
  { en: "💰 Up to $200,000 in simulated capital", fr: "💰 Jusqu'à 200 000$ de capital simulé" },
];

export default function PromoBanner() {
  const { lang } = useLanguage();
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  const isFr = lang === "fr";
  const texts = [...items, ...items]; // duplicate for seamless loop

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 200,
      height: 40,
      background: "linear-gradient(90deg, #0f2744, #1a3a6b, #0f2744)",
      borderBottom: "1px solid rgba(45,125,210,0.4)",
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
    }}>

      {/* Scrolling text */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Left fade */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 60,
          background: "linear-gradient(to right, #0f2744, transparent)",
          zIndex: 2, pointerEvents: "none",
        }} />
        {/* Right fade */}
        <div style={{
          position: "absolute", right: 32, top: 0, bottom: 0, width: 60,
          background: "linear-gradient(to left, #0f2744, transparent)",
          zIndex: 2, pointerEvents: "none",
        }} />

        <div className="marquee-track">
          {texts.map((item, i) => (
            <span key={i} style={{
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.8px",
              color: "#fff",
              padding: "0 48px",
            }}>
              {isFr ? item.fr : item.en}
              <span style={{
                display: "inline-block",
                width: 4, height: 4,
                borderRadius: "50%",
                backgroundColor: "#2D7DD2",
                margin: "0 0 0 48px",
              }} />
            </span>
          ))}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={() => setClosed(true)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.5)", padding: "0 12px",
          display: "flex", alignItems: "center", flexShrink: 0,
          transition: "color 0.2s",
        }}
        onMouseOver={e => (e.currentTarget.style.color = "#fff")}
        onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
      >
        <X size={14} />
      </button>
    </div>
  );
}
