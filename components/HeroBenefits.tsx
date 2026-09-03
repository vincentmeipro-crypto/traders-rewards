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
      icon: <IconZap />,
      metric: "1",
      title: "CHALLENGE",
    },
    {
      icon: <IconTrending />,
      metric: "5",
      title: "REWARDS",
    },
    {
      icon: <IconShield />,
      metric: "90%",
      title: "SPLIT",
    },
    {
      icon: <IconAward />,
      metric: "48H",
      title: "PAYOUT",
    },
    {
      icon: <IconTag />,
      metric: "10",
      title: L("COMPTES", "CUENTAS", "ACCOUNTS"),
    },
  ];

  return (
    <div
      role="list"
      aria-label={L("Avantages Traders Rewards","Ventajas Traders Rewards","Traders Rewards benefits")}
      style={{
        background: "#050709",
        padding: isMobile ? "12px 10px 18px" : "5px 24px 14px",
      }}
    >
      <style>{`
        @keyframes benefitsGlow {
          0%, 100% { opacity: .35; transform: translateX(-18%); }
          50% { opacity: .8; transform: translateX(18%); }
        }
        .hero-benefits-shell { position: relative; isolation: isolate; }
        .hero-benefits-shell::before {
          content: ""; position: absolute; z-index: 3; pointer-events: none;
          left: 8%; right: 8%; top: -1px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(156,207,234,.2), #dff5ff, rgba(156,207,234,.2), transparent);
          filter: drop-shadow(0 0 7px rgba(156,207,234,.7));
          animation: benefitsGlow 5s ease-in-out infinite;
        }
        .hero-benefit-card { transition: background .25s ease, transform .25s ease; }
        .hero-benefit-card::after {
          content: ""; position: absolute; left: 20px; right: 20px; bottom: 0;
          height: 2px; opacity: 0; transform: scaleX(.35);
          background: linear-gradient(90deg, transparent, #9CCFEA, transparent);
          transition: opacity .25s ease, transform .25s ease;
        }
        .hero-benefit-card:hover { background: rgba(156,207,234,.035); }
        .hero-benefit-card:hover::after { opacity: .9; transform: scaleX(1); }
        .hero-benefit-card:hover .hero-benefit-metric { color: #d9f2ff !important; transform: translateY(-2px); }
        .hero-benefit-metric { transition: color .25s ease, transform .25s ease; }
        @media (prefers-reduced-motion: reduce) {
          .hero-benefits-shell::before { animation: none; }
          .hero-benefit-card, .hero-benefit-metric { transition: none; }
        }
      `}</style>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <div className="hero-benefits-shell" style={{
          display:             "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5, 1fr)",
          gap:                 0,
          overflow:            "hidden",
          border:              "1px solid rgba(156,207,234,.18)",
          borderRadius:        isMobile ? 16 : 20,
          background:          "linear-gradient(145deg, rgba(13,18,23,.98), rgba(5,7,9,.98))",
          boxShadow:           "0 20px 65px rgba(0,0,0,.34), inset 0 1px rgba(255,255,255,.025)",
        }}>
          {BENEFITS.map((b, i) => {
            const isLastMobile = isMobile && i === 4;
            return (
              <div
                key={i}
                role="listitem"
                className="hero-benefit-card"
                style={{
                  display:        "flex",
                  flexDirection:  "column",
                  alignItems:     "flex-start",
                  textAlign:      "left",
                  minHeight:      isMobile ? 124 : 115,
                  padding:        isMobile ? "15px 14px" : "13px 20px 14px",
                  borderRight:    !isMobile && i < BENEFITS.length - 1
                    ? "1px solid rgba(156,207,234,0.11)"
                    : "none",
                  borderBottom:   isMobile && i < 4 ? "1px solid rgba(255,255,255,0.08)" : "none",
                  gridColumn:     isLastMobile ? "span 2" : "auto",
                  position:       "relative",
                }}
              >
                <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 13 : 9 }}>
                  <span style={{ color: "rgba(156,207,234,.68)", fontSize: 8, fontWeight: 900, letterSpacing: "2px" }}>{L("AVANTAGE", "VENTAJA", "BENEFIT")} 0{i + 1}</span>
                  <span style={{ width: 27, height: 27, border: "1px solid rgba(156,207,234,.14)", borderRadius: 8, color: "rgba(156,207,234,.42)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(156,207,234,.025)" }}>{b.icon}</span>
                </div>
                <div className="hero-benefit-metric" style={{ color: "#9CCFEA", fontSize: isMobile ? "clamp(2.25rem, 11vw, 3.5rem)" : "clamp(2.35rem, 3vw, 3.65rem)", fontWeight: 850, letterSpacing: "-.055em", lineHeight: .86, textShadow: "0 0 30px rgba(156,207,234,.14)" }}>
                  {b.metric}
                </div>
                <div style={{ color: "#fff", fontSize: isMobile ? 10 : 11, fontWeight: 900, letterSpacing: isMobile ? "1.4px" : "1.8px", marginTop: 8 }}>
                  {b.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
