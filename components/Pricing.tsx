"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

// ─── Promo ────────────────────────────────────────────────────────
const PROMO_ACTIVE = new Date() < new Date("2026-08-16T00:00:00");
const PROMO_CODE   = "TR33";
const PROMO_PCT    = 33;

// ─── Produits — source de vérité frontend (fallback DB) ───────────
const ACCOUNTS = [
  { size: 25000,  id: "25k",  label: "25K",  display: "$25,000",  price2: "€199", price1: "€169", promo2: "€133", promo1: "€113", reward: "~€1,200", badge: "ÉVOLUTION" },
  { size: 50000,  id: "50k",  label: "50K",  display: "$50,000",  price2: "€299", price1: "€249", promo2: "€200", promo1: "€167", reward: "~€2,400", badge: "CONFIRMÉ"  },
  { size: 100000, id: "100k", label: "100K", display: "$100,000", price2: "€439", price1: "€429", promo2: "€294", promo1: "€287", reward: "~€4,800", badge: "EXPERT"    },
  { size: 200000, id: "200k", label: "200K", display: "$200,000", price2: "€799", price1: "€749", promo2: "€535", promo1: "€502", reward: "~€9,600", badge: "PRESTIGE"  },
];

type Acc = typeof ACCOUNTS[0];
type Row = { label: string; value: string; pct?: number; isPhaseHeader?: boolean };

function fmtAmt(pct: number, size: number): string {
  return "$" + Math.round(Math.abs(pct) * size).toLocaleString("en-US");
}

