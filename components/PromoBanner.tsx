"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const END = new Date("2026-08-15T23:59:59");

export default function PromoBanner() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (now > END) return;
    const dismissed = sessionStorage.getItem("promo_banner_dismissed_tr33");
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

  const line1 = lang === "fr" ? "🔥 OFFRE ÉTÉ — 33% DE RÉDUCTION" : "🔥 SUMMER OFFER — 33% OFF";
  const line2 = lang === "fr" ? "sur tous les challenges · Code TR33 · Jusqu'au 15 août" : "all challenges · Code TR33 · Until Aug 31";
  const textDesktop = lang === "fr"
    ? "🔥 OFFRE ÉTÉ — 33% DE RÉDUCTION sur tous les challenges · Code TR33 · Jusqu'au 15 août"
    : "🔥 SUMMER OFFER — 33% OFF all challenges · Code TR33 · Until Aug 31";

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
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 60% 300% at 50% 50%, rgba(249,115,22,0.30) 0%, rgba(249,115,22,0.07) 50%, transparent 75%)",
        pointerEvents: "none",
      }} />
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "15%", background: "linear-gradient(to right, #000000 0%, transparent 100%)", pointerEvents: "none", zIndex: 1 }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "15%", background: "linear-gradient(to left, #000000 0%, transparent 100%)", pointerEvents: "none", zIndex: 1 }} />

      {isMobile ? (
        <div style={{ textAlign: "center", zIndex: 2, lineHeight: 1.5 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", color: "#FFFFFF", textShadow: "0 0 16px rgba(249,115,22,0.9), 0 0 32px rgba(249,115,22,0.4)" }}>{line1}</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", color: "#FFFFFF", textShadow: "0 0 16px rgba(249,115,22,0.9), 0 0 32px rgba(249,115,22,0.4)" }}>{line2}</div>
        </div>
      ) : (
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.9px", color: "#FFFFFF", whiteSpace: "nowrap", zIndex: 2, textShadow: "0 0 16px rgba(249,115,22,0.9), 0 0 32px rgba(249,115,22,0.4)" }}>
          {textDesktop}
        </span>
      )}
    </div>
  );
}
