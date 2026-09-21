"use client";

import { challengeProfitTargetUsd } from "@/lib/program-rules";

import { useState, useEffect, Fragment } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { SIZES_DATA, QUAL_DAY_USD } from "@/lib/rewardsData";
import { useSizeSync } from "@/lib/SizeSyncContext";

const ACCENT = "#D4A843";
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// ── Type ligne de règle ────────────────────────────────────────
type RuleRow = { label: string; value: string; subNote?: string };

export default function RulesV1({ compact = false }: { compact?: boolean }) {
  const { lang } = useLanguage();
  const L = (fr: string, es: string, en: string) =>
    lang === "fr" ? fr : lang === "es" ? es : en;

  const [isMobile, setIsMobile] = useState(false);
  const { selectedSizeIndex, setSelectedSizeIndex } = useSizeSync();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const selectedSize = SIZES_DATA[selectedSizeIndex as 0 | 1 | 2];
  const ddUsd        = selectedSize.bal - selectedSize.floorStart;
  const qualMin      = QUAL_DAY_USD[selectedSizeIndex as 0 | 1 | 2];
  const [showPct, setShowPct] = useState(true);
  const ddPct     = Math.round(ddUsd / selectedSize.bal * 100);  // 4 pour 25K/50K, 3 pour 100K
  const profitUsd = challengeProfitTargetUsd(selectedSize.bal);                     // 2 250 / 4 500 / 9 000

  // ── Rendu unifié label / valeur (identique pour les 2 cartes) ─
  const renderRows = (rows: RuleRow[]) =>
    rows.map((row) => (
      <div key={row.label}>
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "11px 0",
            borderBottom:   "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: ACCENT, fontWeight: 900, fontSize: 13 }}>✓</span>
            <span
              style={{
                fontSize:      12,
                fontWeight:    800,
                color:         "rgba(255,255,255,0.48)",
                letterSpacing: "1.3px",
                textTransform: "uppercase" as const,
              }}
            >
              {row.label}
            </span>
          </div>
          <span style={{ fontSize: row.value.length > 24 ? 12 : 15, fontWeight: 900, color: "#fff", textAlign: "right", maxWidth: "62%", lineHeight: 1.4 }}>{row.value}</span>
        </div>
        {row.subNote && (
          <p
            style={{
              margin:     "3px 0 0 23px",
              fontSize:   11,
              color:      "rgba(255,255,255,0.30)",
              lineHeight: 1.4,
              fontStyle:  "italic" as const,
            }}
          >
            {row.subNote}
          </p>
        )}
      </div>
    ));

  // ── Données des 2 cartes ──────────────────────────────────────
  const cards: {
    level:         string;
    title:         string;
    subtitle:      string;
    badges:        string[];
    rows:          RuleRow[];
  }[] = [
    {
      level:    L("NIVEAU 01", "NIVEL 01", "LEVEL 01"),
      title:    "CHALLENGE",
      subtitle: L("Validez votre Challenge", "Valide su Challenge", "Complete your Challenge"),
      badges: [
        L("1 seule étape", "1 sola etapa", "Just 1 step"),
        L("2 jours minimum", "2 días como mínimo", "2 days minimum"),
        L("Jusqu’à 10 challenges actifs simultanément", "Hasta 10 challenges activos simultáneamente", "Up to 10 challenges active at once"),
      ],
      rows: [
        { label: L("OBJECTIF",    "OBJETIVO",    "TARGET"),      value: showPct ? "+9 %" : fmt(profitUsd) },
        { label: "DD EOD",                                        value: showPct ? ddPct + " %" : fmt(ddUsd) },
        { label: L("CONSISTANCE", "CONSISTENCIA","CONSISTENCY"), value: "50 %" },
        { label: L("DURÉE",       "DURACIÓN",    "DURATION"),    value: L("30 JOURS", "30 DÍAS", "30 DAYS") },
      ],
    },
    {
      level:    L("NIVEAU 02", "NIVEL 02", "LEVEL 02"),
      title:    "TRADER REWARD",
      subtitle: L("Progressez jusqu'à 5 récompenses", "Progrese hasta 5 recompensas", "Progress to 5 rewards"),
      badges: [
        L("Jusqu’à 5 récompenses par compte", "Hasta 5 recompensas por cuenta", "Up to 5 rewards per account"),
        L("90 % pour vous", "90 % para ti", "90% for you"),
        L("Paiement sous 48 h", "Pago en 48 h", "Payment within 48h"),
        L("Jusqu’à 5 comptes Reward actifs", "Hasta 5 cuentas Reward activas", "Up to 5 active Reward accounts"),
      ],
      rows: [
        { label: "DD EOD",                                                          value: showPct ? ddPct + " %" : fmt(ddUsd) },
        { label: L("5 JOURS QUALIFIANTS", "5 DÍAS CALIFICADOS", "5 QUALIFYING DAYS"), value: fmt(qualMin) },
        { label: L("CONSISTANCE",        "CONSISTENCIA",      "CONSISTENCY"),        value: "50 %" },
        { label: L("PAIEMENT",           "PAGO",              "PAYMENT"),            value: L("VIREMENT INSTANTANÉ & CRYPTO", "TRANSFERENCIA INSTANTÁNEA Y CRIPTO", "INSTANT TRANSFER & CRYPTO") },
      ],
    },
  ];

  return (
    <section
      id={compact ? undefined : "rules"}
      style={{
        scrollMarginTop: compact ? undefined : 92,
        padding:         compact ? "0" : "0 24px",
        background:      compact ? "transparent" : "#000000",
      }}
    >
      <style>{`
        .rules-benefits { display:flex; flex-wrap:wrap; align-content:flex-start; gap:8px; list-style:none; padding:0; margin:0 0 20px; min-height:136px; }
        .rules-benefits li { max-width:100%; padding:7px 10px; border-radius:10px; border:1px solid rgba(212,168,67,.28); background:rgba(212,168,67,.075); color:#e3c780; font-size:12px; font-weight:650; line-height:1.45; }
        @media(max-width:899px) { .rules-benefits { min-height:0; } }
      `}</style>
      <div style={{ maxWidth: compact ? "none" : 1500, margin: "0 auto" }}>

        {/* En-tête section — masqué en mode compact (dashboard) */}
        {!compact && (
        <header style={{ maxWidth: isMobile ? 900 : "none", margin: "0 auto", marginBottom: "clamp(38px, 5vw, 62px)", textAlign: "center" }}>
          <div style={{ color: ACCENT, fontSize: 11, fontWeight: 900, letterSpacing: "2.4px", marginBottom: 14 }}>
            {L("LES RÈGLES", "LAS REGLAS", "THE RULES")}
          </div>
          <h2 style={{ color: "#fff", fontSize: "clamp(2.1rem, 4.2vw, 3.5rem)", lineHeight: .98, letterSpacing: "-.045em", margin: 0, fontWeight: 900, whiteSpace: isMobile ? "normal" : "nowrap" }}>
            {L("Deux niveaux. Des règles ", "Dos niveles. Reglas ", "Two levels. Clear ")}
            <span style={{
              background: "linear-gradient(110deg, #B88746 0%, #D6AD63 25%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              {L("claires.", "claras.", "rules.")}
            </span>
          </h2>
          <p style={{ color: "rgba(255,255,255,.58)", fontSize: "clamp(1rem, 1.25vw, 1.22rem)", lineHeight: 1.55, margin: "22px auto 0", maxWidth: 680 }}>
            {L(
              "Validez votre challenge, devenez Trader Reward",
              "Valide su challenge, conviértase en Trader Reward",
              "Complete your challenge, become a Trader Reward",
            )}
          </p>
        </header>
        )}

        {/* Sélecteur 25K / 50K / 100K */}
        <div style={{ marginBottom: "clamp(24px, 3vw, 40px)", display: "flex", justifyContent: "center" }}>
          <div
            role="group"
            aria-label={L("Taille du compte", "Tamaño de la cuenta", "Account size")}
            style={{
              display:    "inline-flex",
              alignItems: "center",
              gap:        4,
              padding:    4,
              borderRadius: 24,
              border:     "1px solid rgba(184,135,70,0.18)",
              background: "rgba(255,255,255,0.025)",
            }}
          >
            {(SIZES_DATA as readonly { label: string }[]).map((size, index) => {
              const selected = selectedSizeIndex === index;
              return (
                <button
                  key={size.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setSelectedSizeIndex(index)}
                  style={{
                    minWidth:      isMobile ? 62 : 72,
                    padding:       isMobile ? "7px 12px" : "7px 16px",
                    borderRadius:  18,
                    border:        selected ? "1px solid rgba(184,135,70,0.52)" : "1px solid transparent",
                    background:    selected ? "rgba(184,135,70,0.16)" : "transparent",
                    color:         selected ? ACCENT : "rgba(255,255,255,0.42)",
                    fontSize:      10,
                    fontWeight:    900,
                    letterSpacing: "1.4px",
                    cursor:        "pointer",
                    fontFamily:    "inherit",
                  }}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggle % / $ */}
        <div style={{ marginBottom: "clamp(16px, 2vw, 24px)", display: "flex", justifyContent: "center" }}>
          <button
            onClick={() => setShowPct(p => !p)}
            aria-label={L(
              `Afficher les règles en ${showPct ? "dollars" : "pourcentages"}`,
              `Mostrar reglas en ${showPct ? "dólares" : "porcentajes"}`,
              `Show rules in ${showPct ? "dollars" : "percentages"}`
            )}
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           4,
              padding:       "4px 9px",
              borderRadius:  100,
              border:        "1px solid rgba(255,255,255,0.12)",
              background:    "rgba(255,255,255,0.045)",
              color:         "#FFFFFF",
              fontSize:      11, fontWeight: 650,
              cursor:        "pointer",
              fontFamily:    "inherit",
              letterSpacing: "0.2px",
              transition:    "all 0.15s ease",
              whiteSpace:    "nowrap",
            }}
          >
            <span style={{ fontWeight: 900, fontSize: 12 }}>%</span>
            <span style={{ fontSize: 10, letterSpacing: "-1px" }}>⇄</span>
            <span style={{ fontWeight: 900, fontSize: 12 }}>$</span>
            <span style={{ fontSize: 10, marginLeft: 2 }}>
              {showPct
                ? L("Voir $","Ver $","View $")
                : L("Voir %","Ver %","View %")}
            </span>
          </button>
        </div>

        {/* Grille des 2 cartes — flex sur mobile, grid sur desktop */}
        <div
          style={{
            display:             isMobile ? "flex" : "grid",
            flexDirection:       isMobile ? "column" : undefined,
            gridTemplateColumns: isMobile ? undefined : "minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr)",
            gap:                 isMobile ? 24 : 18,
          }}
        >
          {cards.map((card, index) => (
            <Fragment key={card.title}>
            {index === 1 && (
              <div aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0, height: "auto", minHeight: 0, overflow: "visible", position: "relative", zIndex: 1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nouvelle-image-parcours.png" alt="" loading="lazy" width={1122} height={1402}
                  style={{ display: "block", width: "100%", maxWidth: isMobile ? 420 : "none", height: "auto", aspectRatio: "1122 / 1402", objectFit: "contain", mixBlendMode: "normal" }} />
              </div>
            )}
            <article
              style={{
                minHeight:  0,
                alignSelf:  isMobile ? "auto" : "stretch",
                padding:    "24px",
                borderRadius: 22,
                background: index === 1
                  ? "linear-gradient(145deg, #0e1013, #080a0c)"
                  : "#0b0e11",
                border:     `1px solid ${index === 1 ? "rgba(184,135,70,.48)" : "rgba(255,255,255,.12)"}`,
                boxShadow:  index === 1 ? "0 18px 60px rgba(184,135,70,.11)" : "none",
              }}
            >
              {/*
                ── En-tête de carte — hauteur commune aux 2 cartes ──────────────
                minHeight: 130px absorbe la différence entre le subtitle à 1 ligne
                ("Validez votre Challenge") et le subtitle à 2 lignes potentielles
                ("Progressez jusqu'à 5 récompenses") à viewport étroit (~900px).
                Le séparateur et la 1ère règle tombent ainsi au même Y dans les 2 cartes.
              */}
              <div style={{ minHeight: isMobile ? 0 : 130 }}>
                <div style={{ color: ACCENT, fontSize: 10, fontWeight: 900, letterSpacing: "2.2px" }}>
                  {card.level}
                </div>
                <h3 style={{ color: "#fff", fontSize: "clamp(1.55rem, 2.2vw, 2.35rem)", margin: "14px 0 7px", fontWeight: 900 }}>
                  {card.title}
                </h3>
                <p style={{ color: "rgba(255,255,255,.52)", fontSize: 14, margin: "0 0 20px" }}>
                  {card.subtitle}
                </p>
              </div>

              <ul className="rules-benefits" aria-label={L("Avantages", "Ventajas", "Benefits")}>
                {card.badges.map((badge) => <li key={badge}>{badge}</li>)}
              </ul>

              {/* Séparateur avant les règles détaillées */}
              <div style={{ height: 1, background: "rgba(255,255,255,.1)", marginBottom: 10 }} />

              {/* Lignes de règles — rendu unifié */}
              {renderRows(card.rows)}

            </article>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
