"use client";
import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const accounts = [
  { size: "$25,000",  id: "25k",  label: "25K",  price2: "€199", price1: "€169", popular: false, reward: "~€1,200" },
  { size: "$50,000",  id: "50k",  label: "50K",  price2: "€299", price1: "€249", popular: false, reward: "~€2,400" },
  { size: "$100,000", id: "100k", label: "100K", price2: "€439", price1: "€429", popular: true,  reward: "~€4,800" },
];

const IcoTarget = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="5.5" stroke="#6b7280" strokeWidth="1.2"/>
    <circle cx="7.5" cy="7.5" r="2.5" stroke="#6b7280" strokeWidth="1.2"/>
    <circle cx="7.5" cy="7.5" r="0.9" fill="#6b7280"/>
  </svg>
);
const IcoDown = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 2.5v10M7.5 12.5l-3-3M7.5 12.5l3-3" stroke="#6b7280" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoShield = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5L2 4v4C2 11 4.8 13 7.5 13.5c2.7-.5 5.5-2.5 5.5-5.5V4L7.5 1.5z" stroke="#6b7280" strokeWidth="1.2" strokeLinejoin="round"/>
  </svg>
);
const IcoClock = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="5.5" stroke="#6b7280" strokeWidth="1.2"/>
    <path d="M7.5 4.5v3.5l2 1.5" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const IcoStar = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 1.5l1.6 3.6 3.9.4-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8-2.8-2.7 3.9-.4z" stroke="#6b7280" strokeWidth="1.1" strokeLinejoin="round"/>
  </svg>
);
const IcoGift = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="5.5" width="12" height="8" rx="1" stroke="#6b7280" strokeWidth="1.2"/>
    <rect x="1.5" y="3" width="12" height="2.5" rx="1" stroke="#6b7280" strokeWidth="1.2"/>
    <path d="M7.5 3v10.5" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M5.5 3C5.5 3 4 1 5.5 1 7 1 7.5 3 7.5 3M9.5 3C9.5 3 11 1 9.5 1 8 1 7.5 3 7.5 3" stroke="#6b7280" strokeWidth="1.1" strokeLinecap="round"/>
  </svg>
);
const IcoDays = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="3" width="12" height="10.5" rx="1.5" stroke="#6b7280" strokeWidth="1.2"/>
    <path d="M5 1.5v3M10 1.5v3M1.5 6.5h12" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

type Row = { icon: React.ReactNode; label: string; value: string; badge?: boolean };

