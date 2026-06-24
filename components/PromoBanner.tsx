"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const END = new Date("2026-07-15T23:59:59");

export default function PromoBanner() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (now > END) return;
    const dismissed = sessionStorage.getItem("promo_banner_dismissed");
    if (!dismissed) setVisible(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--promo-banner-height", visible ? "40px" : "0px");
    return () => { document.documentElement.style.setProperty("--promo-banner-height", "0px"); };
  }, [visible]);

  const dismiss = () => {
    sessionStorage.setItem("promo_banner_dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  const text = lang === "fr"
    ? "★ OFFRE LIMITÉE — 50% DE RÉDUCTION sur tous les challenges · Code TRD50"
    : "★ LIMITED OFFER — 50% OFF all challenges · Code TRD50";

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 200,
      height: 40,
      background: "#0A0A0A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Spotlight glow au centre */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 55% 200% at 50% 50%, rgba(255,255,255,0.13) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Fondu noir sur les côtés */}
      <div style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0, width: "20%",
        background: "linear-gradient(to right, #0A0A0A 0%, transparent 100%)",
        pointerEvents: "none",
        zIndex: 1,
      }} />
      <div style={{
        position: "absolute",
        right: 0, top: 0, bottom: 0, width: "20%",
        background: "linear-gradient(to left, #0A0A0A 0%, transparent 100%)",
        pointerEvents: "none",
        zIndex: 1,
      }} />

      <span style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.9px",
        color: "#FFFFFF",
        whiteSpace: "nowrap",
        textShadow: "0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.2)",
        zIndex: 2,
      }}>
        {text}
      </span>

      <button
        onClick={dismiss}
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.35)", padding: 4, display: "flex",
          alignItems: "center", zIndex: 3, transition: "color 0.2s",
        }}
        onMouseOver={e => (e.currentTarget.style.color = "#fff")}
        onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
      >
        <X size={14} />
      </button>
    </div>
  );
}