export default function Pricing() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  const [model,        setModel]        = useState<"2step" | "1step">("2step");
  const [selIdx,       setSelIdx]       = useState(2);           // 100k par défaut
  const [showPct,      setShowPct]      = useState(true);
  const [showSteps,    setShowSteps]    = useState(false);
  const [isMobile,     setIsMobile]     = useState(false);
  const [isShortScreen,setIsShortScreen]= useState(false);       // ≥900px & viewport-height < 820px
  const [hovIdx,       setHovIdx]       = useState<number | null>(null);
  const [dbPrices,     setDbPrices]     = useState<Record<string, number>>({});

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(w < 900);
      setIsShortScreen(w >= 900 && h < 820);   // 1366×768, 1280×800, etc.
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then((data: Array<{ slug: string; effective_price_cents: number }>) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, number> = {};
        for (const p of data) if (p.slug && p.effective_price_cents) map[p.slug] = p.effective_price_cents;
        setDbPrices(map);
      })
      .catch(() => {});
  }, []);

  // ─── Prix (DB first, fallback hardcodé) — AUCUNE MODIFICATION ────
  const getPrice = (acc: Acc): string => {
    const c = dbPrices[`${acc.id}-${model}`];
    if (c) return `€${Math.round(c / 100)}`;
    return model === "2step" ? acc.price2 : acc.price1;
  };
  const getPromoPrice = (acc: Acc): string => {
    const c = dbPrices[`${acc.id}-${model}`];
    if (c) return `€${Math.round(c * (100 - PROMO_PCT) / 100 / 100)}`;
    return model === "2step" ? acc.promo2 : acc.promo1;
  };

  // ─── Lignes de règles — AUCUNE MODIFICATION ───────────────────────
  const buildRows = (): Row[] => {
    if (model === "1step") return [
      { label: L("Objectif profit","Objetivo profit","Profit target"),         value: "10%",  pct: 0.10 },
      { label: L("Perte journalière","Pérdida diaria","Daily loss"),           value: "3%",   pct: 0.03 },
      { label: L("Perte totale","Pérdida total","Total loss"),                 value: "10%",  pct: 0.10 },
      { label: L("Règle best day","Regla best day","Best day rule"),           value: "≤ 50%" },
      { label: L("Jours min","Días mín","Min days"),                           value: L("5 jours","5 días","5 days") },
      { label: L("Limite de temps","Límite tiempo","Time limit"),              value: L("Illimité","Ilimitado","Unlimited") },
      { label: L("Partage profits","Reparto profits","Profit split"),          value: "90%" },
      { label: L("Max cumulé","Máx acumulado","Max cumulated"),               value: "$200K" },
    ];
    if (!showSteps) return [
      { label: L("Étape 1 — Objectif","Fase 1 — Objetivo","Phase 1 — Target"), value: "10%", pct: 0.10 },
      { label: L("Étape 2 — Objectif","Fase 2 — Objetivo","Phase 2 — Target"), value: "5%",  pct: 0.05 },
      { label: L("Perte journalière","Pérdida diaria","Daily loss"),            value: "5%",  pct: 0.05 },
      { label: L("Perte totale","Pérdida total","Total loss"),                  value: "10%", pct: 0.10 },
      { label: L("Jours min","Días mín","Min days"),                            value: L("5 jours","5 días","5 days") },
      { label: L("Limite de temps","Límite tiempo","Time limit"),               value: L("Illimité","Ilimitado","Unlimited") },
      { label: L("Partage profits","Reparto profits","Profit split"),           value: "80%" },
    ];
    return [
      { label: L("ÉTAPE 1","FASE 1","PHASE 1"),   value: "", isPhaseHeader: true },
      { label: L("Objectif profit","Objetivo profit","Profit target"),         value: "10%", pct: 0.10 },
      { label: L("ÉTAPE 2","FASE 2","PHASE 2"),   value: "", isPhaseHeader: true },
      { label: L("Objectif profit","Objetivo profit","Profit target"),         value: "5%",  pct: 0.05 },
      { label: L("COMMUN","COMÚN","COMMON"),       value: "", isPhaseHeader: true },
      { label: L("Perte journalière","Pérdida diaria","Daily loss"),           value: "5%",  pct: 0.05 },
      { label: L("Perte totale","Pérdida total","Total loss"),                 value: "10%", pct: 0.10 },
      { label: L("Jours min","Días mín","Min days"),                           value: L("5 jours","5 días","5 days") },
      { label: L("Limite de temps","Límite tiempo","Time limit"),              value: L("Illimité","Ilimitado","Unlimited") },
      { label: L("Partage profits","Reparto profits","Profit split"),          value: "80%" },
    ];
  };

  const rows = buildRows();

  const fmtRow = (row: Row, accSize: number): string => {
    if (row.isPhaseHeader || !row.pct || showPct) return row.value;
    return fmtAmt(row.pct, accSize);
  };

  // ─── Rendu d'une carte ─────────────────────────────────────────────
  // compact = mobile    |  !compact + isShortScreen = laptop compact
  // !compact + !isShortScreen = large desktop normal
  const renderCard = (acc: Acc, i: number, compact: boolean) => {
    const isActive  = selIdx === i;
    const isHovered = hovIdx === i && !isActive;
    const price      = getPrice(acc);
    const promoPrice = getPromoPrice(acc);
    const slug       = `${acc.id}-${model}`;

    // Helper: pick value by display context
    // c = compact/mobile | s = desktop short | n = desktop normal
    const V = <T,>(c: T, s: T, n: T): T =>
      compact ? c : isShortScreen ? s : n;

    return (
      <div
        key={acc.id}
        onClick={() => setSelIdx(i)}
        onMouseEnter={() => !compact && setHovIdx(i)}
        onMouseLeave={() => !compact && setHovIdx(null)}
        style={{
          position:   "relative",
          background: isActive
            ? "linear-gradient(155deg, #181818 0%, #131313 100%)"
            : "linear-gradient(155deg, #151515 0%, #101010 100%)",
          border: `1px solid ${
            isActive  ? "rgba(105,197,253,0.75)" :
            isHovered ? "rgba(105,197,253,0.28)"  :
                        "rgba(255,255,255,0.10)"
          }`,
          borderRadius: 20,
          overflow:     "visible",
          cursor:       compact ? "default" : "pointer",
          transition:   "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
          transform:    isActive
            ? "translateY(-6px)"
            : isHovered ? "translateY(-4px)" : "translateY(0)",
          boxShadow:    isActive
            ? "0 34px 90px rgba(0,0,0,0.88), 0 0 38px rgba(105,197,253,0.22), 0 12px 30px rgba(0,0,0,0.55)"
            : isHovered
              ? "0 32px 80px rgba(0,0,0,0.82), 0 0 20px rgba(105,197,253,0.10), 0 10px 26px rgba(0,0,0,0.50)"
              : "0 28px 70px rgba(0,0,0,0.78), 0 10px 28px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.03)",
        }}
      >
        {/* Halo interne — carte active */}
        {isActive && (
          <div aria-hidden="true" style={{
            position: "absolute", inset: 0, borderRadius: 20, pointerEvents: "none",
            background: "radial-gradient(circle at 50% 0%, rgba(105,197,253,0.14), transparent 55%)",
          }} />
        )}

        {/* Badge */}
        <div style={{
          position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
          background: "#69C5FD", color: "#000",
          fontSize: 8, fontWeight: 800, padding: "3px 14px",
          borderRadius: 100, letterSpacing: "1.8px", whiteSpace: "nowrap",
          boxShadow: "0 3px 14px rgba(105,197,253,0.32)",
        }}>
          {acc.badge}
        </div>

        {/* ── En-tête : taille de compte ── */}
        <div style={{
          padding: V("18px 18px 10px", "12px 18px 8px", "16px 20px 10px"),
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700,
            color: "rgba(255,255,255,0.32)",
            letterSpacing: "2.8px", textTransform: "uppercase",
            marginBottom: V(4, 4, 5),
          }}>
            {L("Compte","Cuenta","Account")}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: V(10, 6, 8), flexWrap: "wrap" }}>
            <span style={{
              fontSize: V(30, 23, 26), fontWeight: 900, color: "#FFFFFF",
              letterSpacing: "-2px", lineHeight: 1,
            }}>
              {acc.label}
            </span>
            <span style={{ fontSize: V(11, 9, 10), color: "rgba(255,255,255,0.28)", fontWeight: 500 }}>
              {acc.display}
            </span>
          </div>
        </div>

        {/* ── Prix + CTA ── */}
        <div style={{
          padding: V("10px 18px 8px", "8px 18px 8px", "10px 20px 10px"),
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          {PROMO_ACTIVE ? (
            <div style={{ marginBottom: V(6, 6, 8) }}>
              <div style={{
                fontSize: V(13, 11, 12), fontWeight: 700,
                color: "rgba(255,255,255,0.32)",
                textDecoration: "line-through",
                textDecorationColor: "#ef4444",
                textDecorationThickness: 2,
                marginBottom: 3,
              }}>{price}</div>
              <div style={{
                fontSize: V(24, 20, 22), fontWeight: 900,
                color: "#f97316", letterSpacing: "-1px",
                textShadow: "0 0 20px rgba(249,115,22,0.38)",
              }}>{promoPrice}</div>
            </div>
          ) : (
            <div style={{
              fontSize: V(24, 20, 22), fontWeight: 900,
              color: "#FFFFFF", letterSpacing: "-1px",
              marginBottom: V(6, 6, 8),
            }}>{price}</div>
          )}

          <a
            href={`/checkout?product=${slug}`}
            onClick={e => e.stopPropagation()}
            className="ch-cta"
            style={{
              display: "block", textAlign: "center",
              padding: V("11px 14px", "8px 12px", "10px 14px"),
              borderRadius: 10, fontSize: V(11, 10, 11), fontWeight: 800,
              letterSpacing: "1.5px", textTransform: "uppercase",
              textDecoration: "none",
              background: "#69C5FD", color: "#000000",
              boxShadow: "0 10px 26px rgba(105,197,253,0.20)",
              transition: "filter 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease",
            }}
          >
            {L("Commencer maintenant","Empezar","Get Started")}
          </a>
          <div style={{
            textAlign: "center", fontSize: 9,
            color: "rgba(255,255,255,0.22)",
            marginTop: V(3, 3, 4), fontWeight: 500,
          }}>
            {L("Frais unique · non remboursable","Cargo único","One-time fee")}
          </div>
        </div>

        {/* ── Règles ── */}
        <div style={{ padding: V("10px 18px 10px", "6px 18px 8px", "8px 20px 10px") }}>
          {rows.map((row, ri) => {
            if (row.isPhaseHeader) {
              return (
                <div key={`ph-${ri}`} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: ri === 0
                    ? V("3px 0 3px", "4px 0 4px", "6px 0 6px")
                    : V("6px 0 3px", "8px 0 4px", "12px 0 6px"),
                }}>
                  <div style={{ height: 1, flex: 1, background: "rgba(105,197,253,0.18)" }} />
                  <span style={{
                    fontSize: 8, fontWeight: 900, color: "#69C5FD",
                    letterSpacing: "2.8px", textTransform: "uppercase",
                  }}>{row.label}</span>
                  <div style={{ height: 1, flex: 1, background: "rgba(105,197,253,0.18)" }} />
                </div>
              );
            }
            const nextIsHeader = rows[ri + 1]?.isPhaseHeader;
            return (
              <div key={ri} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: V("5px 0", "3px 0", "4px 0"),
                borderBottom: (ri < rows.length - 1 && !nextIsHeader)
                  ? "1px solid rgba(255,255,255,0.055)" : "none",
              }}>
                <span style={{
                  color: "rgba(255,255,255,0.48)",
                  fontSize: V(12, 10, 10), fontWeight: 500,
                }}>{row.label}</span>
                <span style={{
                  color: "#FFFFFF",
                  fontSize: V(12, 10, 10), fontWeight: 700,
                  paddingLeft: 8,
                }}>{fmtRow(row, acc.size)}</span>
              </div>
            );
          })}
        </div>

        {/* ── Récompense moyenne ── */}
        <div style={{
          margin: V("0 18px 10px", "0 18px 10px", "0 20px 12px"),
          background: "rgba(105,197,253,0.055)",
          border: "1px solid rgba(105,197,253,0.14)",
          borderRadius: 10,
          padding: V("6px 12px", "5px 10px", "7px 12px"),
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: V(10, 9, 10), color: "rgba(255,255,255,0.40)", fontWeight: 500 }}>
            {L("Récompense moy.","Recompensa prom.","Avg. reward")}
          </span>
          <span style={{ fontSize: V(11, 10, 11), fontWeight: 800, color: "#69C5FD" }}>
            {acc.reward}
          </span>
        </div>
      </div>
    );
  };

  // ─── Rendu principal ──────────────────────────────────────────────
  return (
    <section
      id="pricing"
      style={{
        // Mobile : spacieux | Short desktop : compact | Large desktop : équilibré
        padding: isMobile
          ? "52px 16px 60px"
          : isShortScreen
            ? "24px 24px 16px"
            : "42px 24px 24px",
        backgroundColor: "#000000",
        scrollMarginTop: "calc(72px + var(--promo-banner-height, 0px))",
        position:        "relative",
        overflowX:       "hidden",
      }}
    >
      <style>{`
        .ch-cta:hover {
          filter: brightness(1.1);
          transform: translateY(-1px) !important;
          box-shadow: 0 14px 34px rgba(105,197,253,0.34) !important;
        }
        .ch-tog {
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          background: #121212;
          border: 1px solid rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.48);
          font-size: 11px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 10px;
          transition: all 0.16s ease;
          letter-spacing: 0.3px;
          white-space: nowrap;
          font-family: inherit;
        }
        .ch-tog:hover {
          color: #fff;
          background: #1a1a1a;
          border-color: rgba(255,255,255,0.18);
        }
        .ch-tog.on {
          color: #69C5FD;
          border-color: rgba(105,197,253,0.35);
          background: rgba(105,197,253,0.08);
        }
        .ch-how:hover {
          border-color: rgba(255,255,255,0.50) !important;
          color: #fff !important;
        }
        @media (max-width: 899px) {
          .ch-tog {
            font-size: 13px;
            padding: 12px 20px;
            border-radius: 12px;
            border-color: rgba(255,255,255,0.10);
          }
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* ── Titre ── */}
        <div style={{
          textAlign: "center",
          marginBottom: isMobile ? 28 : isShortScreen ? 6 : 8,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: "#69C5FD",
            letterSpacing: "3.5px", textTransform: "uppercase",
            marginBottom: isMobile ? 12 : isShortScreen ? 6 : 6,
          }}>
            {L("PROGRAMME ÉDUCATIF","PROGRAMA EDUCATIVO","EDUCATIONAL PROGRAM")}
          </div>
          <h2 style={{
            fontSize: isMobile
              ? "clamp(2rem,8vw,3rem)"
              : isShortScreen
                ? "clamp(2.2rem,3.5vw,3.2rem)"
                : "clamp(3rem,5vw,5.5rem)",
            fontWeight: 900, color: "#FFFFFF", letterSpacing: "-1.5px",
            lineHeight: 1.05, margin: "0 0 4px",
          }}>
            {L("Choisissez votre","Elige tu","Choose your")}{" "}
            <span style={{ color: "#69C5FD" }}>
              {L("Challenge","Desafío","Challenge")}
            </span>
          </h2>
          <p style={{
            fontSize: isMobile ? 12 : isShortScreen ? 11 : 13,
            color: "rgba(255,255,255,0.38)", fontWeight: 500, margin: 0,
          }}>
            {L(
              "Tradez jusqu'à $200K en compte récompensé.",
              "Opera hasta $200K en cuenta recompensada.",
              "Trade up to $200K in a rewarded account."
            )}
          </p>
        </div>

        {/* ── Badge promo ── */}
        {PROMO_ACTIVE && (
          <div style={{
            display: "flex", justifyContent: "center",
            marginBottom: isMobile ? 22 : isShortScreen ? 6 : 10,
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center",
              gap: isMobile ? 8 : isShortScreen ? 10 : 12,
              background: "rgba(249,115,22,0.07)",
              border: "1px solid rgba(249,115,22,0.26)",
              borderRadius: 100,
              padding: isMobile ? "7px 18px" : isShortScreen ? "5px 16px" : "7px 22px",
              boxShadow: "0 0 28px rgba(249,115,22,0.07)",
            }}>
              <span style={{
                fontSize: isMobile ? 20 : isShortScreen ? 18 : 22,
                fontWeight: 900, color: "#f97316",
                letterSpacing: "-0.5px", textShadow: "0 0 16px rgba(249,115,22,0.55)",
              }}>-{PROMO_PCT}%</span>
              <span style={{ width: 1, height: 16, background: "rgba(249,115,22,0.24)" }} />
              <span style={{
                fontSize: isMobile ? 11 : isShortScreen ? 10 : 11,
                fontWeight: 700, color: "rgba(255,255,255,0.60)", letterSpacing: "0.5px",
              }}>
                {L("Code","Código","Code")}{" "}
                <span style={{ color: "#f97316", fontWeight: 900, letterSpacing: "1.5px" }}>{PROMO_CODE}</span>
              </span>
              <span style={{ fontSize: isMobile ? 9 : 9, color: "rgba(255,255,255,0.35)" }}>
                · {L("jusqu'au 15 août","hasta el 15 ago","until Aug 15")}
              </span>
            </div>
          </div>
        )}

        {/* ── Sélecteur de modèle ── */}
        <div style={{
          display: "flex", justifyContent: "center",
          marginBottom: isMobile ? 18 : isShortScreen ? 7 : 12,
        }}>
          <div
            role="tablist"
            aria-label={L("Modèle de challenge","Modelo de desafío","Challenge model")}
            style={{
              display: "inline-flex",
              background: "#0e0e0e",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: 4, gap: 4,
              width: isMobile ? "100%" : undefined,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            {([
              { id: "2step" as const, label: L("2 ÉTAPES","2 PASOS","2 STEP"),   sub: L("Challenge Trader","Desafío Trader","Trader Challenge") },
              { id: "1step" as const, label: L("1 ÉTAPE","1 PASO","1 STEP"),     sub: L("Challenge Trader","Desafío Trader","Trader Challenge") },
            ]).map(tab => {
              const on = model === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => { setModel(tab.id); setSelIdx(2); setShowSteps(false); }}
                  style={{
                    background:   on ? "#69C5FD" : "transparent",
                    color:        on ? "#000000" : "rgba(255,255,255,0.46)",
                    border:       "none",
                    borderRadius: 12,
                    // Mobile: pleine largeur | Short: padding réduit | Normal: large
                    padding: isMobile
                      ? "12px 0"
                      : isShortScreen
                        ? "8px 40px"
                        : "10px 52px",
                    cursor:     "pointer",
                    transition: "all 0.2s ease",
                    textAlign:  "center",
                    flex:       isMobile ? "1 1 0" : undefined,
                    boxShadow:  on ? "0 4px 20px rgba(105,197,253,0.28)" : "none",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{
                    fontSize: isMobile ? 12 : isShortScreen ? 12 : 13,
                    fontWeight: 900, letterSpacing: "1.2px", whiteSpace: "nowrap",
                  }}>{tab.label}</div>
                  <div style={{
                    fontSize: isMobile ? 9 : isShortScreen ? 9 : 10,
                    fontWeight: 500, marginTop: 1, opacity: 0.65, whiteSpace: "nowrap",
                  }}>{tab.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div style={{
          display: "flex", justifyContent: "center", alignItems: "center",
          gap: isMobile ? 12 : 6,
          marginBottom: isMobile ? 22 : isShortScreen ? 10 : 18,
          flexWrap: "wrap",
        }}>
          <button
            className={`ch-tog${!showPct ? " on" : ""}`}
            onClick={() => setShowPct(v => !v)}
            aria-label={L(
              `Afficher en ${showPct ? "dollars" : "pourcentages"}`,
              `Mostrar en ${showPct ? "dólares" : "porcentajes"}`,
              `Show as ${showPct ? "dollars" : "percentages"}`
            )}
          >
            <span style={{ fontWeight: 900, fontSize: 14, opacity: showPct ? 1 : 0.5 }}>%</span>
            <span style={{ opacity: 0.30, fontSize: 10, letterSpacing: "-1px" }}>⇄</span>
            <span style={{ fontWeight: 900, fontSize: 14, opacity: !showPct ? 1 : 0.5 }}>$</span>
          </button>

          {!isMobile && <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.07)" }} />}

          <button
            className={`ch-tog${showSteps ? " on" : ""}`}
            onClick={() => setShowSteps(v => !v)}
            aria-label={L("Afficher les étapes","Mostrar los pasos","Show steps")}
            aria-pressed={showSteps}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {showSteps ? (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </>
              ) : (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </>
              )}
            </svg>
            {L("Afficher les étapes","Ver los pasos","Show steps")}
          </button>
        </div>

        {/* ══════════════════════════════
            MOBILE : boutons + carte unique
        ══════════════════════════════ */}
        {isMobile && (
          <>
            <div
              role="group"
              aria-label={L("Taille du compte","Tamaño de cuenta","Account size")}
              style={{ display: "flex", gap: 8, marginBottom: 20 }}
            >
              {ACCOUNTS.map((acc, i) => {
                const on = selIdx === i;
                return (
                  <button
                    key={acc.id}
                    onClick={() => setSelIdx(i)}
                    style={{
                      flex: "1 1 0", padding: "13px 0",
                      borderRadius: 28,
                      border: on ? "none" : "1px solid rgba(255,255,255,0.10)",
                      background: on ? "#69C5FD" : "#171717",
                      color: on ? "#000000" : "rgba(255,255,255,0.52)",
                      fontSize: 14, fontWeight: 800,
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.18s ease",
                      boxShadow: on ? "0 6px 18px rgba(105,197,253,0.30)" : "0 4px 14px rgba(0,0,0,0.40)",
                    }}
                  >
                    {acc.label}
                  </button>
                );
              })}
            </div>
            <div style={{ width: "calc(100% - 40px)", maxWidth: 390, marginInline: "auto" }}>
              {renderCard(ACCOUNTS[selIdx], selIdx, true)}
            </div>
          </>
        )}

        {/* ══════════════════════════════
            DESKTOP : 4 cartes flottantes
        ══════════════════════════════ */}
        {!isMobile && (
          <div style={{
            display: "flex",
            gap: isShortScreen ? 12 : 14,
            justifyContent: "center",
            alignItems: "flex-start",
            padding: isShortScreen ? "8px 0 14px" : "10px 0 18px",
          }}>
            {ACCOUNTS.map((acc, i) => (
              <div key={acc.id} style={{ flex: "1 1 0", minWidth: 0, maxWidth: 295 }}>
                {renderCard(acc, i, false)}
              </div>
            ))}
          </div>
        )}

        {/* ── Lien Comment ça marche ── */}
        <div style={{
          textAlign: "center",
          marginTop: isMobile ? 28 : isShortScreen ? 14 : 22,
        }}>
          <a
            href="/#how-it-works"
            className="ch-how"
            style={{
              display: "inline-block",
              padding: isShortScreen ? "10px 40px" : "13px 48px",
              borderRadius: 10,
              fontSize: 11, fontWeight: 700, letterSpacing: "1.5px",
              textTransform: "uppercase", textDecoration: "none",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.16)",
              color: "rgba(255,255,255,0.60)",
              transition: "all 0.2s ease",
            }}
          >
            {L("Comment ça marche ?","¿Cómo funciona?","How does it work?")}
          </a>
        </div>

      </div>
    </section>
  );
}
