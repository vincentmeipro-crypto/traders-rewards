"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const PROMO_CODE = "TRD50";
const PROMO_PCT  = 50;

const accounts = [
  { size: "$100,000", id: "100k", label: "100K", price2: "€439", price1: "€429", promo2: "€219", promo1: "€214", popular: true,  badge: "EXPERT",    reward: "~€4,800" },
  { size: "$50,000",  id: "50k",  label: "50K",  price2: "€299", price1: "€249", promo2: "€149", promo1: "€124", popular: false, badge: "CONFIRMÉ",  reward: "~€2,400" },
  { size: "$25,000",  id: "25k",  label: "25K",  price2: "€199", price1: "€169", promo2: "€99",  promo1: "€84",  popular: false, badge: "ÉVOLUTION", reward: "~€1,200" },
];

export default function Pricing() {
  const [model, setModel] = useState<"2step" | "1step">("2step");
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
    { label: L("Étape 1","Fase 1","Phase 1"),                           value: "10%",   pct: 0.10  },
    { label: L("Étape 2","Fase 2","Phase 2"),                           value: "5%",    pct: 0.05  },
    { label: L("Perte journalière","Pérdida diaria","Max daily loss"),  value: "5%",    pct: -0.05 },
    { label: L("Perte totale","Pérdida total","Max total loss"),        value: "10%",   pct: -0.10 },
    { label: L("Jours min","Días mín","Min days"),                      value: L("5 jours","5 días","5 days") },
    { label: L("Limite de temps","Límite tiempo","Time limit"),         value: L("Illimité","Ilimitado","Unlimited") },
    { label: L("Partage profits","Reparto profits","Profit split"),     value: "80%" },
  ];

  const rows1step: Row[] = [
    { label: L("Objectif profit","Objetivo profit","Profit target"),    value: "8%",     pct: 0.08  },
    { label: L("Perte journalière","Pérdida diaria","Max daily loss"),  value: "3%",     pct: -0.03 },
    { label: L("Perte totale","Pérdida total","Total loss"),            value: "8% EOD", pct: -0.08 },
    { label: L("Règle meilleur jour","Regla mejor día","Best day rule"),value: "≤ 50%" },
    { label: L("Jours min","Días mín","Min days"),                      value: L("5 jours","5 días","5 days") },
    { label: L("Limite de temps","Límite tiempo","Time limit"),         value: L("Illimité","Ilimitado","Unlimited") },
    { label: L("Partage profits","Reparto profits","Profit split"),     value: "90%" },
    { label: L("Max cumulé","Máx acumulado","Max cumulated"),           value: "$200K" },
  ];

  const rows = model === "2step" ? rows2step : rows1step;
  const sizeMap: Record<string, number> = { "$200,000": 200000, "$100,000": 100000, "$50,000": 50000, "$25,000": 25000, "$10,000": 10000 };
  const currentAcc = accounts[selectedSize];

  const PriceCard = ({ acc, compact }: { acc: typeof accounts[0]; compact: boolean }) => {
    const price      = model === "2step" ? acc.price2 : acc.price1;
    const promoPrice = model === "2step" ? acc.promo2 : acc.promo1;
    return (
      <div className={`pricing-card${acc.popular ? " pricing-card-popular" : ""}`}>
        {/* Badge */}
        <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#3B82F6", color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 14px", borderRadius: 100, letterSpacing: "1.5px", whiteSpace: "nowrap" }}>
          {acc.badge}
        </div>

        {/* Header */}
        <div style={{ padding: compact ? "20px 16px 12px" : "20px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>
            {T.pricing.account}
          </div>
          <div style={{ fontSize: compact ? 32 : 26, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px" }}>
            {acc.size}
          </div>
        </div>

        {/* Prix + CTA */}
        <div style={{ padding: compact ? "14px 16px" : "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 12, color: "#4b5563", textDecoration: "line-through" }}>{price}</span>
              <span style={{ marginLeft: 8, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>−{PROMO_PCT}%</span>
            </div>
            <div style={{ fontSize: compact ? 26 : 22, fontWeight: 800, color: "#FFFFFF" }}>{promoPrice}</div>
          </div>
          <a href={`/checkout?product=${acc.id}-${model}`} style={{
            display: "block", textAlign: "center",
            padding: compact ? "13px" : "12px",
            borderRadius: 10,
            fontSize: 12, fontWeight: 800,
            textDecoration: "none", letterSpacing: "1px", textTransform: "uppercase",
            background: acc.popular ? "#3B82F6" : "rgba(255,255,255,0.08)",
            color: "#FFFFFF",
            border: acc.popular ? "none" : "1px solid rgba(255,255,255,0.12)",
            transition: "opacity 0.2s",
          }}>
            {L("Commencer maintenant","Empezar","Get Started")}
          </a>
          <div style={{ textAlign: "center", fontSize: 10, color: "#4b5563", marginTop: 8 }}>
            {L("Frais unique (non remboursable)","Cargo único (no reembolsable)","One-time fee (non-refundable)")}
          </div>
        </div>

        {/* Rules */}
        <div style={{ padding: compact ? "8px 16px 12px" : "8px 16px 12px" }}>
          {rows.map((row, i) => {
            const accountNum = sizeMap[acc.size] ?? 0;
            const usdAmt = row.pct != null ? Math.round(accountNum * Math.abs(row.pct)) : null;
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: compact ? "7px 0" : "6px 0",
                borderBottom: i < rows.length - 1 ? "1px dotted rgba(255,255,255,0.06)" : "none",
              }}>
                <span style={{ color: "#6b7280", fontSize: compact ? 12 : 11, fontWeight: 500 }}>{row.label}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: "#FFFFFF", fontSize: compact ? 12 : 11, fontWeight: 700 }}>{row.value}</span>
                  {usdAmt != null && <div style={{ color: "#4b5563", fontSize: 9 }}>{row.pct! < 0 ? "-" : "+"}${usdAmt.toLocaleString()}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Récompense moy. */}
        <div style={{
          margin: "0 16px 20px",
          background: "rgba(59,130,246,0.06)",
          border: "1px solid rgba(59,130,246,0.15)",
          borderRadius: 8, padding: "6px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 11, color: "#6b7280" }}>{L("Récompense moy.","Recompensa prom.","Avg. reward")}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#FFFFFF" }}>{acc.reward}</span>
        </div>
      </div>
    );
  };

  return (
    <section id="pricing" style={{ padding: isMobile ? "16px 16px 24px" : "32px 16px 60px", backgroundColor: "#000000", scrollMarginTop: "0px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <style>{`
        .pricing-card {
          background: #0a0a0a;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          overflow: visible;
          position: relative;
          transition: border-color 0.2s, transform 0.2s;
        }
        .pricing-card:hover {
          border-color: rgba(59,130,246,0.35);
          transform: translateY(-4px);
        }
        .pricing-card-popular {
          border-color: #3B82F6;
          background: linear-gradient(135deg, #0a0a0a 0%, #0d1829 100%);
        }
        .pricing-card-popular:hover {
          border-color: #60a5fa;
        }
      `}</style>
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
            { id: "2step", icon: "◈", label: L("2 Étapes","2 Pasos","2-Step"), sub: L("Challenge standard","Desafío estándar","Standard challenge") },
            { id: "1step", icon: "◆", label: L("1 Étape","1 Paso","1-Step"),   sub: L("Challenge rapide","Desafío rápido","Fast challenge") },
          ]) as { id: "2step"|"1step"; icon: string; label: string; sub: string }[]).map(tab => {
            const active = model === tab.id;
            return (
              <button key={tab.id} onClick={() => { setModel(tab.id); setSelectedSize(0); }} style={{
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
        {isMobile && (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
              {accounts.map((acc, i) => {
                const active = selectedSize === i;
                return (
                  <button key={acc.id} onClick={() => setSelectedSize(i)} style={{
                    padding: "8px 14px", borderRadius: 20,
                    border: active ? "none" : "1px solid rgba(255,255,255,0.15)",
                    background: active ? "#3B82F6" : "#111111",
                    color: active ? "#FFFFFF" : "rgba(255,255,255,0.6)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                  }}>
                    {acc.label}
                  </button>
                );
              })}
            </div>
            <PriceCard acc={currentAcc} compact={true} />
            <a href="/#how-it-works" style={{
              display: "block", textAlign: "center", marginTop: 16,
              padding: "14px 32px", borderRadius: 8,
              fontSize: 12, fontWeight: 700, letterSpacing: "1.5px",
              textTransform: "uppercase", textDecoration: "none",
              background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)",
            }}>
              {isFr ? "Comment ça marche ?" : "How does it work?"}
            </a>
          </>
        )}

        {/* DESKTOP : grille 3 colonnes */}
        {!isMobile && (
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "nowrap" }}>
            {accounts.map(acc => (
              <div key={acc.id} style={{ flex: "1 1 0", maxWidth: 340 }}>
                <PriceCard acc={acc} compact={false} />
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
