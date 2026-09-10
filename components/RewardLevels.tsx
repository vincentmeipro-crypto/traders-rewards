"use client";

// ════════════════════════════════════════════════════════════════
//  RewardLevels.tsx — Section "5 levels of Rewards" — redesign premium
//  Matrice 5 × 3 : 5 niveaux × 3 tailles (25K / 50K / 100K)
//  Tous les montants en doré champagne métallique.
//  Source des montants : lib/rewardsData.ts (frontend uniquement)
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { REWARD_AMOUNTS } from "@/lib/rewardsData";

// ── Sizes ─────────────────────────────────────────────────────
const SIZES = ["25K", "50K", "100K"] as const;

// ── Gradients métalliques par colonne ─────────────────────────
// 25K → Argent/acier métallique (jeton argent du Hero)
const SILVER =
  "linear-gradient(110deg, #8E949A 0%, #D7DADD 35%, #F2F3F4 52%, #A8ADB2 75%, #D9DCDF 100%)";

// 50K → Or rose / cuivre rosé premium (jeton or rose du Hero)
const ROSE_GOLD =
  "linear-gradient(110deg, #9F625C 0%, #C9897E 28%, #E5B4A8 52%, #B56F66 78%, #D79A8F 100%)";

// 100K → Doré champagne identique Hero / CTA / titres
const GOLD =
  "linear-gradient(110deg, #B88746 0%, #D6AD63 25%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)";

// Tableau indexé par colonne (si = 0 / 1 / 2)
const COL_GRADIENT = [SILVER, ROSE_GOLD, GOLD] as const;

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

// ── Labels RÉCOMPENSE 1–5 : gris neutre uniforme (aucun doré)
const LABEL_GRAY = "rgba(143,148,154,0.90)";

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

