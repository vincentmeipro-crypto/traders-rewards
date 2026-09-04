"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { SIZES_DATA, QUAL_DAY_USD } from "@/lib/rewardsData";
import { useSizeSync } from "@/lib/SizeSyncContext";

const ACCENT = "#D8A39D";
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// ── Type ligne de règle ────────────────────────────────────────
type RuleRow = { label: string; value: string; subNote?: string };

export default function RulesV1() {
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
  const floorDisplay = selectedSize.bal * 1.04;   // +4 % du capital — affichage uniquement
  const rewardMax    = selectedSize.rewardCaps[0]; // Reward #1 cap pour cette taille

  // ── Rendu unifié label / valeur (identique pour les 3 cartes) ─
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
          <span style={{ fontSize: 15, fontWeight: 900, color: "#fff" }}>{row.value}</span>
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

  // ── Données des 3 cartes ──────────────────────────────────────
  const cards: {
    level:         string;
    title:         string;
    subtitle:      string;
    floorBlock?:   { value: number };   // uniquement NIVEAU 02
    rows:          RuleRow[];
    explainLines?: string[];            // uniquement NIVEAU 02
  }[] = [
    {
      level:    L("NIVEAU 01", "NIVEL 01", "LEVEL 01"),
      title:    "CHALLENGE",
      subtitle: L("Validez votre Challenge", "Valide su Challenge", "Complete your Challenge"),
      rows: [
        { label: L("OBJECTIF",    "OBJETIVO",    "TARGET"),      value: "+6 %" },
        { label: "DD EOD",                                        value: fmt(ddUsd) },
        { label: L("CONSISTANCE", "CONSISTENCIA","CONSISTENCY"), value: "50 %" },
        { label: L("DURÉE",       "DURACIÓN",    "DURATION"),    value: L("2 À 30 JOURS", "2 A 30 DÍAS", "2 TO 30 DAYS") },
      ],
    },
    {
      level:      L("NIVEAU 02", "NIVEL 02", "LEVEL 02"),
      title:      "COMPTE REWARD",
      subtitle:   L("Débloquez votre première récompense", "Desbloquee su primera recompensa", "Unlock your first reward"),
      floorBlock: { value: floorDisplay },
      rows: [
        { label: L("JOURS QUALIFIANTS",  "DÍAS CALIFICADOS",  "QUALIFYING DAYS"),   value: L("5 JOURS", "5 DÍAS", "5 DAYS") },
        { label: L("PROFIT MIN / JOUR",  "PROFIT MÍN / DÍA", "MIN PROFIT / DAY"),  value: fmt(qualMin) },
        { label: L("CONSISTANCE",        "CONSISTENCIA",      "CONSISTENCY"),        value: "50 %" },
        { label: "REWARD MAX",                                                        value: fmt(rewardMax) },
        { label: L("PAIEMENT",           "PAGO",              "PAYMENT"),            value: "48H MAX" },
      ],
      explainLines: [
        L(
          "Une fois le seuil de +4 % atteint, votre stop devient fixe.",
          "Una vez alcanzado el umbral de +4 %, su stop se vuelve fijo.",
          "Once the +4% threshold is reached, your stop becomes fixed.",
        ),
        L(
          "Vos profits au-dessus de ce plancher deviennent disponibles pour vos Rewards.",
          "Sus ganancias por encima de este suelo quedan disponibles para sus Rewards.",
          "Your profits above this floor become available for your Rewards.",
        ),
      ],
    },
    {
      level:    L("NIVEAU 03", "NIVEL 03", "LEVEL 03"),
      title:    "TRADER REWARD",
      subtitle: L("Progressez jusqu'au Payout #5", "Progrese hasta el Payout #5", "Progress to Payout #5"),
      rows: [
        { label: "DD FIXE",                                                          value: fmt(ddUsd) },
        { label: L("PLANCHER FIXE",      "SUELO FIJO",        "FIXED FLOOR"),        value: fmt(floorDisplay) },
        { label: L("JOURS QUALIFIANTS", "DÍAS CALIFICADOS",  "QUALIFYING DAYS"),    value: L("5 JOURS", "5 DÍAS", "5 DAYS") },
        { label: L("PROFIT MIN / JOUR",  "PROFIT MÍN / DÍA", "MIN PROFIT / DAY"),  value: fmt(qualMin) },
        { label: L("CONSISTANCE",        "CONSISTENCIA",      "CONSISTENCY"),        value: "50 %" },
        { label: L("PAIEMENT",           "PAGO",              "PAYMENT"),            value: "48H MAX" },
      ],
    },
  ];

  return (
    <section
      id="rules"
      style={{ scrollMarginTop: 92, padding: "clamp(72px, 8vw, 112px) 24px", background: "#000000" }}
    >
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>

        {/* En-tête section */}
        <header style={{ maxWidth: isMobile ? 900 : "none", margin: "0 auto", marginBottom: "clamp(38px, 5vw, 62px)", textAlign: "center" }}>
          <div style={{ color: ACCENT, fontSize: 11, fontWeight: 900, letterSpacing: "2.4px", marginBottom: 14 }}>
            {L("LES RÈGLES", "LAS REGLAS", "THE RULES")}
          </div>
          <h2 style={{ color: "#fff", fontSize: "clamp(2.1rem, 4.2vw, 3.5rem)", lineHeight: .98, letterSpacing: "-.045em", margin: 0, fontWeight: 900, whiteSpace: isMobile ? "normal" : "nowrap" }}>
            {L("Trois niveaux. Des règles claires.", "Tres niveles. Reglas claras.", "Three levels. Clear rules.")}
          </h2>
          <p style={{ color: "rgba(255,255,255,.58)", fontSize: "clamp(1rem, 1.25vw, 1.22rem)", lineHeight: 1.55, margin: "22px auto 0", maxWidth: 680 }}>
            {L(
              "Le drawdown évolue avec votre parcours : EOD pendant le Challenge, EOD jusqu'au plancher sur le Compte Reward, puis fixe sur le Trader Reward.",
              "El drawdown evoluciona con su recorrido: EOD durante el Challenge, EOD hasta el suelo en la Cuenta Reward y después fijo.",
              "Drawdown evolves with your journey: EOD during the Challenge, EOD until the floor on the Reward Account, then fixed.",
            )}
          </p>
        </header>

        {/* Sélecteur 25K / 50K / 100K */}
        <div style={{ marginBottom: "clamp(24px, 3vw, 40px)" }}>
          <div
            role="group"
            aria-label={L("Taille du compte", "Tamaño de la cuenta", "Account size")}
            style={{
              display:    "inline-flex",
              alignItems: "center",
              gap:        4,
              padding:    4,
              borderRadius: 24,
              border:     "1px solid rgba(183,110,121,0.18)",
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
                    border:        selected ? "1px solid rgba(183,110,121,0.52)" : "1px solid transparent",
                    background:    selected ? "rgba(183,110,121,0.16)" : "transparent",
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

        {/* Grille des 3 cartes */}
        <div
          style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 310px), 1fr))",
            gap:                 18,
          }}
        >
          {cards.map((card, index) => (
            <article
              key={card.title}
              style={{
                minHeight:  370,
                padding:    "clamp(26px, 3vw, 38px)",
                borderRadius: 22,
                background: index === 1
                  ? "linear-gradient(145deg, #0e1013, #080a0c)"
                  : "#0b0e11",
                border:     `1px solid ${index === 1 ? "rgba(183,110,121,.48)" : "rgba(255,255,255,.12)"}`,
                boxShadow:  index === 1 ? "0 18px 60px rgba(183,110,121,.11)" : "none",
              }}
            >
              {/* En-tête de carte */}
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 900, letterSpacing: "2.2px" }}>
                {card.level}
              </div>
              <h3 style={{ color: "#fff", fontSize: "clamp(1.55rem, 2.2vw, 2.35rem)", margin: "14px 0 7px", fontWeight: 900 }}>
                {card.title}
              </h3>
              <p style={{ color: "rgba(255,255,255,.52)", fontSize: 14, margin: "0 0 30px" }}>
                {card.subtitle}
              </p>
              <div style={{ height: 1, background: "rgba(255,255,255,.1)", marginBottom: 10 }} />

              {/* Bloc plancher fixe — NIVEAU 02 uniquement */}
              {card.floorBlock && (
                <div
                  style={{
                    background:   "rgba(255,255,255,0.035)",
                    border:       "1px solid rgba(183,110,121,0.28)",
                    borderRadius: 12,
                    padding:      "16px 18px",
                    marginBottom: 22,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "2px", color: ACCENT, textTransform: "uppercase" as const }}>
                      {L("PLANCHER FIXE", "SUELO FIJO", "FIXED FLOOR")}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: ACCENT, letterSpacing: "1px" }}>+4 %</span>
                  </div>
                  <div style={{ fontSize: "clamp(1.5rem, 3vw, 1.85rem)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>
                    {fmt(card.floorBlock.value)}
                  </div>
                </div>
              )}

              {/* Lignes de règles — rendu unifié */}
              {renderRows(card.rows)}

              {/* Lignes d'explication — NIVEAU 02 uniquement */}
              {card.explainLines && (
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column" as const, gap: 10 }}>
                  {card.explainLines.map((line) => (
                    <p key={line} style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.46)", lineHeight: 1.5 }}>
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
