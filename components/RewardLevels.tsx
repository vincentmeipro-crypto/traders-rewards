"use client";

// ════════════════════════════════════════════════════════════════
//  RewardLevels.tsx — Section "5 levels of Rewards" — redesign premium
//  Matrice 5 × 3 : 5 niveaux × 3 tailles (25K / 50K / 100K)
//  Tous les montants en doré champagne métallique.
//  Source des montants : lib/rewardsData.ts (frontend uniquement)
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { REWARD_AMOUNTS } from "@/lib/rewardsData";

// ── Sizes ─────────────────────────────────────────────────────
const SIZES = ["25K", "50K", "100K"] as const;

// ── Gradient doré champagne — identique Hero / CTA ────────────
const GOLD =
  "linear-gradient(110deg, #B88746 0%, #D6AD63 25%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)";

// ── Progression des bordures (R1 très discret → R5 bien visible)
const BORDER = [
  "rgba(216,180,104,0.12)",
  "rgba(216,180,104,0.20)",
  "rgba(216,180,104,0.30)",
  "rgba(216,180,104,0.48)",
  "rgba(216,180,104,0.72)",
];

// ── Box-shadow (très subtil, juste du noir profond + léger halo doré)
const SHADOW = [
  "0 2px 16px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.015)",
  "0 2px 16px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.018)",
  "0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.020)",
  "0 6px 24px rgba(0,0,0,0.58), 0 0 20px rgba(201,155,84,0.04), inset 0 1px 0 rgba(255,255,255,0.022)",
  "0 8px 32px rgba(0,0,0,0.64), 0 0 32px rgba(201,155,84,0.07), inset 0 1px 0 rgba(255,255,255,0.025)",
];

// ── Labels REWARD 1–5
const LABEL_COLOR = [
  "rgba(255,255,255,0.46)",
  "rgba(255,255,255,0.58)",
  "rgba(255,255,255,0.72)",
  "#E8C98A",
  "#D4A843",
];

// ── Tailles des montants (desktop / mobile)
// desktop : 33–38px selon le niveau
// mobile  : 22–27px
const AMT_D = [33, 34, 35, 36, 38];
const AMT_M = [22, 23, 24, 25, 27];

// ── Formatter ─────────────────────────────────────────────────
function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US");
}

// ── Montants (cast depuis as const)
const AMOUNTS = REWARD_AMOUNTS as readonly (readonly number[])[];

// ── Style montant doré (réutilisé partout)
function goldAmt(size: number): React.CSSProperties {
  return {
    fontSize:           size,
    fontWeight:         800,
    background:         GOLD,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip:     "text",
    letterSpacing:      "-0.5px",
    fontVariantNumeric: "tabular-nums",
    lineHeight:         1,
  };
}

// ────────────────────────────────────────────────────────────────