// ── Style montant — gradient selon la colonne (si : 0=25K, 1=50K, 2=100K)
function amtStyle(size: number, si: number): React.CSSProperties {
  return {
    fontSize:             size,
    fontWeight:           800,
    background:           COL_GRADIENT[si],
    WebkitBackgroundClip: "text",
    WebkitTextFillColor:  "transparent",
    backgroundClip:       "text",
    letterSpacing:        "-0.5px",
    fontVariantNumeric:   "tabular-nums",
    lineHeight:           1,
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

  const [isMobile, setIsMobile]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const modalContentRef           = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fermer la modale avec Escape
  const closeModal = useCallback(() => setModalOpen(false), []);
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  // Bloquer le scroll body pendant l'ouverture
  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

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

      {/* Styles hover + animations */}
      <style>{`
        .rl-card {
          transition: transform 0.20s ease, box-shadow 0.20s ease;
          will-change: transform;
        }
        .rl-card:hover { transform: translateY(-3px); }
        .rl-card-5:hover {
          box-shadow: 0 12px 48px rgba(201,155,84,0.13), 0 0 64px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.025) !important;
        }
        .rl-info-btn {
          transition: background 0.15s ease, border-color 0.15s ease;
        }
        .rl-info-btn:hover {
          background: rgba(212,168,67,0.12) !important;
          border-color: rgba(212,168,67,0.55) !important;
        }
        @keyframes rl-fadein {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .rl-modal-box {
          animation: rl-fadein 0.18s ease both;
        }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 36 }}>

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
            margin:     "0 auto 20px",
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

          {/* ── PATCH ⓘ Informations ─────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              className="rl-info-btn"
              onClick={() => setModalOpen(true)}
              aria-haspopup="dialog"
              style={{
                display:       "inline-flex",
                alignItems:    "center",
                gap:           7,
                padding:       "7px 14px",
                borderRadius:  13,
                border:        "1px solid rgba(212,168,67,0.35)",
                background:    "rgba(212,168,67,0.06)",
                color:         "#FFFFFF",
                fontSize:      12,
                fontWeight:    600,
                cursor:        "pointer",
                fontFamily:    "inherit",
                letterSpacing: "0.2px",
                whiteSpace:    "nowrap",
              }}
            >
              <span style={{
                fontSize:  14,
                color:     "#D4A843",
                lineHeight: 1,
                flexShrink: 0,
              }}>ⓘ</span>
              {L("Informations", "Información", "Information")}
            </button>
          </div>
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
                      color:         LABEL_GRAY,
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
                        {/* Montant — couleur selon la colonne */}
                        <div style={amtStyle(AMT_M[li], si)}>
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
                    color:         LABEL_GRAY,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}>
                    {level.label}
                  </div>
                </div>

                {/* 3 colonnes montants — argent / or rose / doré selon colonne */}
                {SIZES.map((_sz, si) => (
                  <div key={si} style={{ textAlign: "center" }}>
                    <div style={amtStyle(AMT_D[li], si)}>
                      {fmtUSD(AMOUNTS[si][li])}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

      </div>

      {/* ════════════════════════════════════════════════════════
          MODALE — Informations sur les Récompenses
          ════════════════════════════════════════════════════ */}
      {modalOpen && (
        /* Overlay — clic extérieur ferme */
        <div
          role="dialog"
          aria-modal="true"
          aria-label={L("Informations sur les Récompenses", "Información sobre las Recompensas", "Information about Rewards")}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position:       "fixed",
            inset:          0,
            zIndex:         1000,
            background:     "rgba(0,0,0,0.72)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            padding:        "16px",
          }}
        >
          {/* Boîte modale */}
          <div
            ref={modalContentRef}
            className="rl-modal-box"
            style={{
              position:     "relative",
              width:        "100%",
              maxWidth:     560,
              maxHeight:    "90vh",
              overflowY:    "auto",
              borderRadius: 18,
              border:       "1px solid rgba(212,168,67,0.38)",
              background:   "#0D0E10",
              padding:      isMobile ? "28px 20px 24px" : "32px 32px 28px",
              boxShadow:    "0 32px 80px rgba(0,0,0,0.80)",
            }}
          >
            {/* Bouton fermer X */}
            <button
              onClick={closeModal}
              aria-label={L("Fermer", "Cerrar", "Close")}
              style={{
                position:       "absolute",
                top:            14,
                right:          16,
                width:          30,
                height:         30,
                borderRadius:   "50%",
                border:         "1px solid rgba(255,255,255,0.12)",
                background:     "rgba(255,255,255,0.05)",
                color:          "rgba(255,255,255,0.60)",
                fontSize:       16,
                cursor:         "pointer",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontFamily:     "inherit",
                lineHeight:     1,
                padding:        0,
                transition:     "background 0.12s ease, color 0.12s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLElement).style.color      = "#FFFFFF";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLElement).style.color      = "rgba(255,255,255,0.60)";
              }}
            >
              ✕
            </button>

            {/* ── Titre modale */}
            <div style={{
              display:       "flex",
              alignItems:    "flex-start",
              gap:           12,
              marginBottom:  22,
              paddingRight:  36,
            }}>
              <span style={{
                fontSize:   18,
                color:      "#D4A843",
                lineHeight: 1,
                flexShrink: 0,
                marginTop:  2,
              }}>ⓘ</span>
              <h3 style={{
                margin:        0,
                fontSize:      isMobile ? 13 : 14,
                fontWeight:    900,
                color:         "#FFFFFF",
                letterSpacing: "1.4px",
                textTransform: "uppercase",
                lineHeight:    1.3,
              }}>
                {L(
                  "COMMENT FONCTIONNENT LES RÉCOMPENSES ?",
                  "¿CÓMO FUNCIONAN LAS RECOMPENSAS?",
                  "HOW DO REWARDS WORK?",
                )}
              </h3>
            </div>

            {/* ── Corps texte */}
            <p style={{
              fontSize:     isMobile ? 14 : 15,
              color:        "rgba(255,255,255,0.62)",
              lineHeight:   1.6,
              margin:       "0 0 22px",
            }}>
              <span style={{ color: "#FFFFFF", fontWeight: 700 }}>
                {L("Aucun minimum de retrait.", "Sin retiro mínimo.", "No minimum withdrawal.")}
              </span>
              {" "}
              {L(
                "Le montant indiqué dans le tableau correspond au montant MAXIMUM que vous pouvez recevoir pour chaque Reward.",
                "El importe indicado en la tabla corresponde al importe MÁXIMO que puede recibir por cada Reward.",
                "The amount shown in the table is the MAXIMUM amount you can receive for each Reward.",
              )}
            </p>

            {/* ── Exemple visuel */}
            <div style={{
              borderRadius: 12,
              border:       "1px solid rgba(255,255,255,0.08)",
              background:   "rgba(255,255,255,0.03)",
              padding:      isMobile ? "14px 16px" : "16px 20px",
              marginBottom: 18,
            }}>
              {/* En-tête exemple */}
              <div style={{
                fontSize:      9,
                fontWeight:    800,
                letterSpacing: "1.8px",
                color:         "rgba(212,168,67,0.80)",
                textTransform: "uppercase",
                marginBottom:  12,
              }}>
                {L(
                  "EXEMPLE — COMPTE 50K · RÉCOMPENSE #1",
                  "EJEMPLO — CUENTA 50K · RECOMPENSA #1",
                  "EXAMPLE — 50K ACCOUNT · REWARD #1",
                )}
              </div>

              {/* Ligne 1 — sous le plafond */}
              <div style={{
                display:       "flex",
                alignItems:    "center",
                gap:           8,
                flexWrap:      "wrap",
                marginBottom:  8,
              }}>
                <span style={{ fontSize: isMobile ? 12 : 13, color: "rgba(255,255,255,0.42)", whiteSpace: "nowrap" }}>
                  {L("Résultat éligible :", "Resultado elegible :", "Eligible result:")}
                </span>
                <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>
                  320 $
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.20)" }}>→</span>
                <span style={{ fontSize: isMobile ? 12 : 13, color: "rgba(255,255,255,0.42)", whiteSpace: "nowrap" }}>
                  {L("Récompense :", "Recompensa :", "Reward:")}
                </span>
                <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>
                  320 $
                </span>
              </div>

              {/* Ligne 2 — au-dessus du plafond → 500 $ MAX */}
              <div style={{
                display:    "flex",
                alignItems: "center",
                gap:        8,
                flexWrap:   "wrap",
              }}>
                <span style={{ fontSize: isMobile ? 12 : 13, color: "rgba(255,255,255,0.42)", whiteSpace: "nowrap" }}>
                  {L("Résultat éligible :", "Resultado elegible :", "Eligible result:")}
                </span>
                <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap" }}>
                  700 $
                </span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.20)" }}>→</span>
                <span style={{ fontSize: isMobile ? 12 : 13, color: "rgba(255,255,255,0.42)", whiteSpace: "nowrap" }}>
                  {L("Récompense :", "Recompensa :", "Reward:")}
                </span>
                {/* 500 $ MAX — doré champagne */}
                <span style={{
                  fontSize:             isMobile ? 13 : 14,
                  fontWeight:           800,
                  background:           GOLD,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  backgroundClip:       "text",
                  whiteSpace:           "nowrap",
                }}>
                  {L("500 $ MAX", "500 $ MÁX.", "500 $ MAX")}
                </span>
              </div>
            </div>

            {/* ── Note finale */}
            <p style={{
              fontSize:   isMobile ? 12 : 13,
              color:      "rgba(255,255,255,0.40)",
              lineHeight: 1.6,
              margin:     0,
              fontStyle:  "italic",
            }}>
              {L(
                "Vous pouvez donc demander une Récompense inférieure au maximum. Le plafond augmente à chaque niveau.",
                "Por lo tanto, puede solicitar una Recompensa inferior al máximo. El límite aumenta en cada nivel.",
                "You can therefore request a Reward below the maximum. The cap increases at each level.",
              )}
            </p>

          </div>
        </div>
      )}
    </section>
  );
}
