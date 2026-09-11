"use client";

// ════════════════════════════════════════════════════════════════
//  RewardLevels.tsx — Section "5 levels of Rewards" — redesign premium
//  Matrice 5 × 3 : 5 niveaux × 3 tailles (25K / 50K / 100K)
//  Source des montants : lib/rewardsData.ts (frontend uniquement)
// ════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { REWARD_AMOUNTS } from "@/lib/rewardsData";

const SIZES = ["25K", "50K", "100K"] as const;

const SILVER    = "linear-gradient(110deg, #8E949A 0%, #D7DADD 35%, #F2F3F4 52%, #A8ADB2 75%, #D9DCDF 100%)";
const ROSE_GOLD = "linear-gradient(110deg, #9F625C 0%, #C9897E 28%, #E5B4A8 52%, #B56F66 78%, #D79A8F 100%)";
const GOLD      = "linear-gradient(110deg, #B88746 0%, #D6AD63 25%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)";

const COL_GRADIENT = [SILVER, ROSE_GOLD, GOLD] as const;

const BORDER = [
  "rgba(216,180,104,0.12)",
  "rgba(216,180,104,0.20)",
  "rgba(216,180,104,0.30)",
  "rgba(216,180,104,0.48)",
  "rgba(216,180,104,0.72)",
];

const SHADOW = [
  "0 2px 16px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.015)",
  "0 2px 16px rgba(0,0,0,0.52), inset 0 1px 0 rgba(255,255,255,0.018)",
  "0 4px 20px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.020)",
  "0 6px 24px rgba(0,0,0,0.58), 0 0 20px rgba(201,155,84,0.04), inset 0 1px 0 rgba(255,255,255,0.022)",
  "0 8px 32px rgba(0,0,0,0.64), 0 0 32px rgba(201,155,84,0.07), inset 0 1px 0 rgba(255,255,255,0.025)",
];

const LABEL_GRAY = "rgba(143,148,154,0.90)";
const AMT_D = [33, 34, 35, 36, 38];
const AMT_M = [22, 23, 24, 25, 27];

function fmtUSD(n: number) { return "$" + n.toLocaleString("en-US"); }

const AMOUNTS = REWARD_AMOUNTS as readonly (readonly number[])[];

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

// ── Sous-section label gold ────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      fontSize:      9,
      fontWeight:    800,
      letterSpacing: "1.8px",
      color:         "rgba(212,168,67,0.72)",
      textTransform: "uppercase",
      marginBottom:  9,
    }}>
      {text}
    </div>
  );
}

// ── Séparateur horizontal ──────────────────────────────────────
function Sep() {
  return <div style={{ borderTop: "1px solid rgba(255,255,255,0.055)", margin: "14px 0" }} />;
}