export default function RewardLevels() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) =>
    isFr ? fr : isEs ? es : en;

  // Étiquette traduite pour "REWARD"
  const R = L("RÉCOMPENSE", "RECOMPENSA", "REWARD");

  const LEVELS = [
    { num: "01", label: `${R} 1`, isTrader: false },
    { num: "02", label: `${R} 2`, isTrader: false },
    { num: "03", label: `${R} 3`, isTrader: false },
    { num: "04", label: `${R} 4`, isTrader: false },
    { num: "05", label: `${R} 5`, isTrader: true  },
  ];

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section
      id="rewards"
      aria-labelledby="rl-heading"
      style={{
        padding:         isMobile ? "56px 14px 72px" : "72px 24px 88px",
        backgroundColor: "#000000",
        position:        "relative",
        overflow:        "hidden",
      }}
    >
      {/* Halo ambiant très discret */}
      <div aria-hidden="true" style={{
        position:      "absolute",
        bottom:        "12%",
        left:          "50%",
        width:         "min(560px, 65vw)",
        height:        220,
        transform:     "translateX(-50%)",
        borderRadius:  "50%",
        background:    "radial-gradient(ellipse, rgba(184,135,70,0.055) 0%, transparent 70%)",
        filter:        "blur(44px)",
        pointerEvents: "none",
      }} />

      {/* Styles hover */}
      <style>{`
        .rl-card {
          transition: transform 0.20s ease, box-shadow 0.20s ease;
          will-change: transform;
        }
        .rl-card:hover { transform: translateY(-3px); }
        .rl-card-5:hover {
          box-shadow: 0 12px 48px rgba(201,155,84,0.13), 0 0 64px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.025) !important;
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 48 : 64 }}>

          {/* Eyebrow */}
          <div style={{
            fontSize:      10,
            fontWeight:    800,
            color:         "#D4A843",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom:  14,
          }}>
            {L("LES REWARDS", "LOS REWARDS", "THE REWARDS")}
          </div>

          {/* Titre principal */}
          <h2
            id="rl-heading"
            style={{
              fontSize:      isMobile ? "clamp(2.1rem, 7vw, 2.75rem)" : "clamp(2.4rem, 3.5vw, 3.5rem)",
              fontWeight:    900,
              textTransform: "uppercase",
              color:         "#FFFFFF",
              letterSpacing: "0.5px",
              lineHeight:    1.05,
              margin:        "0 0 18px",
            }}
          >
            {L("5 niveaux de", "5 niveles de", "5 levels of")}{" "}
            {/* mot clé → doré champagne */}
            <span style={{
              background:           GOLD,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              backgroundClip:       "text",
            }}>
              {L("Récompenses", "Recompensas", "Rewards")}
            </span>
          </h2>

          {/* Sous-titre */}
          <p style={{
            maxWidth:   isMobile ? 480 : "none",
            whiteSpace: isMobile ? "normal" : "nowrap",
            margin:     "0 auto",
            color:      "rgba(255,255,255,0.46)",
            fontSize:   isMobile ? 14 : 17,
            lineHeight: 1.7,
          }}>
            {L(
              "Chaque Reward débloqué augmente les montants maximums.",
              "Cada Reward desbloqueado aumenta los montos máximos.",
              "Each unlocked Reward increases maximum amounts.",
            )}
          </p>
        </div>

        {/* ── EN-TÊTES COLONNES — desktop uniquement ─────────── */}
        {!isMobile && (
          <div style={{
            display:             "grid",
            gridTemplateColumns: "220px repeat(3, 1fr)",
            gap:                 16,
            marginBottom:        10,
            padding:             "0 28px",
          }}>
            <div />
            {SIZES.map((s) => (
              <div key={s} style={{
                textAlign:     "center",
                fontSize:      10,
                fontWeight:    800,
                color:         "rgba(255,255,255,0.32)",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
              }}>
                {s}
              </div>
            ))}
          </div>
        )}

        {/* ── LES 5 CARTES ──────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 10 : 8 }}>

          {LEVELS.map((level, li) => {
            const isTrader = level.isTrader;

            /* Barre verticale de séparation num/label */
            const barBg = isTrader
              ? GOLD
              : `rgba(216,180,104,${0.14 + li * 0.07})`;

            /* ── CARTE MOBILE ── */
            if (isMobile) {
              return (
                <div
                  key={li}
                  className={`rl-card${isTrader ? " rl-card-5" : ""}`}
                  style={{
                    position:     "relative",
                    borderRadius: isTrader ? 16 : 12,
                    border:       `1px solid ${BORDER[li]}`,
                    background:   "linear-gradient(180deg, #050505 0%, #090909 100%)",
                    boxShadow:    SHADOW[li],
                    padding:      isTrader ? "24px 16px 20px" : "18px 14px",
                  }}
                >
                  {/* Badge MAX REWARD */}
                  {isTrader && (
                    <div style={{
                      position:    "absolute",
                      top:         -13,
                      left:        "50%",
                      transform:   "translateX(-50%)",
                      background:  "#050505",
                      border:      `1px solid ${BORDER[li]}`,
                      borderRadius: 999,
                      padding:     "4px 14px",
                      fontSize:    9,
                      fontWeight:  800,
                      color:       "#D4A843",
                      letterSpacing: "1.5px",
                      whiteSpace:  "nowrap",
                    }}>
                      MAX REWARD
                    </div>
                  )}

                  {/* Ligne header : numéro + barre + label */}
                  <div style={{
                    display:       "flex",
                    alignItems:    "center",
                    gap:           12,
                    marginBottom:  16,
                  }}>
                    {/* Numéro */}
                    <span style={{
                      fontSize:             isTrader ? 30 : 26,
                      fontWeight:           900,
                      letterSpacing:        "-2px",
                      lineHeight:           1,
                      background:           GOLD,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor:  "transparent",
                      backgroundClip:       "text",
                      flexShrink:           0,
                    }}>
                      {level.num}
                    </span>

                    {/* Barre */}
                    <div style={{
                      width:        1,
                      height:       isTrader ? 34 : 26,
                      background:   barBg,
                      flexShrink:   0,
                    }} />

                    {/* Label */}
                    <span style={{
                      fontSize:      isTrader ? 12 : 11,
                      fontWeight:    800,
                      color:         LABEL_COLOR[li],
                      letterSpacing: "1.2px",
                      textTransform: "uppercase",
                    }}>
                      {level.label}
                    </span>
                  </div>

                  {/* Grille 3 montants */}
                  <div style={{
                    display:             "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap:                 6,
                  }}>
                    {SIZES.map((sz, si) => (
                      <div key={sz} style={{ textAlign: "center" }}>
                        {/* Label taille */}
                        <div style={{
                          fontSize:      9,
                          fontWeight:    700,
                          color:         "rgba(255,255,255,0.30)",
                          letterSpacing: "2px",
                          textTransform: "uppercase",
                          marginBottom:  6,
                        }}>
                          {sz}
                        </div>
                        {/* Montant doré */}
                        <div style={goldAmt(AMT_M[li])}>
                          {fmtUSD(AMOUNTS[si][li])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            /* ── CARTE DESKTOP ── */
            return (
              <div
                key={li}
                className={`rl-card${isTrader ? " rl-card-5" : ""}`}
                style={{
                  position:            "relative",
                  display:             "grid",
                  gridTemplateColumns: "220px repeat(3, 1fr)",
                  gap:                 16,
                  alignItems:          "center",
                  borderRadius:        isTrader ? 18 : 13,
                  border:              `1px solid ${BORDER[li]}`,
                  background:          "linear-gradient(180deg, #050505 0%, #090909 100%)",
                  boxShadow:           SHADOW[li],
                  padding:             isTrader ? "30px 28px" : "22px 28px",
                }}
              >
                {/* Badge MAX REWARD */}
                {isTrader && (
                  <div style={{
                    position:    "absolute",
                    top:         -14,
                    left:        "50%",
                    transform:   "translateX(-50%)",
                    background:  "#050505",
                    border:      `1px solid ${BORDER[li]}`,
                    borderRadius: 999,
                    padding:     "5px 18px",
                    fontSize:    9,
                    fontWeight:  800,
                    color:       "#D4A843",
                    letterSpacing: "2px",
                    whiteSpace:  "nowrap",
                  }}>
                    MAX REWARD
                  </div>
                )}

                {/* Gauche : numéro + barre + label */}
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  {/* Numéro */}
                  <div style={{
                    fontSize:             isTrader ? 50 : 44,
                    fontWeight:           900,
                    letterSpacing:        "-3px",
                    lineHeight:           1,
                    background:           GOLD,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor:  "transparent",
                    backgroundClip:       "text",
                    minWidth:             60,
                    textAlign:            "right",
                    flexShrink:           0,
                  }}>
                    {level.num}
                  </div>

                  {/* Barre */}
                  <div style={{
                    width:        1,
                    height:       isTrader ? 50 : 38,
                    background:   barBg,
                    flexShrink:   0,
                  }} />

                  {/* Label */}
                  <div style={{
                    fontSize:      isTrader ? 13 : 12,
                    fontWeight:    800,
                    color:         LABEL_COLOR[li],
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}>
                    {level.label}
                  </div>
                </div>

                {/* 3 colonnes montants */}
                {SIZES.map((_sz, si) => (
                  <div key={si} style={{ textAlign: "center" }}>
                    <div style={goldAmt(AMT_D[li])}>
                      {fmtUSD(AMOUNTS[si][li])}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
