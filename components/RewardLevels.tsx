"use client";

// ════════════════════════════════════════════════════════════════
//  RewardLevels.tsx — Les 5 niveaux de Rewards (section E)
//  Matrice : 5 niveaux × 3 tailles de compte (25K / 50K / 100K)
//  Design premium : progression visuelle, TRADER REWARD mis en avant
//  Source des montants : lib/rewardsData.ts (frontend uniquement)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { REWARD_AMOUNTS } from "@/lib/rewardsData";

// ── Data ───────────────────────────────────────────────────────

interface Level {
  num:       number;
  tag:       string;
  label:     string;
  sublabel:  string;
  isTrader:  boolean;
}

const LEVELS: Level[] = [
  { num: 1, tag: "#1", label: "REWARD START",  sublabel: "START",  isTrader: false },
  { num: 2, tag: "#2", label: "REWARD PLUS",   sublabel: "PLUS",   isTrader: false },
  { num: 3, tag: "#3", label: "REWARD PRO",    sublabel: "PRO",    isTrader: false },
  { num: 4, tag: "#4", label: "REWARD PRIME",  sublabel: "PRIME",  isTrader: false },
  { num: 5, tag: "#5", label: "TRADER REWARD", sublabel: "TRADER", isTrader: true  },
];

const SIZES = ["25K", "50K", "100K"] as const;

// ── Intensity helpers ──────────────────────────────────────────
// Plus le niveau est élevé, plus le bleu est saturé

const LEVEL_BLUE_OPACITY = [0.07, 0.10, 0.13, 0.17, 0.22];
const LEVEL_BORDER_OPACITY = ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.09)", "rgba(255,255,255,0.11)", "rgba(156,207,234,0.18)", "rgba(156,207,234,0.48)"];
const LEVEL_VALUE_COLOR = ["rgba(255,255,255,0.72)", "rgba(255,255,255,0.78)", "rgba(255,255,255,0.85)", "#b8e4ff", "#9CCFEA"];

function fmtUSD(n: number) {
  return "$" + n.toLocaleString("en-US");
}

// ── Composant ─────────────────────────────────────────────────

