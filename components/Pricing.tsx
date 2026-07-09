"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const PROMO_CODE = "TRD50";
const PROMO_PCT  = 50;

const accounts = [
  { size: "$25,000",  id: "25k",  label: "25K",  price2: "€199", price1: "€169", promo2: "€99",  promo1: "€84",  popular: false, premium: false, confirmed: false, beginner: false, evolution: true,  reward: "~€1,200" },
  { size: "$50,000",  id: "50k",  label: "50K",  price2: "€299", price1: "€249", promo2: "€149", promo1: "€124", popular: false, premium: false, confirmed: true,  beginner: false, evolution: false, reward: "~€2,400" },
  { size: "$100,000", id: "100k", label: "100K", price2: "€439", price1: "€429", promo2: "€219", promo1: "€214", popular: true,  premium: false, confirmed: false, beginner: false, evolution: false, reward: "~€4,800" },
];

export default function Pricing() {
  const [model, setModel] = useState<"2step" | "1step" | "instant">("2step");
  const [selectedSize, setSelectedSize] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const { T, lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  type Row = { label: string; value: string; highlight?: boolean; pct?: number };

  const rows2step: Row[] = [
    { label: L("Étape 1","Fase 1","Phase 1"),                 value: "10%",   pct: 0.10  },
    { label: L("Étape 2","Fase 2","Phase 2"),                 value: "5%",    pct: 0.05  },
    { label: L("Perte journalière","Pérdida diaria","Max daily loss"), value: "5%",  pct: -0.05 },
    { label: L("Perte totale","Pérdida total","Max total loss"),       value: "10%", pct: -0.10 },
    { label: L("Jours min","Días mín","Min days"),             value: L("5 jours","5 días","5 days") },
    { label: L("Limite de temps","Límite tiempo","Time limit"),value: L("Illimité","Ilimitado","Unlimited") },
    { label: L("Partage profits","Reparto profits","Profit split"), value: "80%" },
  ];

  const rows1step: Row[] = [
    { label: L("Objectif profit","Objetivo profit","Profit target"),   value: "8%",     pct: 0.08  },
    { label: L("Perte journalière","Pérdida diaria","Max daily loss"), value: "3%",     pct: -0.03 },
    { label: L("Perte totale","Pérdida total","Total loss"),           value: "8% EOD", pct: -0.08 },
    { label: L("Règle meilleur jour","Regla mejor día","Best day rule"), value: "≤ 50%" },
    { label: L("Jours min","Días mín","Min days"),             value: L("5 jours","5 días","5 days") },
    { label: L("Limite de temps","Límite tiempo","Time limit"),value: L("Illimité","Ilimitado","Unlimited") },
    { label: L("Partage profits","Reparto profits","Profit split"), value: "90%" },
    { label: L("Max cumulé","Máx acumulado","Max cumulated"),  value: "$200K" },
  ];

  const rowsInstant: Row[] = [
    { label: L("Objectif profit","Objetivo profit","Profit target"),   value: L("Aucun","Ninguno","None") },
    { label: L("Perte journalière","Pérdida diaria","Max daily loss"), value: "3% EOD", pct: -0.03 },
    { label: L("Perte totale","Pérdida total","Max total loss"),       value: "8% EOD", pct: -0.08 },
    { label: L("Trading news","Trading noticias","News trading"),      value: L("±5 min interdit","±5 min prohibido","±5 min banned") },
    { label: L("Jours min","Días mín","Min days"),             value: L("15 jours","15 días","15 days") },
    { label: L("Risque par trade","Riesgo por trade","Risk per trade"), value: "≤ 1.5%" },
    { label: "Stop Loss",                                              value: L("Obligatoire < 1min","Obligatorio < 1min","Required < 1min") },
    { label: L("Partage profits","Reparto profits","Profit split"),    value: "90%" },
    { label: L("Compte reward","Cuenta reward","Reward account"),      value: L("Immédiat ✓","Inmediato ✓","Instant ✓"), highlight: true },
  ];

  const rows = model === "2step" ? rows2step : model === "1step" ? rows1step : rowsInstant;
  const sizeMap: Record<string, number> = { "$200,000": 200000, "$100,000": 100000, "$50,000": 50000, "$25,000": 25000, "$10,000": 10000 };

  const displayAccounts = model === "instant"
    ? [{ size: "$50,000", id: "50k-instant", label: "50K", price2: "€1,300", price1: "€1,300", promo2: "€1,300", promo1: "€1,300", popular: false, premium: false, confirmed: false, beginner: false, evolution: false, reward: "~€2,250" }]
    : accounts;

  const currentAcc = displayAccounts[Math.min(selectedSize, displayAccounts.length - 1)];

  const PriceCard = ({ acc, compact }: { acc: typeof displayAccounts[0]; compact: boolean }) => {
    const price      = model === "2step" ? acc.price2 : acc.price1;
    const promoPrice = model === "2step" ? acc.promo2 : model === "1step" ? acc.promo1 : acc.price1;
    return (
      <div style={{
        background: "#111111",
        border: acc.popular ? "1.5px solid #16a34a" : acc.premium ? "1.5px solid #7c3aed" : acc.confirmed ? "1.5px solid #3B82F6" : acc.evolution ? "1.5px solid #f97316" : acc.beginner ? "1.5px solid #6b7280" : "1.5px solid rgba(255,255,255,0.2)",
        borderRadius: 14,
        overflow: "hidden",
        position: "relative",
      }}>
        {(acc.popular || acc.premium || acc.confirmed || acc.beginner || acc.evolution) && (
          <div style={{
            position: "absolute", top: 0, right: 0,
            background: acc.popular ? "#16a34a" : acc.premium ? "#7c3aed" : acc.confirmed ? "#3B82F6" : acc.evolution ? "#f97316" : "#6b7280",
            color: "#FFFFFF",
            fontSize: 9, fontWeight: 800,
            padding: "4px 12px",
            borderRadius: "0 14px 0 8px",
            letterSpacing: "1px",
          }}>
            {acc.popular ? "EXPERT" : acc.premium ? "✦ PREMIUM" : acc.confirmed ? "CONFIRMÉ" : acc.evolution ? "ÉVOLUTION" : "START"}
          </div>
        )}

        {/* Header */}
        <div style={{ padding: compact ? "16px 16px 12px" : "12px 12px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>
            {T.pricing.account}
          </div>
          <div style={{ fontSize: compact ? 32 : 20, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px" }}>
            {acc.size}
          </div>
        </div>

        {/* Prix + CTA */}
        <div style={{ padding: compact ? "14px 16px" : "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {model === "instant" ? (
            <div style={{ marginBottom: 12, textAlign: "center" }}>
              <div style={{ fontSize: compact ? 28 : 22, fontWeight: 800, color: "#FFFFFF" }}>€1,300</div>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{L("Compte reward direct","Cuenta reward directa","Direct reward account")}</div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 12, color: "#6b7280", textDecoration: "line-through" }}>{price}</span>
                <span style={{ marginLeft: 8, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>−{PROMO_PCT}%</span>
              </div>
              <div style={{ fontSize: compact ? 24 : 18, fontWeight: 800, color: "#FFFFFF" }}>{promoPrice}</div>
            </div>
          )}
          <a href={model === "instant" ? `/checkout?product=50k-instant` : `/checkout?product=${acc.id}-${model}`} style={{
            display: "block", textAlign: "center",
            padding: compact ? "13px" : "9px",
            borderRadius: 8,
            fontSize: compact ? 13 : 11, fontWeight: 800,
            textDecoration: "none", letterSpacing: "1px", textTransform: "uppercase",
            background: "#3B82F6",
            color: "#FFFFFF",
          }}>
            {L("Commencer maintenant","Empezar","Get Started")}
          </a>
          <div style={{ textAlign: "center", fontSize: 10, color: "#6b7280", marginTop: 8 }}>
            {L("Frais unique (non remboursable)","Cargo único (no reembolsable)","One-time fee (non-refundable)")}
          </div>
        </div>

        {/* Rules */}
        <div style={{ padding: compact ? "8px 16px 12px" : "6px 12px 8px" }}>
          {rows.map((row, i) => {
            const accountNum = sizeMap[acc.size] ?? 0;
            const usdAmt = row.pct != null ? Math.round(accountNum * Math.abs(row.pct)) : null;
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: compact ? "7px 0" : "4px 0",
                borderBottom: i < rows.length - 1 ? "1px dotted rgba(255,255,255,0.08)" : "none",
              }}>
                <span style={{ color: "#9CA3AF", fontSize: compact ? 12 : 10, fontWeight: 500 }}>{row.label}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "#FFFFFF", fontSize: compact ? 12 : 10, fontWeight: 700 }}>{row.value}</span>
                  {usdAmt != null && <div style={{ color: "#6b7280", fontSize: 9 }}>{row.pct! < 0 ? "-" : "+"}${usdAmt.toLocaleString()}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Récompense moy. */}
        <div style={{
          margin: compact ? "0 16px 16px" : "0 12px 10px",
          background: "rgba(59, 130, 246,0.06)",
          border: "1px solid rgba(59, 130, 246,0.2)",
          borderRadius: 6, padding: "5px 10px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 11, color: "#9CA3AF" }}>{L("Récompense moy.","Recompensa prom.","Avg. reward")}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#FFFFFF" }}>{acc.reward}</span>
        </div>
      </div>
    );
  };

  return (
    <section id="pricing" style={{ padding: isMobile ? "16px 16px 24px" : "32px 16px 60px", backgroundColor: "#000000", scrollMarginTop: "0px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 20 : 40 }}>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 12 }}>
            {L("Commencez votre","Inicia Tu","Start your")} <span style={{ color: "#3B82F6" }}>{L("Challenge","Desafío","Challenge")}</span>
          </h2>
          <p style={{ fontSize: isMobile ? 13 : 15, color: "rgba(255,255,255,0.45)", fontWeight: 500, margin: 0 }}>
            {L("Tradez jusqu'à 200K en compte reward.","Opera hasta $200K en cuenta reward.","Trade up to $200K in reward account.")}
          </p>
        </div>

        {/* Toggle modèle */}
        <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 6 : 12, marginBottom: isMobile ? 20 : 36, flexWrap: "nowrap" }}>
          {(([
            { id: "2step",   icon: "◈", label: L("2 Étapes","2 Pasos","2-Step"),    sub: L("Challenge standard","Desafío estándar","Standard challenge"), isNew: false },
            { id: "1step",   icon: "◆", label: L("1 Étape","1 Paso","1-Step"),       sub: L("Challenge rapide","Desafío rápido","Fast challenge"),           isNew: false },
            { id: "instant", icon: "★", label: "Instant Reward",                     sub: L("Compte reward","Cuenta reward","Reward account"),               isNew: true  },
          ]) as { id: "2step"|"1step"|"instant"; icon: string; label: string; sub: string; isNew: boolean }[]).map(tab => {
            const active = model === tab.id;
            return (
              <button key={tab.id} onClick={() => { setModel(tab.id); setSelectedSize(0); }} style={{
                position: "relative",
                background: active ? "#FFFFFF" : "#111111",
                border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: isMobile ? "8px 10px" : "16px 28px",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: isMobile ? 6 : 12,
                transition: "all 0.2s",
                flex: isMobile ? "1 1 0" : undefined,
                minWidth: isMobile ? 0 : 180,
                textAlign: "left",
              }}>
                {tab.isNew && (
                  <span style={{ position: "absolute", top: -8, right: -8, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>NEW</span>
                )}
                <span style={{ fontSize: isMobile ? 14 : 20, color: active ? "#000" : "rgba(255,255,255,0.4)" }}>{tab.icon}</span>
                <div>
                  <div style={{ fontSize: isMobile ? 11 : 15, fontWeight: 800, color: active ? "#000" : "#FFFFFF", whiteSpace: "nowrap" }}>{tab.label}</div>
                  <div style={{ fontSize: isMobile ? 8 : 11, color: active ? "#555" : "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 2, whiteSpace: "nowrap" }}>{tab.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* MOBILE : sélecteur de taille + carte unique */}
        {isMobile && model !== "instant" && (
          <>
            {/* Pills sélecteur taille */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 20 }}>
              {accounts.map((acc, i) => {
                const active = selectedSize === i;
                return (
                  <button key={acc.id} onClick={() => setSelectedSize(i)} style={{
                    padding: "8px 14px",
                    borderRadius: 20,
                    border: active ? "none" : "1px solid rgba(255,255,255,0.15)",
                    background: active ? "#3B82F6" : "#111111",
                    color: active ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                    fontSize: 13, fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}>
                    {acc.label}
                  </button>
                );
              })}
            </div>

            {/* Carte sélectionnée */}
            <PriceCard acc={currentAcc} compact={true} />

            {/* Bouton "Comment ça marche ?" sous les cartes */}
            <a href="/#how-it-works" style={{
              display: "block", textAlign: "center",
              marginTop: 16,
              padding: "14px 32px", borderRadius: 8,
              fontSize: 12, fontWeight: 700, letterSpacing: "1.5px",
              textTransform: "uppercase", textDecoration: "none",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "rgba(255,255,255,0.8)",
            }}>
              {isFr ? "Comment ça marche ?" : "How does it work?"}
            </a>
          </>
        )}

        {/* MOBILE instant */}
        {isMobile && model === "instant" && (
          <>
            <PriceCard acc={displayAccounts[0]} compact={true} />
            <a href="/#how-it-works" style={{
              display: "block", textAlign: "center",
              marginTop: 16,
              padding: "14px 32px", borderRadius: 8,
              fontSize: 12, fontWeight: 700, letterSpacing: "1.5px",
              textTransform: "uppercase", textDecoration: "none",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "rgba(255,255,255,0.8)",
            }}>
              {isFr ? "Comment ça marche ?" : "How does it work?"}
            </a>
          </>
        )}

        {/* DESKTOP : grille 4 colonnes centrée */}
        {!isMobile && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            flexWrap: "nowrap",
          }}>
            {displayAccounts.map(acc => (
              <div key={acc.id} style={{ width: model === "instant" ? 320 : "calc(25% - 6px)", maxWidth: 280, flex: "1 1 0" }}>
                <PriceCard acc={acc} compact={false} />
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
