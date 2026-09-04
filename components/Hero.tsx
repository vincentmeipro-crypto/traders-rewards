"use client";

// ════════════════════════════════════════════════════════════════
//  Hero.tsx — Traders Rewards Premium · v2 Refonte
//  Layout  : 2 colonnes — Gauche (texte/CTAs) · Droite (parcours 6250$)
//  Couleur : Noir / Blanc / Chrome · Neon #69C5FD
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const ACCENT = "#D4A0A8"; // badge dot (gauche) — rose gold nacré

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
  const pill    = L("Programme éducatif trading simulé", "Programa educativo de trading simulado", "Simulated trading education program");
  const h1L1    = "1 CHALLENGE.";
  const h1L2pre = "";
  const h1L2acc = "5 RÉCOMPENSES.";
  const ctaMain = L("Choisir mon Challenge","Elegir mi Challenge",   "Choose my Challenge");

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
        @keyframes heroDotTwinkle {
          0%, 100% { opacity: 0.48; box-shadow: 0 0 0 rgba(183,110,121,0); transform: scale(0.82); }
          50% { opacity: 1; box-shadow: 0 0 8px rgba(183,110,121,0.80), 0 0 14px rgba(183,110,121,0.35); transform: scale(1.12); }
        }
        .h-pill-dot { animation: heroDotTwinkle 1.8s ease-in-out infinite; }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CTA PRINCIPAL — nacré / rose gold premium
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .h-cta-main {
          display: inline-flex; align-items: center; gap: 18px;
          position: relative; overflow: hidden;
          background: linear-gradient(110deg, #F7F2EF 0%, #E8D4CF 35%, #FFF9F6 58%, #D8A39D 100%);
          color: #1A0808;
          font-weight: 730; letter-spacing: 0.05px; text-transform: none;
          text-decoration: none; border-radius: 16px; cursor: pointer;
          font-family: inherit; white-space: nowrap;
          border: 1px solid rgba(241,208,200,0.55);
          box-shadow: 0 10px 35px rgba(183,110,121,0.15), 0 3px 12px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.75);
          transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        }
        .h-cta-main svg {
          transition: transform 0.25s ease; flex-shrink: 0;
        }
        .h-cta-main:hover svg { transform: translateX(5px); }
        .h-cta-main:hover {
          transform: translateY(-2px);
          background: linear-gradient(110deg, #FBF7F4 0%, #EEDBD7 35%, #FFFAF7 58%, #C9908A 100%);
          box-shadow: 0 18px 48px rgba(183,110,121,0.22), 0 5px 16px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.85);
        }
        .h-cta-main:active  { transform: translateY(0) scale(0.98); }
        .h-cta-main:focus-visible {
          outline: 2px solid rgba(255,255,255,0.72); outline-offset: 3px;
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CTA SECONDAIRE — transparent / blanc
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        .h-cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(255,255,255,0.52);
          font-weight: 600; letter-spacing: 0.2px; text-transform: none;
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
          background: rgba(183,110,121,0.16);
          z-index: 0;
          pointer-events: none;
        }

        /* Cercles numérotés */
        .h-prog-circle {
          position: relative; z-index: 2;
          width: 42px; height: 42px; flex-shrink: 0;
          border-radius: 50%;
          border: 1px solid rgba(183,110,121,0.24);
          background: #171b1f;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 800; letter-spacing: 1px;
          color: rgba(194,226,241,0.78);
        }

        @property --premium-border-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes premiumBorderFlow {
          to { --premium-border-angle: 360deg; }
        }
        .h-premium-panel {
          isolation: isolate;
          overflow: hidden;
          border: 2px solid transparent !important;
          background:
            linear-gradient(#07090c, #07090c) padding-box,
            conic-gradient(
              from var(--premium-border-angle),
              rgba(105,197,253,0.30) 0deg 230deg,
              rgba(105,197,253,0.58) 258deg,
              #69c5fd 286deg,
              #e2f6ff 302deg,
              #69c5fd 318deg,
              rgba(105,197,253,0.58) 342deg,
              rgba(105,197,253,0.30) 360deg
            ) border-box !important;
          animation: premiumBorderFlow 4.8s linear infinite;
          box-shadow:
            0 22px 60px rgba(0,0,0,0.42),
            0 0 0 1px rgba(105,197,253,0.08),
            0 0 26px rgba(105,197,253,0.08) !important;
        }
        .h-premium-panel::before {
          display: none;
        }
        .h-premium-panel::after {
          content: "";
          position: absolute;
          inset: 7px;
          z-index: 5;
          border: 1px solid rgba(0,0,0,0.96);
          border-radius: 16px;
          box-shadow: inset 0 0 0 1px rgba(183,110,121,0.055);
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .h-premium-panel { animation: none; }
        }
        @media (max-width: 899px) {
          .h-premium-panel {
            overflow: hidden;
            padding: 24px 14px 18px !important;
            border-radius: 18px !important;
            box-shadow:
              0 18px 42px rgba(0,0,0,0.40),
              0 0 0 1px rgba(105,197,253,0.07),
              0 0 20px rgba(105,197,253,0.07) !important;
          }
          .h-premium-panel::after {
            display: block;
            inset: 5px;
            border-radius: 12px;
          }
        }
        @media (max-width: 899px) {
          .h-prog-circle {
            width: 42px; height: 42px;
            font-size: 11px;
          }
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           REDUCED MOTION
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; }
          .h-cta-main { animation: none; transition: none; }
          .h-cta-main:hover { transform: none; }
          .h-cta-main:hover svg { transform: none; }
          .h-cta-ghost { transition: none; }
        }
      `}</style>

      <section
        id="hero"
        aria-label="Hero Traders Rewards"
        style={{
          background:   "#000000",
          fontFamily:   "var(--font-sans), system-ui, -apple-system, sans-serif",
          width:        "100%",
          position:     "relative",
          overflow:     "hidden",
          boxSizing:    "border-box",
          marginBottom: isMobile ? 0 : 0,
        }}
      >

        {/* ══════════════════════════════════════════════════════
            WRAPPER FLEX — 2 colonnes desktop / 1 colonne mobile
        ══════════════════════════════════════════════════════ */}
        <div style={{
          display:       "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems:    isMobile ? "stretch" : "center",
          // Desktop : hauteur naturelle plafonnée à 720px pour éviter l'espace mort.
          minHeight:     isMobile ? 0 : "min(680px, calc(100svh - 174px))",
          paddingTop:    isMobile
            ? "calc(60px + var(--promo-banner-height, 0px))"
            : "calc(72px + var(--promo-banner-height, 0px))",
          paddingBottom: isMobile ? 0 : 0,
          maxWidth:      1380,
          margin:        "0 auto",
          paddingLeft:   isMobile ? 0 : "max(40px, 4vw)",
          paddingRight:  isMobile ? 0 : "max(24px, 3vw)",
          gap:           isMobile ? 0 : "clamp(40px, 5vw, 84px)",
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
            alignSelf:      isMobile ? undefined : "flex-start",
            paddingLeft:    isMobile ? 22 : 0,
            paddingRight:   isMobile ? 22 : 12,
            paddingTop:     isMobile ? 46 : 52,
            paddingBottom:  isMobile ? 40 : 26,
          }}>

            {/* ── Badge programme éducatif français ── */}
            <div style={{ marginBottom: isMobile ? 16 : 22, animation: "heroFadeUp 0.44s ease both" }}>
              <span style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          9,
                background:   "rgba(255,255,255,0.045)",
                border:       "1px solid rgba(255,255,255,0.10)",
                borderRadius: 100,
                padding:      isMobile ? "6px 16px" : "7px 20px",
              }}>
                <span className="h-pill-dot" style={{
                  display:      "inline-block",
                  width:        6,
                  height:       6,
                  borderRadius: "50%",
                  background:   ACCENT,
                  flexShrink:   0,
                }} />

                <span style={{
                  fontSize:      10,
                  fontWeight:    600,
                  color:         "rgba(255,255,255,0.72)",
                  letterSpacing: "0.3px",
                  textTransform: "none",
                  whiteSpace:    "nowrap",
                }}>
                  {pill}
                </span>
              </span>
            </div>

            {/* ── H1 — 2 lignes ── */}
            <h1 style={{
              fontWeight:    620,
              margin:        isMobile ? "0 0 34px" : "0 0 24px",
              textTransform: "none",
              textAlign:     "left",
              letterSpacing: isMobile ? "-1.5px" : "-3px",
              lineHeight:    0.98,
              animation:     "heroFadeUp 0.52s ease 0.05s both",
            }}>
              {/* Ligne 1 — blanc */}
              <span
                className="h1-line"
                style={{
                  fontSize: isMobile ? "clamp(2.6rem, 11vw, 4rem)" : "clamp(48px, 4.3vw, 68px)",
                  color: "#F7F8FA",
                }}
              >
                {h1L1}
              </span>
              {/* Ligne 2 — DEVENEZ blanc + TRADER REWARD. neon */}
              <span
                className="h1-line"
                style={{
                  marginTop: isMobile ? 4 : 7,
                  fontSize:  isMobile ? "clamp(2.6rem, 11vw, 4rem)" : "clamp(48px, 4.3vw, 68px)",
                }}
              >
                <span style={{ color: "#F7F8FA" }}>{h1L2pre}</span>
                <span style={{ color: "#EDD8D2" }}>{h1L2acc}</span>
              </span>
            </h1>

            {/* ── Bloc promo : -90% / 19€ ── */}
            <div style={{
              display:              "inline-flex",
              alignItems:           "stretch",
              alignSelf:            "flex-start",
              background:           "#1d2024",
              border:               "1px solid rgba(255,255,255,0.075)",
              borderRadius:         16,
              padding:              isMobile ? "14px 18px" : "5px 28px",
              marginBottom:         isMobile ? 22 : 20,
              animation:            "heroFadeUp 0.52s ease 0.10s both",
              boxShadow:            "0 16px 45px rgba(0,0,0,0.24)",
            } as React.CSSProperties}>

              {/* Colonne 1 Challenge — -80% */}
              <div>
                <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.52)", letterSpacing:"0.4px", textTransform:"none", marginBottom: isMobile ? 6 : 2 }}>
                  1 CHALLENGE
                </div>
                <div style={{ fontSize:promoFS, fontWeight:650, letterSpacing:"-2px", lineHeight:0.90, marginBottom: isMobile ? 7 : 3, color:"#F5F7F8" }}>
                  -80%
                </div>
                <div style={{ fontSize:9, fontWeight:550, color:"rgba(255,255,255,0.38)", letterSpacing:"0.5px", textTransform:"none" }}>
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

              {/* Colonne Pack ×3 — -90% · BEST DEAL */}
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#D6B46A", letterSpacing:"0.4px", textTransform:"none", marginBottom: isMobile ? 6 : 2, textShadow:"0 0 14px rgba(200,162,72,0.22)" }}>
                  PACK ×3 BEST DEAL
                </div>
                <div style={{ fontSize:promoFS, fontWeight:680, letterSpacing:"-2px", lineHeight:0.90, marginBottom: isMobile ? 7 : 3, color:"#EDD8D2" }}>
                  -90%
                </div>
                <div style={{ fontSize:9, fontWeight:550, color:"rgba(255,255,255,0.38)", letterSpacing:"0.5px", textTransform:"none" }}>
                  {L("PAIEMENT UNIQUE","PAGO ÚNICO","ONE-TIME")}
                </div>
              </div>
            </div>

            {/* ── CTA principal ── */}
            <div style={{
              display:   "flex",
              alignItems: isMobile ? "stretch" : "flex-start",
              animation: "heroFadeUp 0.52s ease 0.15s both",
            }}>
              <a
                href="#pricing"
                className="h-cta-main"
                style={{
                  fontSize:       isMobile ? 18 : 21,
                  fontWeight:     730,
                  height:         isMobile ? 66 : 72,
                  padding:        isMobile ? "0 32px" : "0 44px",
                  justifyContent: "center",
                  minWidth:       isMobile ? undefined : 410,
                  boxSizing:      "border-box" as const,
                }}
              >
                {ctaMain}
                <ArrowRight size={isMobile ? 20 : 22} strokeWidth={2.2} aria-hidden="true" />
              </a>
            </div>

          </div>{/* fin colonne gauche */}

          {/* ════════════════════════════════════════════════
              COLONNE DROITE — Parcours 6 250 $ · 100K
          ════════════════════════════════════════════════ */}
          <div style={{
            flex:           isMobile ? "none" : "1 1 0",
            display:        isMobile ? "none" : "flex",
            flexDirection:  "column",
            justifyContent: "center",
            padding:        "18px 0",
          }}>

            {/* ── Visuel droit — 3 jetons 100K / 25K / 50K ── */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/HERO FINAL.png"
              alt="Comptes Traders Rewards — 100K, 25K et 50K"
              style={{
                display:    "block",
                width:      isMobile ? "100%" : "170%",
                maxWidth:   isMobile ? 400 : "none",
                height:     "auto",
                objectFit:  "contain",
                margin:     "0 auto",
                marginLeft: isMobile ? "auto" : "-35%",
              }}
            />
          </div>{/* fin colonne droite */}

        </div>{/* fin wrapper flex */}
      </section>
    </>
  );
}
