"use client";

// ════════════════════════════════════════════════════════════════
//  RewardLevels.tsx — Showcase premium des 5 Récompenses
//  Matrice : 5 niveaux × 3 tailles de compte (25K / 50K / 100K)
//  Source des montants : lib/rewardsData.ts (frontend uniquement)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { REWARD_AMOUNTS } from "@/lib/rewardsData";

// ── Data ──────────────────────────────────────────────────────

const SIZES = ["25K", "50K", "100K"] as const;

const LEVELS = [
  { num: "01", label: "RÉCOMPENSE 1", isTrader: false },
  { num: "02", label: "RÉCOMPENSE 2", isTrader: false },
  { num: "03", label: "RÉCOMPENSE 3", isTrader: false },
  { num: "04", label: "RÉCOMPENSE 4", isTrader: false },
  { num: "05", label: "RÉCOMPENSE 5", isTrader: true  },
];

// ── Progression visuelle (intensité croissante) ───────────────

const BORDER_COLOR = [
  "rgba(255,255,255,0.07)",
  "rgba(255,255,255,0.09)",
  "rgba(255,255,255,0.12)",
  "rgba(183,110,121,0.26)",
  "rgba(183,110,121,0.52)",
];

const BOX_SHADOW = [
  "0 4px 14px rgba(0,0,0,0.30)",
  "0 4px 16px rgba(0,0,0,0.32)",
  "0 4px 18px rgba(0,0,0,0.34)",
  "0 6px 22px rgba(183,110,121,0.07), 0 4px 18px rgba(0,0,0,0.36)",
  "0 8px 32px rgba(183,110,121,0.14), 0 20px 48px rgba(0,0,0,0.52)",
];

const NUM_COLOR = [
  "rgba(255,255,255,0.09)",
  "rgba(255,255,255,0.11)",
  "rgba(255,255,255,0.14)",
  "rgba(183,110,121,0.32)",
  "rgba(216,163,157,0.65)",
];

const LABEL_COLOR = [
  "rgba(255,255,255,0.50)",
  "rgba(255,255,255,0.60)",
  "rgba(255,255,255,0.72)",
  "#F1D0C8",
  "#D8A39D",
];

const AMT_COLOR = [
  "rgba(255,255,255,0.76)",
  "rgba(255,255,255,0.84)",
  "#FFFFFF",
  "#F1D0C8",
  "#D8A39D",
];

// ── Formatter ─────────────────────────────────────────────────

function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US");
}

// ── Accès montants (cast depuis le tuple as const) ────────────
const AMOUNTS = REWARD_AMOUNTS as readonly (readonly number[])[];

// ── Composant ────────────────────────────────────────────────

