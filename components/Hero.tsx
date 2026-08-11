"use client";

// ════════════════════════════════════════════════════════════════
//  Hero.tsx — HERO FINAL PRODUCTION
//  Trophée à droite, titre dominant à gauche, fond noir.
//  Image : /NOUVELLE IMAGE HERO AVEC TROPHE.png
//  Bleu de marque : #69C5FD
//  Réducteur de titre v3 : clamp(4.5rem, 8vw, 11rem)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

export default function Hero() {
  const { lang }   = useLanguage();
  const isFr       = lang === "fr";
  const isEs       = lang === "es";
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

  // ── Textes multilingues ─────────────────────────────────────────
  const pillText = isFr
    ? "Programme éducatif · Traders Français"
    : isEs
      ? "Programa educativo · Traders recompensados"
      : "Educational program · Rewarded traders";

  const line1 = isFr
    ? <><span>Transformez votre trading </span><span style={{ color: "#69C5FD" }}>démo</span></>
    : isEs
      ? <><span>Transforma tu trading </span><span style={{ color: "#69C5FD" }}>demo</span></>
      : <><span>Turn your trading </span><span style={{ color: "#69C5FD" }}>skills</span></>;

  // Ligne 2 dominante — 2 mots pour le saut de ligne desktop
  const [line2a, line2b] = isFr
    ? ["en vraies",         "récompenses"]
    : isEs
      ? ["en verdaderas",   "recompensas"]
      : ["into real",       "rewards"];

  const subtitle = isFr
    ? "Trading Simulé · Programme éducatif récompensé"
    : isEs
      ? "Trading Simulado · Programa educativo recompensado"
      : "Simulated Trading · Rewarded educational program";

  return (
    <>
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; }
        }
      `}</style>

      {/* ── Section principale ── */}
      <section
        aria-label="Hero"
        style={{
          background:  "#000000",
          width:       "100%",
          minHeight:   "100vh",
          position:    "relative",
          overflow:    "hidden",
          display:     "flex",
          alignItems:  "stretch",
          paddingTop:  isMobile
            ? "calc(60px + var(--promo-banner-height, 0px))"
            : "calc(72px + var(--promo-banner-height, 0px))",
          boxSizing:   "border-box",
        }}
      >
        {/* Halo bleu de marque — derrière le trophée */}
        {!isMobile && (
          <div
            aria-hidden="true"
            style={{
              position:      "absolute",
              inset:         0,
              background:    "radial-gradient(ellipse 40% 65% at 80% 54%, rgba(105,197,253,0.11) 0%, transparent 70%)",
              pointerEvents: "none",
              zIndex:        0,
            }}
          />
        )}

        {/* ── Grille 2 colonnes ── */}
        <div
          style={{
            position:            "relative",
            zIndex:              1,
            width:               "100%",
            display:             "grid",
            gridTemplateColumns: isMobile ? "1fr" : "64fr 36fr",
            alignItems:          "center",
            minHeight:           isMobile ? "auto" : "calc(100vh - 72px)",
          }}
        >
          {/* ╔═══════════════════════════════════════════════╗
              ║  COLONNE GAUCHE — titre dominant + texte     ║
              ╚═══════════════════════════════════════════════╝ */}
          <div
            style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "flex-start",
              justifyContent: "center",
              paddingLeft:    isMobile ? 24 : "max(52px, 6vw)",
              paddingRight:   isMobile ? 24 : 24,
              paddingTop:     isMobile ? 32 : 0,
              paddingBottom:  isMobile ? 0 : 72,
            }}
          >
            {/* Pill */}
            <div
              style={{
                marginBottom: isMobile ? 20 : 30,
                animation:    "heroFadeUp 0.55s ease both",
              }}
            >
              <span
                style={{
                  display:      "inline-flex",
                  alignItems:   "center",
                  gap:          9,
                  border:       "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 100,
                  padding:      isMobile ? "6px 18px" : "8px 26px",
                }}
              >
                <span
                  style={{
                    fontSize:      isMobile ? 11 : 13,
                    fontWeight:    600,
                    color:         "rgba(255,255,255,0.72)",
                    letterSpacing: "0.3px",
                    whiteSpace:    "nowrap",
                  }}
                >
                  {pillText}
                </span>
                {/* Drapeau français uniquement en mode FR */}
                {isFr && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 30 20"
                    aria-hidden="true"
                    style={{ display: "block", width: 20, height: 14, borderRadius: 2, flexShrink: 0 }}
                  >
                    <rect width="10" height="20" fill="#002395" />
                    <rect x="10"  width="10" height="20" fill="#fff" />
                    <rect x="20"  width="10" height="20" fill="#ED2939" />
                  </svg>
                )}
              </span>
            </div>

            {/* ── H1 — titre fortement agrandi ── */}
            <h1
              style={{
                fontWeight: 900,
                color:      "#FFFFFF",
                lineHeight: 1.0,
                margin:     "0 0 28px",
                textAlign:  "left",
                animation:  "heroFadeUp 0.65s ease 0.07s both",
              }}
            >
              {/* Ligne 1 — introduction, poids 700 */}
              <span
                style={{
                  display:       "block",
                  fontSize:      isMobile
                    ? "clamp(1.7rem, 6.5vw, 2.4rem)"
                    : "clamp(2rem, 3.6vw, 4.8rem)",
                  fontWeight:    700,
                  letterSpacing: isMobile ? "-0.4px" : "-1.5px",
                  color:         "#FFFFFF",
                  marginBottom:  isMobile ? 8 : 18,
                  lineHeight:    1.1,
                }}
              >
                {line1}
              </span>

              {/* Ligne 2 — DOMINANTE
                  ─ Desktop : 2 lignes explicites (line2a / line2b)
                  ─ Mobile  : texte continu, taille réduite               */}
              <span
                style={{
                  display:       "block",
                  fontSize:      isMobile
                    ? "clamp(2.6rem, 10.5vw, 3.8rem)"
                    : "clamp(4.5rem, 8vw, 11rem)",   /* légèrement réduit vs hero-test */
                  fontWeight:    900,
                  letterSpacing: isMobile ? "-2px" : "-5px",
                  textTransform: "uppercase",
                  lineHeight:    0.9,
                  color:         "#FFFFFF",
                }}
              >
                {isMobile
                  ? `${line2a} ${line2b}`
                  : <>{line2a}<br />{line2b}</>
                }
              </span>
            </h1>

            {/* Sous-titre */}
            <p
              style={{
                margin:        0,
                fontSize:      isMobile ? 10 : 11,
                fontWeight:    600,
                color:         "rgba(255,255,255,0.42)",
                letterSpacing: "0.75px",
                textTransform: "uppercase",
                animation:     "heroFadeUp 0.65s ease 0.18s both",
              }}
            >
              {subtitle}
            </p>
          </div>

          {/* ╔═══════════════════════════════════════════════╗
              ║  COLONNE DROITE — trophée                    ║
              ║  height min(72vh, 640px) ≈ 68 % de l'ancien ║
              ║  mix-blend-mode: lighten → fond noir transparent ║
              ╚═══════════════════════════════════════════════╝ */}
          <div
            style={{
              position:       "relative",
              alignSelf:      isMobile ? "auto" : "stretch",
              display:        "flex",
              alignItems:     "center",
              justifyContent: isMobile ? "center" : "flex-end",
              overflow:       "visible",
              minHeight:      isMobile ? 260 : "auto",
            }}
          >
            <img
              src="/NOUVELLE IMAGE HERO AVEC TROPHE.png"
              alt="Trophée Traders Rewards"
              style={{
                display: "block",
                ...(isMobile
                  ? {
                      width:  "88%",
                      height: "auto",
                    }
                  : {
                      position:  "absolute",
                      top:       "50%",
                      right:     "0",
                      transform: "translateY(-50%)",
                      height:    "min(72vh, 640px)",
                      width:     "auto",
                      maxWidth:  "none",
                    }),
                objectFit:      "contain",
                objectPosition: "center center",
                /* Pixels noirs de l'image → transparents sur fond #000 */
                mixBlendMode:   "lighten",
                /* Fondu bord gauche du trophée vers la colonne texte */
                maskImage: isMobile
                  ? "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)"
                  : "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 12%, black 28%)",
                WebkitMaskImage: isMobile
                  ? "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)"
                  : "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.5) 12%, black 28%)",
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