export default function Pricing() {
  const [model, setModel] = useState<"2step" | "1step">("2step");
  const [phase, setPhase] = useState<"phase1" | "phase2">("phase1");
  const [selectedSize, setSelectedSize] = useState(2);
  const [isMobile, setIsMobile] = useState(false);
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 860);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const rows2stepP1: Row[] = [
    { icon: <IcoTarget />, label: L("Objectif de Profit","Objetivo de Profit","Profit Target"),        value: "10%"                                         },
    { icon: <IcoDown />,   label: L("Perte Max Journalière","Pérdida Diaria Máx","Max Daily Loss"),    value: "5%"                                          },
    { icon: <IcoShield />, label: L("Perte Max","Pérdida Máx","Max Loss"),                             value: "10%"                                         },
    { icon: <IcoClock />,  label: L("Période de Trading","Período de Trading","Trading Period"),       value: L("Illimitée","Ilimitada","Unlimited")         },
    { icon: <IcoDays />,   label: L("Jours Min","Días Mín","Min Days"),                                value: L("5 jours","5 días","5 days")                 },
    { icon: <IcoGift />,   label: L("Récompenses","Recompensas","Rewards"),                            value: "80%", badge: true                            },
  ];
  const rows2stepP2: Row[] = [
    { icon: <IcoTarget />, label: L("Objectif de Profit","Objetivo de Profit","Profit Target"),        value: "5%"                                          },
    { icon: <IcoDown />,   label: L("Perte Max Journalière","Pérdida Diaria Máx","Max Daily Loss"),    value: "5%"                                          },
    { icon: <IcoShield />, label: L("Perte Max","Pérdida Máx","Max Loss"),                             value: "10%"                                         },
    { icon: <IcoClock />,  label: L("Période de Trading","Período de Trading","Trading Period"),       value: L("Illimitée","Ilimitada","Unlimited")         },
    { icon: <IcoDays />,   label: L("Jours Min","Días Mín","Min Days"),                                value: L("5 jours","5 días","5 days")                 },
    { icon: <IcoGift />,   label: L("Récompenses","Recompensas","Rewards"),                            value: "80%", badge: true                            },
  ];
  const rows1step: Row[] = [
    { icon: <IcoTarget />, label: L("Objectif de Profit","Objetivo de Profit","Profit Target"),        value: "10%"                                         },
    { icon: <IcoDown />,   label: L("Perte Max Journalière","Pérdida Diaria Máx","Max Daily Loss"),    value: "3%"                                          },
    { icon: <IcoShield />, label: L("Perte Max","Pérdida Máx","Max Loss"),                             value: "10%"                                         },
    { icon: <IcoClock />,  label: L("Période de Trading","Período de Trading","Trading Period"),       value: L("Illimitée","Ilimitada","Unlimited")         },
    { icon: <IcoStar />,   label: L("Règle du Meilleur Jour","Regla Mejor Día","Best Day Rule"),       value: "50%"                                         },
    { icon: <IcoGift />,   label: L("Récompenses","Recompensas","Rewards"),                            value: "90%", badge: true                            },
  ];

  const rows = model === "2step"
    ? (phase === "phase1" ? rows2stepP1 : rows2stepP2)
    : rows1step;

  const getPrice = (acc: typeof accounts[0]) => model === "2step" ? acc.price2 : acc.price1;

  const POP   = "#3B82F6";
  const POP_BG = "rgba(59,130,246,0.06)";
  const NCOLS  = accounts.length;

  /* ── Shared toggles ─────────────────────────────────────────── */
  const ModelToggle = () => (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 12, flexWrap: "nowrap" }}>
      {([
        { id: "2step" as const, icon: "◈", label: L("2 Étapes","2 Pasos","2-Step"), sub: L("Standard","Estándar","Standard") },
        { id: "1step" as const, icon: "◆", label: L("1 Étape","1 Paso","1-Step"),   sub: L("Rapide","Rápido","Fast track")   },
      ]).map(tab => {
        const active = model === tab.id;
        return (
          <button key={tab.id} onClick={() => { setModel(tab.id); setPhase("phase1"); }} style={{
            background: active ? "#fff" : "#111",
            border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10, padding: isMobile ? "8px 14px" : "10px 26px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.2s",
            flex: isMobile ? "1 1 0" : undefined,
          }}>
            <span style={{ fontSize: 16, color: active ? "#000" : "rgba(255,255,255,0.35)" }}>{tab.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: active ? "#000" : "#fff", whiteSpace: "nowrap" }}>{tab.label}</div>
              <div style={{ fontSize: isMobile ? 9 : 10, color: active ? "#555" : "rgba(255,255,255,0.4)", fontWeight: 500, whiteSpace: "nowrap" }}>{tab.sub}</div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const PhaseToggle = () => model === "2step" ? (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
      {([
        { id: "phase1" as const, label: L("Phase 1","Fase 1","Phase 1") },
        { id: "phase2" as const, label: L("Phase 2","Fase 2","Phase 2") },
      ]).map(p => {
        const active = phase === p.id;
        return (
          <button key={p.id} onClick={() => setPhase(p.id)} style={{
            padding: "5px 20px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
            border: active ? `1.5px solid ${POP}` : "1.5px solid rgba(255,255,255,0.1)",
            background: active ? "rgba(59,130,246,0.1)" : "transparent",
            color: active ? POP : "rgba(255,255,255,0.45)",
          }}>{p.label}</button>
        );
      })}
    </div>
  ) : <div style={{ marginBottom: 16 }} />;

  /* ── MOBILE: cards with rules inside ───────────────────────── */
  const MobileCard = () => {
    const acc = accounts[selectedSize];
    return (
      <div style={{ background: "#0d0d0d", border: `1.5px solid ${acc.popular ? POP : "rgba(255,255,255,0.1)"}`, borderRadius: 14, position: "relative", overflow: "visible" }}>
        {acc.popular && (
          <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: POP, color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 14px", borderRadius: 100, letterSpacing: "1.5px", whiteSpace: "nowrap" }}>
            MEILLEURE VALEUR
          </div>
        )}
        {/* Header */}
        <div style={{ padding: "20px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 3 }}>Compte</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>{acc.size}</div>
        </div>
        {/* Rules */}
        <div style={{ padding: "6px 18px" }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {row.icon}
                <span style={{ color: "#9ca3af", fontSize: 12 }}>{row.label}</span>
              </div>
              {row.badge
                ? <span style={{ background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 800, padding: "2px 10px", borderRadius: 20, boxShadow: "0 0 8px rgba(22,163,74,0.3)" }}>{row.value}</span>
                : <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{row.value}</span>
              }
            </div>
          ))}
        </div>
        {/* Récompense moy. */}
        <div style={{ margin: "6px 18px 6px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 6, padding: "5px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#4b5563" }}>{L("Récompense moy.","Recompensa prom.","Avg. reward")}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{acc.reward}</span>
        </div>
        {/* Price + CTA */}
        <div style={{ padding: "8px 18px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 10 }}>{getPrice(acc)}</div>
          <a href={`/checkout?product=${acc.id}-${model}`} style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: "none", letterSpacing: "1px", textTransform: "uppercase", background: acc.popular ? POP : "rgba(255,255,255,0.08)", color: "#fff", border: acc.popular ? "none" : "1px solid rgba(255,255,255,0.12)", boxShadow: acc.popular ? "0 4px 14px rgba(59,130,246,0.3)" : "none" }}>
            {L("Commencez maintenant","Empezar ahora","Get Started")}
          </a>
          <div style={{ textAlign: "center", fontSize: 9, color: "#374151", marginTop: 6 }}>
            {L("Frais unique · Non remboursable","Cargo único · No reembolsable","One-time fee · Non-refundable")}
          </div>
        </div>
      </div>
    );
  };

  /* ── DESKTOP: comparison table ──────────────────────────────── */
  const DesktopTable = () => {
    const GRID = `190px repeat(${NCOLS}, 1fr)`;
    const pc = (isTop: boolean, isBot: boolean): React.CSSProperties => ({
      background: POP_BG,
      borderLeft:  `1.5px solid ${POP}`,
      borderRight: `1.5px solid ${POP}`,
      ...(isTop ? { borderTop: `1.5px solid ${POP}`, borderRadius: "12px 12px 0 0" } : {}),
      ...(isBot ? { borderBottom: `1.5px solid ${POP}`, borderRadius: "0 0 12px 12px" } : {}),
    });

    return (
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: GRID, minWidth: 540 }}>

          {/* HEADER */}
          <div />
          {accounts.map(acc => (
            <div key={`hdr-${acc.id}`} style={{ position: "relative", textAlign: "center", padding: "18px 12px 14px", ...(acc.popular ? pc(true, false) : {}) }}>
              {acc.popular && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: POP, color: "#fff", fontSize: 9, fontWeight: 800, padding: "3px 14px", borderRadius: 100, letterSpacing: "1.5px", whiteSpace: "nowrap" }}>
                  MEILLEURE VALEUR
                </div>
              )}
              <div style={{ fontSize: 9, color: "#4b5563", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 5 }}>Compte</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>{acc.size}</div>
            </div>
          ))}

          {/* RULE ROWS */}
          {rows.map((row, ri) => {
            const isLast = ri === rows.length - 1;
            return (
              <React.Fragment key={`row-${ri}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px 11px 0", borderBottom: !isLast ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ flexShrink: 0 }}>{row.icon}</span>
                  <span style={{ color: "#9ca3af", fontSize: 13, fontWeight: 500 }}>{row.label}</span>
                </div>
                {accounts.map(acc => (
                  <div key={`val-${acc.id}-${ri}`} style={{
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "11px 8px",
                    borderBottom: !isLast ? "1px solid rgba(255,255,255,0.05)" : "none",
                    ...(acc.popular ? { background: POP_BG, borderLeft: `1.5px solid ${POP}`, borderRight: `1.5px solid ${POP}` } : {}),
                  }}>
                    {row.badge
                      ? <span style={{ background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 800, padding: "3px 14px", borderRadius: 20, boxShadow: "0 0 10px rgba(22,163,74,0.3)" }}>{row.value}</span>
                      : <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{row.value}</span>
                    }
                  </div>
                ))}
              </React.Fragment>
            );
          })}

          {/* PRICE ROW */}
          <div style={{ padding: "16px 16px 4px 0", display: "flex", alignItems: "flex-end" }}>
            <span style={{ fontSize: 10, color: "#374151", lineHeight: 1.5 }}>{L("Frais unique\n(non remboursable)","Cargo único\n(no reembolsable)","One-time fee\n(non-refundable)")}</span>
          </div>
          {accounts.map(acc => (
            <div key={`price-${acc.id}`} style={{
              textAlign: "center", padding: "16px 8px 8px",
              ...(acc.popular ? { background: POP_BG, borderLeft: `1.5px solid ${POP}`, borderRight: `1.5px solid ${POP}` } : {}),
            }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: "-1px" }}>{getPrice(acc)}</div>
            </div>
          ))}

          {/* CTA ROW */}
          <div />
          {accounts.map(acc => (
            <div key={`cta-${acc.id}`} style={{ padding: "6px 12px 20px", ...(acc.popular ? pc(false, true) : {}) }}>
              <a href={`/checkout?product=${acc.id}-${model}`} style={{
                display: "block", textAlign: "center", padding: "11px 8px",
                borderRadius: 8, fontSize: 11, fontWeight: 800, letterSpacing: "1px",
                textTransform: "uppercase", textDecoration: "none",
                background: acc.popular ? POP : "rgba(255,255,255,0.07)",
                color: "#fff",
                border: acc.popular ? "none" : "1px solid rgba(255,255,255,0.1)",
                boxShadow: acc.popular ? "0 4px 16px rgba(59,130,246,0.3)" : "none",
              }}>
                {L("Commencez maintenant","Empezar ahora","Get Started")}
              </a>
            </div>
          ))}

        </div>
      </div>
    );
  };

  return (
    <section id="pricing" style={{ padding: isMobile ? "16px 16px 24px" : "24px 20px 40px", backgroundColor: "#000", scrollMarginTop: "0px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: isMobile ? 16 : 24 }}>
          <h2 style={{ fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 6 }}>
            {L("Choisissez votre","Elige Tu","Choose your")} <span style={{ color: POP }}>{L("Challenge","Desafío","Challenge")}</span>
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
            {L("Tradez jusqu'à 200K en compte reward.","Opera hasta $200K en cuenta reward.","Trade up to $200K in reward account.")}
          </p>
        </div>

        <ModelToggle />
        <PhaseToggle />

        {/* MOBILE */}
        {isMobile && (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
              {accounts.map((acc, i) => (
                <button key={acc.id} onClick={() => setSelectedSize(i)} style={{
                  padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  border: selectedSize === i ? "none" : "1px solid rgba(255,255,255,0.15)",
                  background: selectedSize === i ? POP : "#111",
                  color: selectedSize === i ? "#fff" : "rgba(255,255,255,0.6)",
                }}>{acc.label}</button>
              ))}
            </div>
            <MobileCard />
          </>
        )}

        {/* DESKTOP */}
        {!isMobile && <DesktopTable />}

        <div style={{ textAlign: "center", marginTop: isMobile ? 20 : 28 }}>
          <a href="/#how-it-works" style={{
            display: "inline-block", padding: "14px 36px", borderRadius: 8,
            fontSize: 12, fontWeight: 700, letterSpacing: "1.5px",
            textTransform: "uppercase", textDecoration: "none",
            border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)", background: "transparent",
          }}>
            {L("Comment ça marche ?","¿Cómo funciona?","How does it work?")}
          </a>
        </div>

      </div>
    </section>
  );
}