export default function RewardLevels() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) =>
    isFr ? fr : isEs ? es : en;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section
      aria-labelledby="reward-levels-heading"
      style={{
        padding:         isMobile ? "48px 16px" : "64px 24px",
        backgroundColor: "#000000",
        position:        "relative",
        overflow:        "hidden",
      }}
    >
      {/* Halo background */}
      <div
        aria-hidden="true"
        style={{
          position:      "absolute",
          bottom:        "20%",
          left:          "50%",
          width:         "min(700px, 80vw)",
          height:        300,
          transform:     "translateX(-50%)",
          borderRadius:  "50%",
          background:    "radial-gradient(ellipse, rgba(183,110,121,0.06), transparent 68%)",
          filter:        "blur(28px)",
          pointerEvents: "none",
        }}
      />

      {/* Hover animation */}
      <style>{`
        .rw-card {
          transition: transform 0.22s ease, box-shadow 0.22s ease;
          will-change: transform;
        }
        .rw-card:hover { transform: translateY(-2px); }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── Header ───────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 40 : 56 }}>
          <div style={{
            fontSize:      11,
            fontWeight:    800,
            color:         "#D8A39D",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom:  12,
          }}>
            {L("LES REWARDS", "LOS REWARDS", "THE REWARDS")}
          </div>
          <h2
            id="reward-levels-heading"
            style={{
              fontSize:      isMobile ? "clamp(2.1rem, 7vw, 2.75rem)" : "clamp(2.4rem, 3.5vw, 3.5rem)",
              fontWeight:    900,
              textTransform: "uppercase",
              color:         "#FFFFFF",
              letterSpacing: "0.5px",
              lineHeight:    1.05,
              margin:        "0 0 16px",
            }}
          >
            {L("5 niveaux de", "5 niveles de", "5 levels of")}{" "}
            <span style={{ color: "#FFFFFF" }}>
              {L("Rewards", "Rewards", "Rewards")}
            </span>
          </h2>
          <p style={{
            maxWidth:   isMobile ? 480 : "none",
            whiteSpace: isMobile ? "normal" : "nowrap",
            margin:     "0 auto",
            color:      "rgba(255,255,255,0.42)",
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

        {/* ── En-têtes colonnes — desktop uniquement ────────── */}
        {!isMobile && (
          <div style={{
            display:             "grid",
            gridTemplateColumns: "240px repeat(3, 1fr)",
            gap:                 12,
            marginBottom:        8,
            padding:             "0 20px",
          }}>
            <div />
            {SIZES.map((size) => (
              <div key={size} style={{
                textAlign:     "center",
                fontSize:      11,
                fontWeight:    800,
                color:         "rgba(255,255,255,0.35)",
                letterSpacing: "2px",
                textTransform: "uppercase",
              }}>
                {size}
              </div>
            ))}
          </div>
        )}

        {/* ── 5 paliers ─────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 10 : 7 }}>
          {LEVELS.map((level, li) => {
            const isTrader = level.isTrader;
            const barBg    = isTrader
              ? "linear-gradient(to bottom, #D8A39D, #B76E79)"
              : `rgba(183,110,121,${0.15 + li * 0.05})`;

            /* ── Mobile card ── */
            if (isMobile) {
              return (
                <div
                  key={li}
                  className="rw-card"
                  style={{
                    borderRadius: 14,
                    border:       `1px solid ${BORDER_COLOR[li]}`,
                    background:   "rgba(255,255,255,0.028)",
                    boxShadow:    BOX_SHADOW[li],
                    padding:      "18px 20px",
                  }}
                >
                  {/* Header ligne */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <span style={{
                      fontSize:      30,
                      fontWeight:    900,
                      color:         NUM_COLOR[li],
                      letterSpacing: "-1.5px",
                      lineHeight:    1,
                    }}>
                      {level.num}
                    </span>
                    <div style={{
                      width: 2, height: 30, flexShrink: 0,
                      background: barBg, borderRadius: 2,
                    }} />
                    <span style={{
                      fontSize:      13,
                      fontWeight:    800,
                      color:         LABEL_COLOR[li],
                      letterSpacing: "0.8px",
                      textTransform: "uppercase",
                    }}>
                      {level.label}
                    </span>
                  </div>
                  {/* Montants */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {SIZES.map((size, si) => (
                      <div key={size} style={{ textAlign: "center" }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700,
                          color: "rgba(255,255,255,0.32)",
                          letterSpacing: "1.5px", marginBottom: 5,
                        }}>
                          {size}
                        </div>
                        <div style={{
                          fontSize:           21,
                          fontWeight:         800,
                          color:              AMT_COLOR[li],
                          letterSpacing:      "-0.3px",
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {fmtUSD(AMOUNTS[si][li])}
                        </div>
                        {isTrader && (
                          <div style={{
                            fontSize: 8, fontWeight: 700,
                            color: "rgba(183,110,121,0.55)",
                            letterSpacing: "1px", textTransform: "uppercase", marginTop: 3,
                          }}>
                            MAX
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            /* ── Desktop card ── */
            return (
              <div
                key={li}
                className="rw-card"
                style={{
                  display:             "grid",
                  gridTemplateColumns: "240px repeat(3, 1fr)",
                  gap:                 12,
                  alignItems:          "center",
                  borderRadius:        isTrader ? 16 : 13,
                  border:              `1px solid ${BORDER_COLOR[li]}`,
                  background:          "rgba(255,255,255,0.028)",
                  boxShadow:           BOX_SHADOW[li],
                  padding:             isTrader ? "22px 20px" : "18px 20px",
                }}
              >
                {/* Gauche : numéro + nom */}
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    fontSize:      44,
                    fontWeight:    900,
                    color:         NUM_COLOR[li],
                    letterSpacing: "-2.5px",
                    lineHeight:    1,
                    minWidth:      58,
                    textAlign:     "right",
                    flexShrink:    0,
                  }}>
                    {level.num}
                  </div>
                  <div style={{
                    width:        2,
                    height:       isTrader ? 44 : 36,
                    background:   barBg,
                    borderRadius: 2,
                    flexShrink:   0,
                  }} />
                  <div style={{
                    fontSize:      isTrader ? 14 : 13,
                    fontWeight:    isTrader ? 900 : 800,
                    color:         LABEL_COLOR[li],
                    letterSpacing: "0.8px",
                    textTransform: "uppercase",
                  }}>
                    {level.label}
                  </div>
                </div>

                {/* 3 colonnes montants */}
                {SIZES.map((size, si) => (
                  <div key={size} style={{ textAlign: "center" }}>
                    <div style={{
                      fontSize:           isTrader ? 25 : 22,
                      fontWeight:         isTrader ? 900 : 800,
                      color:              AMT_COLOR[li],
                      letterSpacing:      "-0.5px",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {fmtUSD(AMOUNTS[si][li])}
                    </div>
                    {isTrader && (
                      <div style={{
                        fontSize:      8,
                        fontWeight:    700,
                        color:         "rgba(183,110,121,0.55)",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        marginTop:     3,
                      }}>
                        MAX
                      </div>
                    )}
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
