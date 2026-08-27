"use client";

// ════════════════════════════════════════════════════════════════
//  Hero.tsx — Traders Rewards Premium · v2 Refonte
//  Layout  : 2 colonnes — Gauche (texte/CTAs) · Droite (parcours 6250$)
//  Couleur : Noir / Blanc / Chrome · Neon #69C5FD
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const ACCENT = "#9CCFEA"; // badge dot (gauche)
const NEON   = "#69C5FD"; // pulse neon + montants (droite) + H1 accent

// Parcours 100K — rendu top→bottom (05 en haut visuellement)
const STEPS = [
  { num: "05", name: "REWARD #5",  sub: "",              amount: "1 750 $" },
  { num: "04", name: "REWARD #4",  sub: "",              amount: "1 500 $" },
  { num: "03", name: "REWARD #3",  sub: "",              amount: "1 250 $" },
  { num: "02", name: "REWARD #2",  sub: "",              amount: "1 000 $" },
  { num: "01", name: "REWARD #1",  sub: "",              amount:   "750 $" },
  { num: "00", name: "CHALLENGER", sub: "CHALLENGE +6%", amount:     null  },
] as const;

export default function Hero() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => (isFr ? fr : isEs ? es : en);

  const [isMobile, setIsMobile] = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!mounted) return null;

  // ── i18n ────────────────────────────────────────────────────
  const pill    = L("OFFRE DE LANCEMENT",    "OFERTA DE LANZAMIENTO", "LAUNCH OFFER");
  const h1L1    = L("UN SEUL CHALLENGE",     "UN SOLO CHALLENGE",     "ONE SINGLE CHALLENGE");
  const h1L2pre = L("DEVENEZ ",             "CONVIÉRTETE EN ",       "BECOME A ");
  const h1L2acc = "TRADER REWARD";
  const ctaMain = L("CHOISIR MON CHALLENGE","ELEGIR MI CHALLENGE",   "CHOOSE MY CHALLENGE");
  const ctaSub  = L("DÉCOUVRIR LE PARCOURS","DESCUBRIR EL CAMINO",   "EXPLORE THE JOURNEY");

  const promoFS = isMobile
    ? "clamp(2.4rem, 10vw, 3.6rem)"
    : "clamp(2.8rem, 4vw, 5rem)";

  return (
    <>
      <style>{`
        /* ── Entrée fade-up ── */
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Dot pulsant dans le badge ── */
        @keyframes pillDot {
          0%, 100% { box-shadow: 0 0 6px rgba(156,207,234,0.90); }
          50%       { box-shadow: 0 0 14px rgba(156,207,234,0.40); opacity: 0.55; }
        }

        /* ── Reflet chrome traversant le bouton principal ── */
        @keyframes chromeSweep {
          0%   { transform: translateX(-130%); }
          55%  { transform: translateX(-130%); }
          100% { transform: translateX(130%); }
        }

        /* ── Pulse neon : monte de 00 (bas) vers 05 (haut) ── */
        @keyframes neonPulseMove {
          0%   { top: calc(100% - 8px); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 8px; opacity: 0; }
        }

        /* ── Respiration douce des cercles ── */
        @keyframes circleBreath {
          0%, 100% { box-shadow: 0 0 5px 1px rgba(105,197,253,0.22); }
          50%       { box-shadow: 0 0 12px 3px rgba(105,197,253,0.48); }
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CTA PRINCIPAL — plaque métal chrome poli
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .h-cta-main {
          display: inline-flex; align-items: center; gap: 10px;
          position: relative; overflow: hidden;
          background: linear-gradient(
            115deg,
            #5f8ca4  0%, #d5f1ff 18%, #8fc4df 34%,
            #ecf9ff 48%, #74a9c4 62%, #c4e9fa 78%, #5f8ca4 100%
          );
          color: #050505;
          font-weight: 900; letter-spacing: 1.8px; text-transform: uppercase;
          text-decoration: none; border-radius: 10px; cursor: pointer;
          font-family: inherit; white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.82);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            inset 0 -1px 0 rgba(0,0,0,0.22),
            0 8px 30px rgba(156,207,234,0.10);
          transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
        }
        .h-cta-main::before {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(
            110deg,
            transparent 25%, rgba(255,255,255,0.12) 38%,
            rgba(255,255,255,0.72) 48%, rgba(255,255,255,0.14) 58%, transparent 72%
          );
          transform: translateX(-130%);
          pointer-events: none; z-index: 1;
          animation: chromeSweep 4.5s ease-in-out infinite;
        }
        .h-cta-main svg {
          position: relative; z-index: 2;
          transition: transform 0.22s ease; flex-shrink: 0;
        }
        .h-cta-main:hover svg { transform: translateX(3px); }
        .h-cta-main:hover {
          transform: translateY(-2px); filter: brightness(1.07);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,1),
            inset 0 -1px 0 rgba(0,0,0,0.18),
            0 10px 34px rgba(255,255,255,0.09);
        }
        .h-cta-main:active  { transform: translateY(0) scale(0.99); }
        .h-cta-main:focus-visible {
          outline: 2px solid rgba(255,255,255,0.72); outline-offset: 3px;
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CTA SECONDAIRE — transparent / blanc
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .h-cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(255,255,255,0.52);
          font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
          text-decoration: none; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.16); cursor: pointer;
          font-family: inherit; white-space: nowrap;
          transition: border-color 0.22s ease, color 0.22s ease, transform 0.22s ease;
        }
        .h-cta-ghost:hover {
          border-color: rgba(255,255,255,0.52); color: #FFFFFF;
          transform: translateY(-2px);
        }
        .h-cta-ghost:focus-visible {
          outline: 2px solid rgba(255,255,255,0.50); outline-offset: 3px;
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CHROME MÉTALLIQUE — grands chiffres bloc promo
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .h-promo-chrome {
          background: linear-gradient(
            180deg,
            #ffffff  0%, #d8d8d8 18%, #7d7d7d 38%,
            #f8f8f8 52%, #a0a0a0 68%, #ffffff 82%, #777777 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 1px 0 rgba(255,255,255,0.30))
                  drop-shadow(0 3px 6px rgba(0,0,0,0.50));
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           H1 — 2 lignes forcées sur desktop
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .h1-line {
          display: block;
          white-space: nowrap;
        }
        @media (max-width: 899px) { .h1-line { white-space: normal; } }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           PANNEAU DROIT — ligne neon verticale + cercles
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

        /* Ligne fine qui relie tous les cercles */
        .h-prog-line {
          position: absolute;
          top: 0; bottom: 0;
          left: 50%; transform: translateX(-50%);
          width: 1px;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(105,197,253,0.20) 6%,
            rgba(105,197,253,0.20) 94%,
            transparent 100%
          );
          z-index: 0;
          pointer-events: none;
        }

        /* Pulse neon qui monte — segment lumineux traversant */
        .h-prog-line::after {
          content: '';
          position: absolute;
          left: 50%; transform: translateX(-50%);
          width: 2px; height: 36px;
          background: linear-gradient(
            to top,
            transparent,
            rgba(105,197,253,0.50) 20%,
            #69C5FD 50%,
            rgba(105,197,253,0.50) 80%,
            transparent
          );
          border-radius: 2px;
          box-shadow:
            0 0 8px 2px rgba(105,197,253,0.55),
            0 0 18px 5px rgba(105,197,253,0.22);
          animation: neonPulseMove 5s ease-in-out infinite;
        }

        /* Cercles numérotés */
        .h-prog-circle {
          position: relative; z-index: 2;
          width: 34px; height: 34px; flex-shrink: 0;
          border-radius: 50%;
          border: 1px solid rgba(105,197,253,0.32);
          background: #040c12;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 900; letter-spacing: 1px;
          color: rgba(105,197,253,0.68);
          animation: circleBreath 3.2s ease-in-out infinite;
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           REDUCED MOTION
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; }
          .h-cta-main, .h-cta-ghost { transition: none; }
          .h-cta-main::before { animation: none; }
          .h-prog-line::after { animation: none; opacity: 0; }
          .h-prog-circle { animation: none; }
        }
      `}</style>

      <section
        id="hero"
        aria-label="Hero Traders Rewards"
        style={{
          background: "#000000",
          width:      "100%",
          position:   "relative",
          overflow:   "hidden",
          boxSizing:  "border-box",
        }}
      >

        {/* ══════════════════════════════════════════════════════
            WRAPPER FLEX — 2 colonnes desktop / 1 colonne mobile
        ══════════════════════════════════════════════════════ */}
        <div style={{
          display:       "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems:    isMobile ? "stretch" : "center",
          minHeight:     isMobile ? 0 : "min(860px, 90vh)",
          paddingTop:    isMobile
            ? "calc(60px + var(--promo-banner-height, 0px))"
            : "calc(72px + var(--promo-banner-height, 0px))",
          paddingBottom: isMobile ? 0 : 0,
          maxWidth:      1500,
          margin:        "0 auto",
          paddingLeft:   isMobile ? 0 : "max(40px, 4vw)",
          paddingRight:  isMobile ? 0 : "max(24px, 3vw)",
          gap:           isMobile ? 0 : "clamp(24px, 3vw, 56px)",
          boxSizing:     "border-box",
        }}>

          {/* ════════════════════════════════════════════════
              COLONNE GAUCHE — Badge / H1 / Promo / CTAs
          ════════════════════════════════════════════════ */}
          <div style={{
            flex:           isMobile ? "none" : "0 0 52%",
            display:        "flex",
            flexDirection:  "column",
            justifyContent: "center",
            paddingLeft:    isMobile ? 22 : 0,
            paddingRight:   isMobile ? 22 : 12,
            paddingTop:     isMobile ? 32 : 52,
            paddingBottom:  isMobile ? 32 : 52,
          }}>

            {/* ── Badge OFFRE DE LANCEMENT ── */}
            <div style={{ marginBottom: isMobile ? 16 : 22, animation: "heroFadeUp 0.44s ease both" }}>
              <span style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          9,
                background:   "rgba(255,255,255,0.06)",
                border:       "1px solid rgba(255,255,255,0.22)",
                borderRadius: 100,
                padding:      isMobile ? "6px 16px" : "7px 20px",
              }}>
                <span style={{
                  display:      "inline-block",
                  width:        6,
                  height:       6,
                  borderRadius: "50%",
                  background:   ACCENT,
                  flexShrink:   0,
                  animation:    "pillDot 2.4s ease-in-out infinite",
                }} />
                <span style={{
                  fontSize:      10,
                  fontWeight:    800,
                  color:         "#FFFFFF",
                  letterSpacing: "2.2px",
                  textTransform: "uppercase",
                  whiteSpace:    "nowrap",
                }}>
                  {pill}
                </span>
              </span>
            </div>

            {/* ── H1 — 2 lignes ── */}
            <h1 style={{
              fontWeight:    900,
              margin:        "0 0 28px",
              textTransform: "uppercase",
              textAlign:     "left",
              letterSpacing: isMobile ? "0px" : "0.5px",
              lineHeight:    0.95,
              animation:     "heroFadeUp 0.52s ease 0.05s both",
            }}>
              {/* Ligne 1 — blanc */}
              <span
                className="h1-line"
                style={{
                  fontSize: isMobile ? "clamp(2rem, 7vw, 3.2rem)" : "clamp(50px, 4vw, 72px)",
                  color: "#FFFFFF",
                }}
              >
                {h1L1}
              </span>
              {/* Ligne 2 — DEVENEZ blanc + TRADER REWARD. neon */}
              <span
                className="h1-line"
                style={{
                  marginTop: isMobile ? 4 : 7,
                  fontSize:  isMobile ? "clamp(2rem, 7vw, 3.2rem)" : "clamp(50px, 4vw, 72px)",
                }}
              >
                <span style={{ color: "#FFFFFF" }}>{h1L2pre}</span>
                <span style={{ color: "#9CCFEA" }}>{h1L2acc}</span>
              </span>
            </h1>

            {/* ── Bloc promo : -90% / 19€ ── */}
            <div style={{
              display:              "inline-flex",
              alignItems:           "stretch",
              alignSelf:            "flex-start",
              background:           "linear-gradient(135deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.012) 100%)",
              border:               "1px solid rgba(255,255,255,0.28)",
              borderRadius:         16,
              padding:              isMobile ? "14px 18px" : "18px 28px",
              marginBottom:         isMobile ? 22 : 30,
              animation:            "heroFadeUp 0.52s ease 0.10s both",
              boxShadow:            "inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 35px rgba(0,0,0,0.35)",
              backdropFilter:       "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            } as React.CSSProperties}>

              {/* Colonne 1 Challenge — -80% */}
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.44)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:3 }}>
                  1 CHALLENGE
                </div>
                <div style={{ fontSize:promoFS, fontWeight:900, letterSpacing:"-1px", lineHeight:0.90, marginBottom:5, color:"rgba(255,255,255,0.82)" }}>
                  -80%
                </div>
                <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.44)", letterSpacing:"1.5px", textTransform:"uppercase" }}>
                  {L("PAIEMENT UNIQUE","PAGO ÚNICO","ONE-TIME")}
                </div>
              </div>

              {/* Séparateur vertical */}
              <div style={{
                width:      1,
                alignSelf:  "stretch",
                background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.22) 20%, rgba(255,255,255,0.22) 80%, transparent)",
                margin:     isMobile ? "0 16px" : "0 24px",
                flexShrink: 0,
              }} />

              {/* Colonne Pack ×3 — -90% · BEST */}
              <div>
                <div style={{ fontSize:9, fontWeight:700, color:"rgba(156,207,234,0.70)", letterSpacing:"2px", textTransform:"uppercase", marginBottom:3, display:"flex", alignItems:"center", gap:6 }}>
                  PACK ×3
                  <span style={{
                    fontSize:9, fontWeight:900, color:"#9CCFEA",
                    background:"rgba(156,207,234,0.14)", border:"1px solid rgba(156,207,234,0.35)",
                    borderRadius:4, padding:"1px 5px", letterSpacing:"0.8px", lineHeight:1.5,
                  }}>
                    BEST
                  </span>
                </div>
                <div style={{ fontSize:promoFS, fontWeight:900, letterSpacing:"-1px", lineHeight:0.90, marginBottom:5, color:"#9CCFEA" }}>
                  -90%
                </div>
                <div style={{ fontSize:9, fontWeight:700, color:"rgba(156,207,234,0.55)", letterSpacing:"1.5px", textTransform:"uppercase" }}>
                  {L("PAIEMENT UNIQUE","PAGO ÚNICO","ONE-TIME")}
                </div>
              </div>
            </div>

            {/* ── CTAs ── */}
            <div style={{
              display:       "flex",
              flexDirection: isMobile ? "column" : "row",
              gap:           isMobile ? 8 : 12,
              alignItems:    isMobile ? "stretch" : "center",
              animation:     "heroFadeUp 0.52s ease 0.15s both",
            }}>
              <a
                href="#pricing"
                className="h-cta-main"
                style={{
                  fontSize:       isMobile ? 13 : 12,
                  padding:        isMobile ? "17px 28px" : "15px 32px",
                  justifyContent: isMobile ? "center" : undefined,
                }}
              >
                {ctaMain}
                <svg
                  width="14" height="14"
                  viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <a
                href="#parcours-3-niveaux"
                className="h-cta-ghost"
                style={{
                  fontSize:  isMobile ? 10 : 12,
                  padding:   isMobile ? "9px 18px" : "15px 32px",
                  alignSelf: isMobile ? "flex-start" : undefined,
                  opacity:   isMobile ? 0.8 : 1,
                }}
              >
                {ctaSub}
              </a>
            </div>

            {/* ── Patch premium : Reward auto 48H ── */}
            <div style={{ marginTop: isMobile ? 14 : 20, animation: "heroFadeUp 0.52s ease 0.20s both" }}>
              <span style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          7,
                background:   "rgba(34,197,94,0.07)",
                border:       "1px solid rgba(34,197,94,0.20)",
                borderRadius: 100,
                padding:      isMobile ? "5px 12px" : "6px 14px",
              }}>
                <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 900, lineHeight: 1 }}>✓</span>
                <span style={{
                  fontSize:      10,
                  fontWeight:    800,
                  color:         "#22c55e",
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  whiteSpace:    "nowrap",
                }}>
                  {L("Reward Payé en Automatique en 48H","Reward Pagada Automáticamente en 48H","Reward Paid Automatically in 48H")}
                </span>
              </span>
            </div>

          </div>{/* fin colonne gauche */}

          {/* ════════════════════════════════════════════════
              COLONNE DROITE — Parcours 6 250 $ · 100K
          ════════════════════════════════════════════════ */}
          <div style={{
            flex:           isMobile ? "none" : "1 1 0",
            display:        "flex",
            flexDirection:  "column",
            justifyContent: "center",
            padding:        isMobile ? "0 0 20px" : "52px 0",
          }}>

            {/* Parcours — fond noir, pas de carte */}
            <div style={{
              padding:  isMobile ? "16px 18px 12px" : "34px 32px 26px",
              position: "relative",
            }}>

              {/* ── Header : JUSQU'À / 6 250 $ / DE REWARDS CUMULÉES ── */}
              <div style={{
                textAlign:    "center",
                marginBottom: isMobile ? 8 : 18,
                animation:    "heroFadeUp 0.52s ease 0.20s both",
              }}>
                <div style={{
                  fontSize:      10,
                  fontWeight:    800,
                  letterSpacing: "2.8px",
                  color:         "rgba(105,197,253,0.50)",
                  textTransform: "uppercase",
                  marginBottom:  8,
                }}>
                  {L("GAGNEZ JUSQU'À","GANA HASTA","EARN UP TO")}
                </div>
                <div style={{
                  fontSize:          isMobile ? "clamp(2.2rem,8vw,3rem)" : "clamp(3.2rem,4.2vw,4.8rem)",
                  fontWeight:        900,
                  letterSpacing:     "-1.5px",
                  lineHeight:        0.90,
                  color:             "#FFFFFF",
                  fontVariantNumeric:"tabular-nums",
                }}>
                  6 250 $
                </div>
                <div style={{
                  fontSize:      10,
                  fontWeight:    800,
                  letterSpacing: "2.8px",
                  color:         "rgba(105,197,253,0.50)",
                  textTransform: "uppercase",
                  marginTop:     9,
                }}>
                  {L("AVEC 1 SEUL COMPTE","CON 1 SOLA CUENTA","WITH 1 ACCOUNT")}
                </div>
              </div>

              {/* Séparateur fin */}
              <div style={{
                height:       1,
                background:   "rgba(105,197,253,0.09)",
                marginBottom: isMobile ? 6 : 14,
              }} />

              {/* ── Progression verticale 05 → 00 ── */}
              <div style={{
                position:  "relative",
                animation: "heroFadeUp 0.52s ease 0.25s both",
              }}>
                {/* Container steps avec ligne absolue derrière */}
                <div style={{ position: "relative" }}>

                  {/* Ligne verticale neon — centrée sur les cercles (qui sont à 50%) */}
                  <div className="h-prog-line" />

                  {/* Steps : 05 (haut) → 00 (bas) */}
                  {STEPS.map((step, idx) => (
                    <div
                      key={step.num}
                      style={{
                        display:    "flex",
                        alignItems: "center",
                        gap:        0,
                        position:   "relative",
                        zIndex:     1,
                        height:     isMobile ? 36 : 46,
                      }}
                    >
                      {/* Label gauche */}
                      <div style={{
                        flex:       1,
                        textAlign:  "right",
                        paddingRight: isMobile ? 11 : 16,
                      }}>
                        <div style={{
                          fontSize:      isMobile ? 9 : 10,
                          fontWeight:    900,
                          letterSpacing: "1.4px",
                          textTransform: "uppercase",
                          color:         step.num === "00"
                            ? "rgba(255,255,255,0.30)"
                            : "rgba(255,255,255,0.58)",
                          lineHeight:    1.2,
                        }}>
                          {step.name}
                        </div>
                        {step.sub && (
                          <div style={{
                            fontSize:      isMobile ? 7 : 7.5,
                            fontWeight:    700,
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                            color:         "rgba(105,197,253,0.42)",
                            marginTop:     2,
                          }}>
                            {step.sub}
                          </div>
                        )}
                      </div>

                      {/* Cercle centré — exactement 34×34 */}
                      <div
                        className="h-prog-circle"
                        style={{
                          animationDelay: `-${idx * 0.55}s`,
                        }}
                      >
                        {step.num}
                      </div>

                      {/* Montant droit */}
                      <div style={{
                        flex:        1,
                        textAlign:   "left",
                        paddingLeft: isMobile ? 11 : 16,
                      }}>
                        {step.amount != null && (
                          <div style={{
                            fontSize:          isMobile ? 11 : 12,
                            fontWeight:        900,
                            letterSpacing:     "0.5px",
                            color:             NEON,
                            fontVariantNumeric:"tabular-nums",
                          }}>
                            {step.amount}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                </div>
              </div>

              {/* PARCOURS 100K — bas droite */}
              <div style={{
                textAlign:     "right",
                marginTop:     isMobile ? 12 : 16,
                fontSize:      8,
                fontWeight:    900,
                letterSpacing: "2.8px",
                textTransform: "uppercase",
                color:         "rgba(105,197,253,0.26)",
              }}>
                PARCOURS 100K
              </div>

            </div>{/* fin dark card */}
          </div>{/* fin colonne droite */}

        </div>{/* fin wrapper flex */}
      </section>
    </>
  );
}
