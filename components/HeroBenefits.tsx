"use client";

// ════════════════════════════════════════════════════════════════
//  HeroBenefits.tsx — Bandeau 5 bénéfices sous le Hero
//  5 colonnes desktop · 2+2+1 mobile (CSS grid)
//  Icônes : SVG inline, pas d'image, pas de librairie externe
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

// ── SVG icons inline ─────────────────────────────────────────

const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const IconTrending = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IconAward = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
);

const IconTag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

// ── Composant ────────────────────────────────────────────────

export default function HeroBenefits() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const BENEFITS = [
    {
      icon:  <IconShield />,
      title: L("RÈGLES TRANSPARENTES","REGLAS TRANSPARENTES","TRANSPARENT RULES"),
      sub:   L("Sans surprise","Sin sorpresas","No surprises"),
    },
    {
      icon:  <IconZap />,
      title: L("1 SEULE ÉTAPE","1 SOLO PASO","1 SINGLE STEP"),
      sub:   L("Objectif +6%","Objetivo +6%","Target +6%"),
    },
    {
      icon:  <IconTrending />,
      title: L("PARCOURS ÉVOLUTIF","CAMINO EVOLUTIVO","PROGRESSIVE JOURNEY"),
      sub:   L("Jusqu'à 6 Rewards","Hasta 6 Rewards","Up to 6 Rewards"),
    },
    {
      icon:  <IconAward />,
      title: L("SPLIT 90%","SPLIT 90%","90% SPLIT"),
      sub:   L("Sur chaque Reward approuvée","En cada Reward aprobada","On every approved Reward"),
    },
    {
      icon:  <IconTag />,
      title: L("OFFRE DE LANCEMENT","OFERTA DE LANZAMIENTO","LAUNCH OFFER"),
      sub:   L("Jusqu'à -90%","Hasta -90%","Up to -90%"),
    },
  ];

  return (
    <div
      role="list"
      aria-label={L("Avantages Traders Rewards","Ventajas Traders Rewards","Traders Rewards benefits")}
      style={{
        background:   "#080808",
        borderTop:    "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding:      isMobile ? "18px 16px" : "0 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{
          display:             "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
          gap:                 0,
        }}>
          {BENEFITS.map((b, i) => {
            const isLastMobile = isMobile && i === 4;
            return (
              <div
                key={i}
                role="listitem"
                style={{
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "center",
                  textAlign:      "center",
                  padding:        isMobile ? "14px 10px" : "22px 16px",
                  borderRight:    !isMobile && i < BENEFITS.length - 1
                    ? "1px solid rgba(255,255,255,0.06)"
                    : "none",
                  gridColumn:     isLastMobile ? "span 2" : "auto",
                  gap:            8,
                }}
              >
                {/* Icône */}
                <div style={{
                  color:        "#9CCFEA",
                  opacity:      0.80,
                  flexShrink:   0,
                  display:      "flex",
                  alignItems:   "center",
                  justifyContent: "center",
                }}>
                  {b.icon}
                </div>

                {/* Texte */}
                <div>
                  <div style={{
                    fontSize:      isMobile ? 9 : 10,
                    fontWeight:    800,
                    color:         "#FFFFFF",
                    letterSpacing: "1.4px",
                    textTransform: "uppercase",
                    marginBottom:  3,
                    lineHeight:    1.3,
                  }}>
                    {b.title}
                  </div>
                  <div style={{
                    fontSize:   isMobile ? 11 : 12,
                    fontWeight: 400,
                    color:      "rgba(255,255,255,0.34)",
                    lineHeight: 1.4,
                  }}>
                    {b.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