// ── Mini-grille 3 colonnes (planchers) ────────────────────────
function FloorGrid({ rows, isMobile }: { rows: [string, string][]; isMobile: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5, margin: "9px 0" }}>
      {rows.map(([sz, val]) => (
        <div key={sz} style={{
          textAlign: "center", borderRadius: 7,
          border: "1px solid rgba(212,168,67,0.14)", background: "rgba(212,168,67,0.04)", padding: "6px 4px",
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 3 }}>{sz}</div>
          <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: "#D4A843" }}>{val}</div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────

export default function RewardLevels() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) =>
    isFr ? fr : isEs ? es : en;

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

  const closeModal = useCallback(() => setModalOpen(false), []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  // ── Taille de texte modale ────────────────────────────────────
  const ms  = (d: number, m?: number) => isMobile ? (m ?? d - 1) : d;
  const msp = (d: number, m?: number): React.CSSProperties => ({ fontSize: ms(d, m) });

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
      {/* Halo ambiant */}
      <div aria-hidden="true" style={{
        position: "absolute", bottom: "12%", left: "50%",
        width: "min(560px, 65vw)", height: 220,
        transform: "translateX(-50%)", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(184,135,70,0.055) 0%, transparent 70%)",
        filter: "blur(44px)", pointerEvents: "none",
      }} />

      {/* Styles */}
      <style>{`
        .rl-card { transition: transform 0.20s ease, box-shadow 0.20s ease; will-change: transform; }
        .rl-card:hover { transform: translateY(-3px); }
        .rl-card-5:hover { box-shadow: 0 12px 48px rgba(201,155,84,0.13), 0 0 64px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.025) !important; }
        .rl-info-btn { transition: background 0.15s ease, border-color 0.15s ease; }
        .rl-info-btn:hover { background: rgba(212,168,67,0.12) !important; border-color: rgba(212,168,67,0.55) !important; }
        @keyframes rl-fadein { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .rl-modal-box { animation: rl-fadein 0.18s ease both; }
      `}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 28 : 36 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#D4A843", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 14 }}>
            {L("LES REWARDS", "LOS REWARDS", "THE REWARDS")}
          </div>
          <h2 id="rl-heading" style={{
            fontSize: isMobile ? "clamp(2.1rem, 7vw, 2.75rem)" : "clamp(2.4rem, 3.5vw, 3.5rem)",
            fontWeight: 900, textTransform: "uppercase", color: "#FFFFFF",
            letterSpacing: "0.5px", lineHeight: 1.05, margin: "0 0 18px",
          }}>
            {L("5 niveaux de", "5 niveles de", "5 levels of")}{" "}
            <span style={{ background: GOLD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              {L("Récompenses", "Recompensas", "Rewards")}
            </span>
          </h2>
          <p style={{
            maxWidth: isMobile ? 480 : "none", whiteSpace: isMobile ? "normal" : "nowrap",
            margin: "0 auto 20px", color: "rgba(255,255,255,0.46)", fontSize: isMobile ? 14 : 17, lineHeight: 1.7,
          }}>
            {L(
              "Retirez jusqu'à 5 récompenses avec le même compte.",
              "Retire hasta 5 recompensas con la misma cuenta.",
              "Withdraw up to 5 rewards with the same account.",
            )}
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="rl-info-btn" onClick={() => setModalOpen(true)} aria-haspopup="dialog" style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "7px 14px", borderRadius: 13,
              border: "1px solid rgba(212,168,67,0.35)", background: "rgba(212,168,67,0.06)",
              color: "#FFFFFF", fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit", letterSpacing: "0.2px", whiteSpace: "nowrap",
            }}>
              <span style={{ fontSize: 14, color: "#D4A843", lineHeight: 1, flexShrink: 0 }}>ⓘ</span>
              {L("Informations", "Información", "Information")}
            </button>
          </div>
        </div>

        {/* ── EN-TÊTES COLONNES desktop ───────────────────────── */}
        {!isMobile && (
          <div style={{ display: "grid", gridTemplateColumns: "220px repeat(3, 1fr)", gap: 16, marginBottom: 10, padding: "0 28px" }}>
            <div />
            {SIZES.map((s) => (
              <div key={s} style={{ textAlign: "center", fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.32)", letterSpacing: "2.5px", textTransform: "uppercase" }}>{s}</div>
            ))}
          </div>
        )}

        {/* ── LES 5 CARTES ──────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 10 : 8 }}>
          {LEVELS.map((level, li) => {
            const isTrader = level.isTrader;
            const barBg = isTrader ? GOLD : `rgba(216,180,104,${0.14 + li * 0.07})`;

            if (isMobile) {
              return (
                <div key={li} className={`rl-card${isTrader ? " rl-card-5" : ""}`} style={{
                  position: "relative", borderRadius: isTrader ? 16 : 12,
                  border: `1px solid ${BORDER[li]}`, background: "linear-gradient(180deg, #050505 0%, #090909 100%)",
                  boxShadow: SHADOW[li], padding: isTrader ? "24px 16px 20px" : "18px 14px",
                }}>
                  {isTrader && (
                    <div style={{
                      position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                      background: "#050505", border: `1px solid ${BORDER[li]}`, borderRadius: 999,
                      padding: "4px 14px", fontSize: 9, fontWeight: 800, color: "#D4A843",
                      letterSpacing: "1.5px", whiteSpace: "nowrap",
                    }}>MAX REWARD</div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: isTrader ? 30 : 26, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1, background: GOLD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", flexShrink: 0 }}>{level.num}</span>
                    <div style={{ width: 1, height: isTrader ? 34 : 26, background: barBg, flexShrink: 0 }} />
                    <span style={{ fontSize: isTrader ? 12 : 11, fontWeight: 800, color: LABEL_GRAY, letterSpacing: "1.2px", textTransform: "uppercase" }}>{level.label}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {SIZES.map((sz, si) => (
                      <div key={sz} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.30)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>{sz}</div>
                        <div style={amtStyle(AMT_M[li], si)}>{fmtUSD(AMOUNTS[si][li])}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={li} className={`rl-card${isTrader ? " rl-card-5" : ""}`} style={{
                position: "relative", display: "grid", gridTemplateColumns: "220px repeat(3, 1fr)",
                gap: 16, alignItems: "center", borderRadius: isTrader ? 18 : 13,
                border: `1px solid ${BORDER[li]}`, background: "linear-gradient(180deg, #050505 0%, #090909 100%)",
                boxShadow: SHADOW[li], padding: isTrader ? "30px 28px" : "22px 28px",
              }}>
                {isTrader && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "#050505", border: `1px solid ${BORDER[li]}`, borderRadius: 999,
                    padding: "5px 18px", fontSize: 9, fontWeight: 800, color: "#D4A843",
                    letterSpacing: "2px", whiteSpace: "nowrap",
                  }}>MAX REWARD</div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div style={{ fontSize: isTrader ? 50 : 44, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1, background: GOLD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", minWidth: 60, textAlign: "right", flexShrink: 0 }}>{level.num}</div>
                  <div style={{ width: 1, height: isTrader ? 50 : 38, background: barBg, flexShrink: 0 }} />
                  <div style={{ fontSize: isTrader ? 13 : 12, fontWeight: 800, color: LABEL_GRAY, letterSpacing: "1px", textTransform: "uppercase" }}>{level.label}</div>
                </div>
                {SIZES.map((_sz, si) => (
                  <div key={si} style={{ textAlign: "center" }}>
                    <div style={amtStyle(AMT_D[li], si)}>{fmtUSD(AMOUNTS[si][li])}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MODALE — Comment fonctionnent les Récompenses ?
          ════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div
          role="dialog" aria-modal="true"
          aria-label={L("Informations sur les Récompenses", "Información sobre las Recompensas", "Information about Rewards")}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
          }}
        >
          <div ref={modalContentRef} className="rl-modal-box" style={{
            position: "relative", width: "100%", maxWidth: 604,
            maxHeight: "92vh", overflowY: "auto", borderRadius: 18,
            border: "1px solid rgba(212,168,67,0.38)", background: "#0D0E10",
            padding: isMobile ? "26px 16px 22px" : "30px 28px 26px",
            boxShadow: "0 32px 80px rgba(0,0,0,0.82)",
          }}>

            {/* ── Bouton fermer X ──────────────────────────── */}
            <button onClick={closeModal} aria-label={L("Fermer", "Cerrar", "Close")} style={{
              position: "absolute", top: 12, right: 14, width: 28, height: 28,
              borderRadius: "50%", border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.60)",
              fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", fontFamily: "inherit", lineHeight: 1, padding: 0,
              transition: "background 0.12s ease, color 0.12s ease",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "#FFFFFF"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.60)"; }}
            >✕</button>

            {/* ── Titre ────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 16, paddingRight: 34 }}>
              <span style={{ fontSize: 17, color: "#D4A843", lineHeight: 1, flexShrink: 0, marginTop: 1 }}>ⓘ</span>
              <h3 style={{ margin: 0, ...msp(13), fontWeight: 900, color: "#FFFFFF", letterSpacing: "1.3px", textTransform: "uppercase", lineHeight: 1.3 }}>
                {L("COMMENT FONCTIONNENT LES RÉCOMPENSES ?", "¿CÓMO FUNCIONAN LAS RECOMPENSAS?", "HOW DO REWARDS WORK?")}
              </h3>
            </div>

            {/* ── Introduction ─────────────────────────────── */}
            <p style={{ ...msp(13), color: "rgba(255,255,255,0.58)", lineHeight: 1.6, margin: "0 0 12px" }}>
              {L(
                "Chaque niveau correspond à un montant maximum de Récompense. Vous êtes libre de demander tout ou partie du montant disponible, à partir de 100 $.",
                "Cada nivel corresponde a un importe máximo de Recompensa. Puede solicitar todo o parte del importe disponible, a partir de $100.",
                "Each level corresponds to a maximum Reward amount. You are free to request all or part of the available amount, starting from $100.",
              )}
            </p>

            {/* ── 3 points clés ────────────────────────────── */}
            <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.025)", padding: isMobile ? "10px 12px" : "11px 14px", marginBottom: 14, display: "flex", flexDirection: "column", gap: 7 }}>
              {([
                [L("Retrait minimum : 100 $.", "Retiro mínimo: $100.", "Minimum withdrawal: $100."), true],
                [
                  isFr ? "Le montant indiqué dans le tableau est le montant MAXIMUM — vous pouvez en demander moins."
                  : isEs ? "El importe indicado en la tabla es el MÁXIMO — puede solicitar menos."
                  : "The amount shown in the table is the MAXIMUM — you may request less.",
                  false,
                ],
                [
                  isFr ? "Chaque Reward constitue un nouveau cycle de 5 jours qualifiants."
                  : isEs ? "Cada Recompensa constituye un nuevo ciclo de 5 días calificados."
                  : "Each Reward starts a new cycle of 5 qualifying days.",
                  false,
                ],
              ] as [string, boolean][]).map(([text, bold], i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "#D4A843", fontSize: 11, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>◆</span>
                  <p style={{ margin: 0, ...msp(12), color: bold ? "#FFFFFF" : "rgba(255,255,255,0.68)", lineHeight: 1.5, fontWeight: bold ? 700 : 400 }}>{text}</p>
                </div>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════
                A — UN NOUVEAU CYCLE À CHAQUE REWARD
                ══════════════════════════════════════════════ */}
            <SectionLabel text={L("UN NOUVEAU CYCLE À CHAQUE REWARD", "UN NUEVO CICLO EN CADA RECOMPENSA", "A NEW CYCLE WITH EACH REWARD")} />
            <p style={{ ...msp(12), color: "rgba(255,255,255,0.58)", lineHeight: 1.6, margin: "0 0 10px" }}>
              {L(
                "Pour débloquer une Reward, vous devez réaliser 5 jours qualifiants en respectant la règle de consistance de 50 %. Après chaque Récompense, le compteur repart à zéro : vous devez effectuer 5 nouveaux jours qualifiants pour la suivante. Les jours utilisés ne sont pas reportés.",
                "Para desbloquear una Recompensa, debe realizar 5 días calificados respetando la regla de consistencia del 50 %. Tras cada Recompensa, el contador vuelve a cero: debe realizar 5 nuevos días calificados para la siguiente. Los días utilizados no se transfieren.",
                "To unlock a Reward, you must complete 5 qualifying days while respecting the 50% consistency rule. After each Reward, the counter resets to zero: you must complete 5 new qualifying days for the next one. Used days do not carry over.",
              )}
            </p>

            {/* Chaîne visuelle R1 → R5 */}
            <div style={{
              borderRadius: 10, border: "1px solid rgba(212,168,67,0.18)", background: "rgba(212,168,67,0.025)",
              padding: isMobile ? "11px 12px" : "12px 16px", marginBottom: 14,
            }}>
              {[1, 2, 3, 4, 5].map((n, i) => (
                <React.Fragment key={n}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      minWidth: isMobile ? 26 : 30, height: isMobile ? 26 : 30,
                      borderRadius: "50%", border: "1px solid rgba(212,168,67,0.40)",
                      background: "rgba(212,168,67,0.07)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: isMobile ? 10 : 11, fontWeight: 800, color: "#D4A843", flexShrink: 0,
                    }}>R{n}</div>
                    <span style={{ ...msp(11), color: "rgba(255,255,255,0.62)", lineHeight: 1.4 }}>
                      {n === 1
                        ? L("5 jours qualifiants · consistance 50 %", "5 días calificados · consistencia 50 %", "5 qualifying days · 50% consistency")
                        : L("5 nouveaux jours qualifiants · consistance 50 %", "5 nuevos días calificados · consistencia 50 %", "5 new qualifying days · 50% consistency")
                      }
                    </span>
                  </div>
                  {i < 4 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0 4px 13px" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>↓</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.8px" }}>
                        {L(`REWARD #${n} PAYÉE`, `RECOMPENSA #${n} PAGADA`, `REWARD #${n} PAID`)}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════
                B — AVANT VOTRE PREMIÈRE RÉCOMPENSE
                ══════════════════════════════════════════════ */}
            <SectionLabel text={L("AVANT VOTRE PREMIÈRE RÉCOMPENSE", "ANTES DE SU PRIMERA RECOMPENSA", "BEFORE YOUR FIRST REWARD")} />
            <p style={{ ...msp(12), color: "rgba(255,255,255,0.58)", lineHeight: 1.6, margin: "0 0 6px" }}>
              {L(
                "Tant qu'aucune Récompense n'a été effectuée, votre compte reste sous la mécanique du Trailing DD EOD. Votre plancher suit la progression de votre compte jusqu'à son niveau maximal :",
                "Mientras no se haya realizado ninguna Recompensa, su cuenta permanece bajo la mecánica del Trailing DD EOD. Su piso sigue la progresión de su cuenta hasta su nivel máximo :",
                "As long as no Reward has been withdrawn, your account remains under the Trailing DD EOD mechanic. Your floor follows your account's progression up to its maximum level:",
              )}
            </p>
            <FloorGrid rows={[["25K", "$26,000"], ["50K", "$52,000"], ["100K", "$103,000"]]} isMobile={isMobile} />
            <div style={{ display: "flex", gap: 7, alignItems: "flex-start", margin: "8px 0" }}>
              <span style={{ fontSize: 12, color: "rgba(212,168,67,0.60)", flexShrink: 0, marginTop: 1 }}>⚠</span>
              <p style={{ margin: 0, ...msp(11), color: "rgba(255,255,255,0.50)", lineHeight: 1.5 }}>
                {L(
                  "Ces niveaux ne sont pas des conditions obligatoires pour demander votre première Reward. Le Trailing DD EOD cesse simplement de remonter une fois ce niveau atteint.",
                  "Estos niveles no son condiciones obligatorias para solicitar su primera Recompensa. El Trailing DD EOD simplemente deja de subir una vez alcanzado este nivel.",
                  "These levels are not mandatory conditions for requesting your first Reward. The Trailing DD EOD simply stops rising once this level is reached.",
                )}
              </p>
            </div>
            <p style={{ ...msp(11), color: "rgba(255,255,255,0.48)", lineHeight: 1.5, margin: "0 0 0" }}>
              {L(
                "Vous pouvez choisir de continuer à faire progresser votre compte avant votre première Reward afin de construire un coussin de sécurité plus important.",
                "Puede optar por seguir haciendo crecer su cuenta antes de su primera Recompensa a fin de construir un colchón de seguridad mayor.",
                "You can choose to keep growing your account before your first Reward in order to build a larger safety cushion.",
              )}
            </p>

            <Sep />

            {/* ══════════════════════════════════════════════════
                C — EXEMPLE COMPTE 50K
                ══════════════════════════════════════════════ */}
            <div style={{ borderRadius: 12, border: "1px solid rgba(212,168,67,0.22)", background: "rgba(212,168,67,0.025)", overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: isMobile ? "8px 13px" : "9px 16px", borderBottom: "1px solid rgba(212,168,67,0.13)", fontSize: 9, fontWeight: 800, letterSpacing: "1.8px", color: "rgba(212,168,67,0.85)", textTransform: "uppercase" }}>
                {L("EXEMPLE — COMPTE 50K", "EJEMPLO — CUENTA 50K", "EXAMPLE — 50K ACCOUNT")}
              </div>

              <div style={{ padding: isMobile ? "13px 13px 15px" : "14px 16px 16px" }}>

                {/* Situation initiale */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", paddingBottom: 11, borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 11 }}>
                  {([
                    [L("Capital de départ", "Capital inicial", "Starting balance"), "$50,000", false],
                    [L("5 journées à +$250 (exemple)", "5 días a +$250 (ejemplo)", "5 days at +$250 (example)"), "+$1,250", false],
                    [L("Solde", "Saldo", "Balance"), "$51,250", false],
                    [L("Reward #1 — maximum", "Recompensa #1 — máximo", "Reward #1 — maximum"), "$500", true],
                  ] as [string, string, boolean][]).map(([label, val, gold], i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                      <span style={{ ...msp(11), color: "rgba(255,255,255,0.35)" }}>{label} :</span>
                      <span style={{ ...msp(12), fontWeight: 700, color: gold ? "#D4A843" : "#FFFFFF" }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* 4 options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                  {/* OPTION 1 — MAXIMUM */}
                  <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.022)", padding: isMobile ? "9px 11px" : "10px 13px", borderLeft: "2px solid rgba(212,168,67,0.52)" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.3px", color: "rgba(212,168,67,0.72)", textTransform: "uppercase", marginBottom: 6 }}>
                      {L("OPTION 1 — RETIRER LE MAXIMUM", "OPCIÓN 1 — RETIRAR EL MÁXIMO", "OPTION 1 — WITHDRAW THE MAXIMUM")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", marginBottom: 5 }}>
                      {([
                        [L("Reward demandée", "Recompensa solicitada", "Requested reward"), "$500"],
                        [L("Solde après", "Saldo después", "Balance after"), "$50,750"],
                        [L("→ Plancher fixe", "→ Piso fijo", "→ Fixed floor"), "$50,000"],
                        [L("Coussin", "Margen", "Cushion"), "$750"],
                      ] as [string, string][]).map(([lbl, v], i) => (
                        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span style={{ ...msp(10), color: "rgba(255,255,255,0.33)" }}>{lbl} :</span>
                          <span style={{ ...msp(11), fontWeight: 700, color: "#FFFFFF" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: "0 0 4px", ...msp(10), color: "rgba(255,255,255,0.44)", lineHeight: 1.45, fontStyle: "italic" }}>
                      {L(
                        "Votre Trailing DD EOD prend fin. Vous démarrez votre nouveau cycle vers Reward #2 avec $750 de coussin.",
                        "Su Trailing DD EOD finaliza. Inicia su nuevo ciclo hacia la Recompensa #2 con $750 de colchón.",
                        "Your Trailing DD EOD ends. You begin your new cycle toward Reward #2 with a $750 cushion.",
                      )}
                    </p>
                    <p style={{ margin: 0, ...msp(10), color: "rgba(212,168,67,0.65)", lineHeight: 1.4 }}>
                      {L(
                        "Reward #2 : 5 nouveaux jours qualifiants · consistance 50 % · plafond $750",
                        "Recompensa #2 : 5 nuevos días calificados · consistencia 50 % · límite $750",
                        "Reward #2: 5 new qualifying days · 50% consistency · cap $750",
                      )}
                    </p>
                  </div>

                  {/* OPTION 2 — MOINS */}
                  <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.022)", padding: isMobile ? "9px 11px" : "10px 13px", borderLeft: "2px solid rgba(175,175,175,0.30)" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.3px", color: "rgba(185,185,185,0.55)", textTransform: "uppercase", marginBottom: 6 }}>
                      {L("OPTION 2 — RETIRER MOINS", "OPCIÓN 2 — RETIRAR MENOS", "OPTION 2 — WITHDRAW LESS")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", marginBottom: 5 }}>
                      {([
                        [L("Reward demandée", "Recompensa solicitada", "Requested reward"), "$250"],
                        [L("Solde après", "Saldo después", "Balance after"), "$51,000"],
                        [L("→ Plancher fixe", "→ Piso fijo", "→ Fixed floor"), "$50,000"],
                        [L("Coussin", "Margen", "Cushion"), "$1,000"],
                      ] as [string, string][]).map(([lbl, v], i) => (
                        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span style={{ ...msp(10), color: "rgba(255,255,255,0.33)" }}>{lbl} :</span>
                          <span style={{ ...msp(11), fontWeight: 700, color: "#FFFFFF" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: 0, ...msp(10), color: "rgba(255,255,255,0.44)", lineHeight: 1.45, fontStyle: "italic" }}>
                      {L(
                        "Vous conservez davantage de marge pour poursuivre votre parcours. Reward #2 : 5 nouveaux jours qualifiants · consistance 50 %.",
                        "Conserva más margen para continuar su recorrido. Recompensa #2: 5 nuevos días calificados · consistencia 50 %.",
                        "You keep more margin to continue your journey. Reward #2: 5 new qualifying days · 50% consistency.",
                      )}
                    </p>
                  </div>

                  {/* OPTION 3 — MINIMUM $100 */}
                  <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.022)", padding: isMobile ? "9px 11px" : "10px 13px", borderLeft: "2px solid rgba(140,140,140,0.22)" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.3px", color: "rgba(155,155,155,0.50)", textTransform: "uppercase", marginBottom: 6 }}>
                      {L("OPTION 3 — RETIRER LE MINIMUM ($100)", "OPCIÓN 3 — RETIRAR EL MÍNIMO ($100)", "OPTION 3 — WITHDRAW THE MINIMUM ($100)")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", marginBottom: 5 }}>
                      {([
                        [L("Reward demandée", "Recompensa solicitada", "Requested reward"), "$100"],
                        [L("Solde après", "Saldo después", "Balance after"), "$51,150"],
                        [L("→ Plancher fixe", "→ Piso fijo", "→ Fixed floor"), "$50,000"],
                        [L("Coussin", "Margen", "Cushion"), "$1,150"],
                      ] as [string, string][]).map(([lbl, v], i) => (
                        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span style={{ ...msp(10), color: "rgba(255,255,255,0.33)" }}>{lbl} :</span>
                          <span style={{ ...msp(11), fontWeight: 700, color: "#FFFFFF" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: 0, ...msp(10), color: "rgba(255,255,255,0.44)", lineHeight: 1.45, fontStyle: "italic" }}>
                      {L(
                        "Même avec seulement $100, votre plancher devient fixe dès ce premier retrait. Reward #2 : 5 nouveaux jours qualifiants · consistance 50 %.",
                        "Incluso con solo $100, su piso queda fijo desde este primer retiro. Recompensa #2: 5 nuevos días calificados · consistencia 50 %.",
                        "Even with just $100, your floor becomes fixed from this first withdrawal. Reward #2: 5 new qualifying days · 50% consistency.",
                      )}
                    </p>
                  </div>

                  {/* OPTION 4 — NE PAS RETIRER */}
                  <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.018)", padding: isMobile ? "9px 11px" : "10px 13px", borderLeft: "2px solid rgba(110,110,110,0.18)" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "1.3px", color: "rgba(130,130,130,0.48)", textTransform: "uppercase", marginBottom: 6 }}>
                      {L("OPTION 4 — NE PAS RETIRER (ENCORE)", "OPCIÓN 4 — NO RETIRAR (AÚN)", "OPTION 4 — HOLD OFF (FOR NOW)")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 14px", marginBottom: 5 }}>
                      {([
                        [L("Trailing DD EOD : continue", "Trailing DD EOD: continúa", "Trailing DD EOD: continues"), ""],
                        [L("Plancher EOD maximum", "Piso EOD máximo", "Max EOD floor"), "$52,000"],
                        [L("Ex : solde $54,000 → plancher $52,000 → marge", "Ej: saldo $54,000 → piso $52,000 → margen", "Ex: balance $54,000 → floor $52,000 → cushion"), "$2,000"],
                      ] as [string, string][]).map(([lbl, v], i) => (
                        <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span style={{ ...msp(10), color: "rgba(255,255,255,0.30)" }}>{lbl}</span>
                          {v && <span style={{ ...msp(11), fontWeight: 700, color: "#FFFFFF" }}>{v}</span>}
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: 0, ...msp(10), color: "rgba(255,255,255,0.40)", lineHeight: 1.45, fontStyle: "italic" }}>
                      {L(
                        "Le plancher fixe de $50,000 n'est pas encore déclenché. Vous construisez davantage de marge avant votre première Reward.",
                        "El piso fijo de $50,000 aún no se activa. Construye más margen antes de su primera Recompensa.",
                        "The fixed floor of $50,000 is not yet triggered. You build more margin before your first Reward.",
                      )}
                    </p>
                  </div>

                </div>
              </div>
            </div>

            {/* ── Exemple du plafond ────────────────────────── */}
            <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.022)", padding: isMobile ? "10px 12px" : "12px 15px", marginBottom: 14 }}>
              <SectionLabel text={L("EXEMPLE — PLAFOND REWARD #1 · 50K", "EJEMPLO — LÍMITE RECOMPENSA #1 · 50K", "EXAMPLE — REWARD #1 CAP · 50K")} />
              {/* Cas 1 */}
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "3px 8px", marginBottom: 5 }}>
                <span style={{ ...msp(11), color: "rgba(255,255,255,0.35)" }}>{L("Montant disponible :", "Importe disponible :", "Available amount:")}</span>
                <span style={{ ...msp(12), fontWeight: 700, color: "#FFFFFF" }}>$320</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>{"→"}</span>
                <span style={{ ...msp(11), color: "rgba(255,255,255,0.35)" }}>{L("Reward maximum :", "Recompensa máxima :", "Maximum reward:")}</span>
                <span style={{ ...msp(12), fontWeight: 700, color: "#FFFFFF" }}>$320</span>
              </div>
              {/* Cas 2 */}
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "3px 8px", marginBottom: 8 }}>
                <span style={{ ...msp(11), color: "rgba(255,255,255,0.35)" }}>{L("Montant disponible :", "Importe disponible :", "Available amount:")}</span>
                <span style={{ ...msp(12), fontWeight: 700, color: "#FFFFFF" }}>$700</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.18)" }}>{"→"}</span>
                <span style={{ ...msp(11), color: "rgba(255,255,255,0.35)" }}>{L("Reward maximum :", "Recompensa máxima :", "Maximum reward:")}</span>
                <span style={{ ...msp(12), fontWeight: 800, background: GOLD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {L("$500 MAX", "$500 MÁX.", "$500 MAX")}
                </span>
              </div>
              <p style={{ margin: 0, ...msp(10), color: "rgba(255,255,255,0.32)", lineHeight: 1.45, fontStyle: "italic" }}>
                {L(
                  "La Récompense versée correspond au montant demandé (min. $100), dans la limite du montant disponible et du plafond Reward de votre niveau.",
                  "La Recompensa pagada corresponde al importe solicitado (mín. $100), dentro del límite del importe disponible y del límite de Recompensa de su nivel.",
                  "The Reward paid equals the requested amount (min. $100), limited to the available amount and your level's Reward cap.",
                )}
              </p>
            </div>

            {/* ── Phrase clé ───────────────────────────────── */}
            <div style={{ borderRadius: 10, border: "1px solid rgba(212,168,67,0.28)", background: "rgba(212,168,67,0.05)", padding: isMobile ? "11px 13px" : "12px 16px", marginBottom: 14, textAlign: "center" }}>
              <p style={{ margin: "0 0 5px", ...msp(11), fontWeight: 800, color: "#D4A843", letterSpacing: "0.4px", textTransform: "uppercase" }}>
                {L("PLUS VOUS RETIREZ, PLUS VOTRE COUSSIN DIMINUE.", "CUANTO MÁS RETIRE, MENOR SERÁ SU COLCHÓN.", "THE MORE YOU WITHDRAW, THE SMALLER YOUR CUSHION.")}
              </p>
              <p style={{ margin: 0, ...msp(11), color: "rgba(255,255,255,0.46)", lineHeight: 1.55 }}>
                {L(
                  "Vous choisissez librement l'équilibre entre Récompense immédiate et marge de sécurité pour poursuivre vers les Rewards suivantes.",
                  "Elige libremente el equilibrio entre Recompensa inmediata y margen de seguridad para continuar hacia las siguientes Recompensas.",
                  "You freely choose the balance between an immediate Reward and the safety margin needed to continue toward future Rewards.",
                )}
              </p>
            </div>

            {/* ══════════════════════════════════════════════════
                D — APRÈS VOTRE PREMIÈRE RÉCOMPENSE
                ══════════════════════════════════════════════ */}
            <div style={{ borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.022)", padding: isMobile ? "10px 12px" : "12px 15px" }}>
              <SectionLabel text={L("APRÈS VOTRE PREMIÈRE RÉCOMPENSE", "DESPUÉS DE SU PRIMERA RECOMPENSA", "AFTER YOUR FIRST REWARD")} />
              <p style={{ margin: "0 0 8px", ...msp(12), color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
                {L(
                  "Dès votre première Récompense, le Trailing DD EOD prend fin. Votre plancher devient définitivement fixe au solde nominal de votre compte :",
                  "Desde su primera Recompensa, el Trailing DD EOD finaliza. Su piso queda definitivamente fijo en el saldo nominal de su cuenta :",
                  "From your first Reward onward, the Trailing DD EOD ends. Your floor becomes permanently fixed at your account's nominal balance:",
                )}
              </p>
              <FloorGrid rows={[["25K", "$25,000"], ["50K", "$50,000"], ["100K", "$100,000"]]} isMobile={isMobile} />
              <p style={{ margin: "8px 0 5px", ...msp(11), color: "rgba(255,255,255,0.50)", lineHeight: 1.55 }}>
                {L(
                  "Les profits conservés au-dessus de ce plancher constituent votre coussin pour poursuivre vers les Rewards suivantes.",
                  "Los beneficios conservados por encima de este piso constituyen su colchón para continuar hacia las siguientes Recompensas.",
                  "Profits kept above this floor form your cushion for pursuing the next Rewards.",
                )}
              </p>
              <p style={{ margin: 0, ...msp(11), fontWeight: 700, color: "rgba(255,255,255,0.60)", lineHeight: 1.5 }}>
                {L(
                  "Une fois fixé, ce plancher ne remonte plus.",
                  "Una vez fijado, este piso no vuelve a subir.",
                  "Once set, this floor never rises again.",
                )}
              </p>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}