export default function RewardLevels() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L   = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

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
      {/* Halo */}
      <div aria-hidden="true" style={{
        position:      "absolute",
        bottom:        "20%",
        left:          "50%",
        width:         "min(700px, 80vw)",
        height:        300,
        transform:     "translateX(-50%)",
        borderRadius:  "50%",
        background:    "radial-gradient(ellipse, rgba(156,207,234,0.06), transparent 68%)",
        filter:        "blur(28px)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 960, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Titre */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
          <div style={{
            fontSize:      11,
            fontWeight:    800,
            color:         "#9CCFEA",
            letterSpacing: "3px",
            textTransform: "uppercase",
            marginBottom:  12,
          }}>
            {L("LES REWARDS", "LOS REWARDS", "THE REWARDS")}
          </div>
          <h2
            id="reward-levels-heading"
            style={{
              fontSize:      isMobile ? "clamp(1.8rem, 7vw, 2.6rem)" : "clamp(2rem, 2.6vw, 3.4rem)",
              fontWeight:    900,
              textTransform: "uppercase",
              color:         "#FFFFFF",
              letterSpacing: "0.5px",
              lineHeight:    1.05,
              margin:        "0 0 12px",
            }}
          >
            {L("5 niveaux de", "5 niveles de", "5 levels of")}{" "}
            <span style={{ color: "#9CCFEA" }}>
              {L("Rewards", "Rewards", "Rewards")}
            </span>
          </h2>
          <p style={{
            maxWidth:   480,
            margin:     "0 auto",
            color:      "rgba(255,255,255,0.42)",
            fontSize:   isMobile ? 13 : 14,
            lineHeight: 1.7,
          }}>
            {L(
              "Chaque Reward débloqué augmente les montants maximums. Le niveau 5 confère le statut Trader Reward.",
              "Cada Reward desbloqueado aumenta los montos máximos. El nivel 5 otorga el estatus Trader Reward.",
              "Each unlocked Reward increases maximum amounts. Level 5 grants Trader Reward status."
            )}
          </p>
        </div>

        {/* Matrice */}
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: isMobile ? 540 : "auto" }}>

            {/* En-tête colonnes */}
            <div style={{
              display:             "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap:                 8,
              marginBottom:        8,
              padding:             "0 4px",
            }}>
              <div /> {/* espace label niveau */}
              {SIZES.map(size => (
                <div key={size} style={{
                  textAlign:     "center",
                  fontSize:      11,
                  fontWeight:    800,
                  color:         "rgba(255,255,255,0.38)",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  padding:       "0 8px 8px",
                }}>
                  {size}
                </div>
              ))}
            </div>

            {/* Lignes de niveaux */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {LEVELS.map((level, li) => {
                const isTrader = level.isTrader;
                return (
                  <div
                    key={li}
                    style={{
                      display:             "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      gap:                 8,
                      alignItems:          "center",
                      padding:             isTrader ? "16px 16px" : "13px 16px",
                      borderRadius:        isTrader ? 14 : 12,
                      border:              LEVEL_BORDER_OPACITY[li],
                      background:          isTrader
                        ? `linear-gradient(135deg, rgba(156,207,234,${LEVEL_BLUE_OPACITY[li]}) 0%, rgba(15,20,28,1) 100%)`
                        : `rgba(255,255,255,${LEVEL_BLUE_OPACITY[li] * 0.4})`,
                      boxShadow:           isTrader
                        ? "0 0 28px rgba(156,207,234,0.08), 0 20px 48px rgba(0,0,0,0.60)"
                        : "0 8px 24px rgba(0,0,0,0.40)",
                      transition:          "transform 200ms ease",
                      transform:           isTrader ? "scale(1.01)" : "scale(1)",
                    }}
                  >
                    {/* Libellé niveau */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Indicateur de progression */}
                      <div style={{
                        width:        3,
                        height:       isTrader ? 40 : 28,
                        borderRadius: 2,
                        background:   isTrader
                          ? "linear-gradient(to bottom, #9CCFEA, #3da8e8)"
                          : `rgba(156,207,234,${0.18 + li * 0.06})`,
                        flexShrink:   0,
                      }} />
                      <div>
                        <div style={{
                          fontSize:      isTrader ? 13 : 12,
                          fontWeight:    isTrader ? 900 : 700,
                          color:         isTrader ? "#9CCFEA" : LEVEL_VALUE_COLOR[li],
                          letterSpacing: "0.3px",
                          lineHeight:    1.2,
                        }}>
                          {level.label}
                        </div>
                        <div style={{
                          fontSize:   9,
                          fontWeight: 700,
                          color:      isTrader ? "rgba(156,207,234,0.65)" : "rgba(255,255,255,0.25)",
                          letterSpacing: "1.2px",
                          textTransform: "uppercase",
                          marginTop:  2,
                        }}>
                          {isTrader
                            ? L("STATUT FINAL", "ESTATUS FINAL", "FINAL STATUS")
                            : L("REWARD", "REWARD", "REWARD")} {level.tag}
                        </div>
                      </div>
                    </div>

                    {/* Montants par taille */}
                    {SIZES.map((_, si) => (
                      <div key={si} style={{ textAlign: "center" }}>
                        <span style={{
                          fontSize:      isTrader ? 16 : 14,
                          fontWeight:    isTrader ? 900 : 700,
                          color:         LEVEL_VALUE_COLOR[li],
                          letterSpacing: "-0.3px",
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {fmtUSD(REWARD_AMOUNTS[si][li])}
                        </span>
                        {isTrader && (
                          <div style={{
                            fontSize:   8,
                            fontWeight: 700,
                            color:      "rgba(156,207,234,0.50)",
                            letterSpacing: "1px",
                            textTransform: "uppercase",
                            marginTop:  3,
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
        </div>

      </div>
    </section>
  );
}
