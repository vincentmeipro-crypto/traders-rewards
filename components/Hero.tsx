"use client";

// ════════════════════════════════════════════════════════════════
//  Hero.tsx — Traders Rewards Premium · v2 Refonte
//  Layout  : 2 colonnes — Gauche (texte/CTAs) · Droite (parcours 6250$)
//  Couleur : Noir / Blanc / Chrome · Neon #69C5FD
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const ACCENT = "#D4A843"; // badge dot (gauche) — doré champagne

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
  const h1L1    = "1 CHALLENGE";
  const h1L2pre = "";
  const h1L2acc = L("5 RÉCOMPENSES", "5 RECOMPENSAS", "5 REWARDS");
  const ctaMain = L("Choisir mon Challenge","Elegir mi Challenge",   "Choose my Challenge");

  const promoFS = isMobile
    ? "clamp(2.4rem, 10vw, 3.6rem)"
    : "clamp(2.8rem, 4vw, 5rem)";

  // ── Colonnes internes du cadre promo (shared mobile/desktop) ──
  const promoColumns = (
    <>
      <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", position:"relative" }}>
        <div style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.52)", letterSpacing:"0.4px", textTransform:"none", marginBottom: isMobile ? 6 : 2 }}>
          1 CHALLENGE
        </div>
        <div style={{ fontSize:promoFS, fontWeight:650, letterSpacing:"-2px", lineHeight:0.90, marginBottom:0, color:"#F5F7F8" }}>
          -80%
        </div>
        <div style={{ fontSize:9, fontWeight:550, color:"transparent", letterSpacing:"0.5px", textTransform:"none", userSelect:"none", pointerEvents:"none", position:"absolute" }}>
          PAIEMENT UNIQUE
        </div>
      </div>
      <div style={{ width:1, alignSelf:"stretch", background:"linear-gradient(to bottom, transparent, rgba(255,255,255,0.22) 20%, rgba(255,255,255,0.22) 80%, transparent)", margin: isMobile ? "0 16px" : "0 24px", flexShrink:0 }} />
      <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", position:"relative" }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#D6B46A", letterSpacing:"0.4px", textTransform:"none", marginBottom: isMobile ? 6 : 2, textShadow:"0 0 14px rgba(200,162,72,0.22)" }}>
          PACK ×3 BEST DEAL
        </div>
        <div style={{ fontSize:promoFS, fontWeight:680, letterSpacing:"-2px", lineHeight:0.90, marginBottom:0,
          background:"linear-gradient(110deg, #B88746 0%, #D6AD63 25%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
          -90%
        </div>
        <div style={{ fontSize:9, fontWeight:550, color:"transparent", letterSpacing:"0.5px", textTransform:"none", userSelect:"none", pointerEvents:"none", position:"absolute" }}>
          PAIEMENT UNIQUE
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        /* ── Entrée fade-up ── */
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroDotTwinkle {
          0%, 100% { opacity: 0.48; box-shadow: 0 0 0 rgba(184,135,70,0); transform: scale(0.82); }
          50% { opacity: 1; box-shadow: 0 0 8px rgba(184,135,70,0.80), 0 0 14px rgba(184,135,70,0.35); transform: scale(1.12); }
        }
        .h-pill-dot { animation: heroDotTwinkle 1.8s ease-in-out infinite; }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CTA PRINCIPAL — or métallique sombre premium (Variante 03)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

        /* Reflet ponctuel — traverse de gauche à droite, longue pause */
        @keyframes heroCtaShimmer {
          0%          { transform: translateX(-280%); }
          30%         { transform: translateX(380%); }
          30.01%, 100%{ transform: translateX(-280%); }
        }
        /* Lumière qui circule lentement dans le métal — background-position */
        @keyframes heroCtaGoldFlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .h-cta-main {
          display: inline-flex; align-items: center; gap: 18px;
          position: relative; overflow: hidden;
          background: linear-gradient(
            110deg,
            #6B4A1A 0%,
            #B88746 14%,
            #D6AD63 28%,
            #F2D79A 43%,
            #FFF0AA 52%,
            #E8C864 61%,
            #C4943E 74%,
            #8A6220 88%,
            #6B4A1A 100%
          );
          background-size: 220% 100%;
          color: #111111;
          font-weight: 730; letter-spacing: 0.05px; text-transform: none;
          text-decoration: none; border-radius: 16px; cursor: pointer;
          font-family: inherit; white-space: nowrap;
          border: 1px solid rgba(232,190,100,0.50);
          box-shadow: 0 10px 35px rgba(184,135,70,0.22), 0 3px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.38);
          transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
          animation: heroCtaGoldFlow 7s ease-in-out infinite;
        }
        /* Reflet shimmer ponctuel — lumière qui traverse le métal */
        .h-cta-main::before {
          content: "";
          position: absolute;
          top: -20%; bottom: -20%;
          left: 0; width: 65%;
          background: linear-gradient(
            105deg,
            transparent 5%,
            rgba(255,255,255,0.08) 30%,
            rgba(255,255,255,0.28) 50%,
            rgba(255,255,255,0.08) 70%,
            transparent 95%
          );
          transform: translateX(-280%);
          animation: heroCtaShimmer 6s ease-in-out 2.5s infinite;
          pointer-events: none;
        }
        .h-cta-main svg {
          position: relative; z-index: 1;
          transition: transform 0.25s ease; flex-shrink: 0;
        }
        .h-cta-main:hover svg { transform: translateX(3px); }
        .h-cta-main:hover {
          transform: translateY(-1px);
          filter: brightness(1.14);
          box-shadow: 0 14px 42px rgba(184,135,70,0.34), 0 4px 14px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.48);
        }
        .h-cta-main:active  { transform: translateY(0) scale(0.98); filter: brightness(1); }
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
          background: rgba(184,135,70,0.16);
          z-index: 0;
          pointer-events: none;
        }

        /* Cercles numérotés */
        .h-prog-circle {
          position: relative; z-index: 2;
          width: 42px; height: 42px; flex-shrink: 0;
          border-radius: 50%;
          border: 1px solid rgba(184,135,70,0.24);
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
          box-shadow: inset 0 0 0 1px rgba(184,135,70,0.055);
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
          .h-cta-main { animation: none; transition: none; background-position: 0% 50%; }
          .h-cta-main::before { animation: none; opacity: 0; }
          .h-cta-main:hover { transform: none; filter: none; }
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

        {/* ════════════════════════════════════════════════════════
            BADGE — position:absolute → hors flow, image inchangée
        ════════════════════════════════════════════════════════ */}
        <div style={{
          position:       "absolute",
          top:            isMobile
            ? "calc(60px + var(--promo-banner-height, 0px) + 20px)"
            : "calc(72px + var(--promo-banner-height, 0px) + 24px)",
          left:           0,
          right:          0,
          display:        "flex",
          justifyContent: "center",
          zIndex:         10,
          animation:      "heroFadeUp 0.44s ease both",
        }}>
          <span style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          9,
            background:   "rgba(255,255,255,0.025)",
            border:       "1px solid rgba(255,255,255,0.14)",
            borderRadius: 100,
            padding:      isMobile ? "10px 22px" : "11px 24px",
          }}>
            <span className="h-pill-dot" style={{
              display:      "inline-block",
              width:        7,
              height:       7,
              borderRadius: "50%",
              background:   ACCENT,
              flexShrink:   0,
            }} />
            <span style={{
              fontSize:      isMobile ? 13 : 14,
              fontWeight:    600,
              color:         "#FFFFFF",
              letterSpacing: "0.15px",
              textTransform: "none",
              whiteSpace:    "nowrap",
            }}>
              {pill}
            </span>
          </span>
        </div>

        {/* ══════════════════════════════════════════════════════
            WRAPPER FLEX — 2 colonnes desktop / 1 colonne mobile
        ══════════════════════════════════════════════════════ */}
        <div style={{
          display:       "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems:    isMobile ? "stretch" : "center",
          // Desktop : hauteur naturelle plafonnée à 720px pour éviter l'espace mort.
          minHeight:     isMobile ? 0 : "min(620px, calc(100svh - 234px))",
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
            alignItems:     isMobile ? "center" : undefined,
            alignSelf:      isMobile ? undefined : "flex-start",
            paddingLeft:    isMobile ? 22 : 0,
            paddingRight:   isMobile ? 22 : 12,
            paddingTop:     isMobile ? 66 : 80,
            paddingBottom:  isMobile ? 8 : 26,
          }}>

            {/* ── H1 — 2 lignes ── */}
            <h1 style={{
              fontWeight:    620,
              margin:        isMobile ? "0 0 16px" : "0 0 24px",
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
                  fontSize:   isMobile ? "clamp(2.0rem, 9vw, 4rem)" : "clamp(48px, 4.3vw, 68px)",
                  color:      "#F7F8FA",
                  whiteSpace: "nowrap",
                }}
              >
                {h1L1}
              </span>
              {/* Ligne 2 — DEVENEZ blanc + TRADER REWARD. neon */}
              <span
                className="h1-line"
                style={{
                  marginTop:  isMobile ? 4 : 7,
                  fontSize:   isMobile ? "clamp(2.0rem, 9vw, 4rem)" : "clamp(48px, 4.3vw, 68px)",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "#F7F8FA" }}>{h1L2pre}</span>
                <span style={{
                  background: "linear-gradient(110deg, #B88746 0%, #D6AD63 25%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>{h1L2acc}</span>
              </span>
            </h1>

            {/* ── Jetons — mobile uniquement, pleine largeur ── */}
            {isMobile && (
              <div style={{
                display:      "flex",
                justifyContent: "center",
                marginLeft:   -22,
                marginRight:  -22,
                marginBottom: 0,
                overflow:     "hidden",
                lineHeight:   0,
                alignSelf:    "stretch",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/jetons-hero-premium.jpg"
                  alt="Comptes Traders Rewards — 100K, 25K et 50K"
                  style={{
                    display:         "block",
                    width:           "125vw",
                    maxWidth:        "none",
                    flexShrink:      0,
                    // Remove the JPEG's empty vertical margins, keeping the coins intact.
                    marginTop:       "-12vw",
                    marginBottom:    "-14vw",
                    height:          "auto",
                    objectFit:       "contain",
                    backgroundColor: "#000000",
                  }}
                />
              </div>
            )}

            {/* ── Mobile : promo + CTA dans un wrapper commun (largeur partagée) ── */}
            {isMobile && (
              <div style={{
                display: "flex", flexDirection: "column",
                alignSelf: "center", gap: 16,
                width: "fit-content",
                animation: "heroFadeUp 0.52s ease 0.10s both",
              }}>
                <div style={{
                  display: "flex", alignItems: "stretch",
                  background: "#1d2024",
                  border: "1px solid rgba(255,255,255,0.075)",
                  borderRadius: 16, padding: "14px 18px",
                  boxShadow: "0 16px 45px rgba(0,0,0,0.24)",
                } as React.CSSProperties}>
                  {promoColumns}
                </div>
                <a
                  href="#pricing"
                  className="h-cta-main"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    fontSize: 18, fontWeight: 730,
                    height: 66, padding: "0 32px",
                    justifyContent: "center",
                  }}
                >
                  {ctaMain}
                  <ArrowRight size={20} strokeWidth={2.2} aria-hidden="true" />
                </a>
              </div>
            )}

            {/* ── Desktop : promo + CTA inchangés ── */}
            {!isMobile && (
              <>
                <div style={{
                  display: "inline-flex", alignItems: "stretch",
                  alignSelf: "flex-start",
                  background: "#1d2024",
                  border: "1px solid rgba(255,255,255,0.075)",
                  borderRadius: 16, padding: "5px 28px",
                  marginBottom: 20,
                  animation: "heroFadeUp 0.52s ease 0.10s both",
                  boxShadow: "0 16px 45px rgba(0,0,0,0.24)",
                } as React.CSSProperties}>
                  {promoColumns}
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start", justifyContent: "flex-start",
                  animation: "heroFadeUp 0.52s ease 0.15s both",
                }}>
                  <a
                    href="#pricing"
                    className="h-cta-main"
                    style={{
                      fontSize: 21, fontWeight: 730,
                      height: 72, padding: "0 44px",
                      justifyContent: "center",
                      minWidth: 410, boxSizing: "border-box" as const,
                    }}
                  >
                    {ctaMain}
                    <ArrowRight size={22} strokeWidth={2.2} aria-hidden="true" />
                  </a>
                </div>
              </>
            )}

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

            {/* ── Visuel droit — Personnages + jetons 25K / 50K / 100K ── */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/NOUVEAU%20HERO%20AVEC%20DES%20PERSONNAGES.png"
              alt="Comptes Traders Rewards — 3 personnages avec jetons 25K, 50K et 100K"
              style={{
                display:        "block",
                width:          "175%",
                maxWidth:       "none",
                height:         "auto",
                objectFit:      "contain",
                objectPosition: "center",
                margin:         "0 auto",
                marginLeft:     "-38%",
                marginTop:      -70,
              }}
            />
          </div>{/* fin colonne droite */}

        </div>{/* fin wrapper flex */}
      </section>
    </>
  );
}
