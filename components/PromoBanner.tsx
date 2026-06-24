"use client";
import { useState, useEffect } from "react";

import { useLanguage } from "@/lib/LanguageContext";

const END = new Date("2026-07-15T23:59:59");

export default function PromoBanner() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (now > END) return;
    const dismissed = sessionStorage.getItem("promo_banner_dismissed");
    if (!dismissed) setVisible(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const height = visible ? (isMobile ? "56px" : "40px") : "0px";
    document.documentElement.style.setProperty("--promo-banner-height", height);
    return () => { document.documentElement.style.setProperty("--promo-banner-height", "0px"); };
  }, [visible, isMobile]);

  if (!visible) return null;

  const line1 = lang === "fr" ? "★ OFFRE LIMITÉE — 50% DE RÉDUCTION" : "★ LIMITED OFFER — 50% OFF";
  const line2 = lang === "fr" ? "sur tous les challenges · Code TRD50" : "all challenges · Code TRD50";
  const textDesktop = lang === "fr"
    ? "★ OFFRE LIMITÉE — 50% DE RÉDUCTION sur tous les challenges · Code TRD50"
    : "★ LIMITED OFFER — 50% OFF all challenges · Code TRD50";

  const height = isMobile ? 56 : 40;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 200,
      height,
      background: "#000000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Spotlight bleu au centre */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 60% 300% at 50% 50%, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0.08) 50%, transparent 75%)",
        pointerEvents: "none",
      }} />

      {/* Fondu noir sur les côtés */}
      <div style={{
        position: "absolute",
        left: 0, top: 0, bottom: 0, width: "15%",
        background: "linear-gradient(to right, #000000 0%, transparent 100%)",
        pointerEvents: "none",
        zIndex: 1,
      }} />
      <div style={{
        position: "absolute",
        right: 0, top: 0, bottom: 0, width: "15%",
        background: "linear-gradient(to left, #000000 0%, transparent 100%)",
        pointerEvents: "none",
        zIndex: 1,
      }} />

      {isMobile ? (
        <div style={{ textAlign: "center", zIndex: 2, lineHeight: 1.5 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", color: "#FFFFFF", textShadow: "0 0 16px rgba(59,130,246,0.9), 0 0 32px rgba(59,130,246,0.4)" }}>
            {line1}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", color: "#FFFFFF", textShadow: "0 0 16px rgba(59,130,246,0.9), 0 0 32px rgba(59,130,246,0.4)" }}>
            {line2}
          </div>
        </div>
      ) : (
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: "0.9px", color: "#FFFFFF",
          whiteSpace: "nowrap", zIndex: 2,
          textShadow: "0 0 16px rgba(59,130,246,0.9), 0 0 32px rgba(59,130,246,0.4)",
        }}>
          {textDesktop}
        </span>
      )}

    </div>
  );
}
