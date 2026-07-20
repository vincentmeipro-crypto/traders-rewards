"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const accounts = [
  { size: "$100,000", id: "100k", label: "100K", price2: "€439", price1: "€429", popular: true,  badge: "EXPERT",    reward: "~€4,800" },
  { size: "$50,000",  id: "50k",  label: "50K",  price2: "€299", price1: "€249", popular: false, badge: "CONFIRMÉ",  reward: "~€2,400" },
  { size: "$25,000",  id: "25k",  label: "25K",  price2: "€199", price1: "€169", popular: false, badge: "ÉVOLUTION", reward: "~€1,200" },
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
    { label: L("Objectif profit","Objetivo profit","Profit target"),    value: "10%",     pct: 0.10  },
    { label: L("Perte journalière","Pérdida diaria","Max daily loss"),  value: "3%",      pct: -0.03 },
    { label: L("Perte totale","Pérdida total","Total loss"),            value: "10% EOD", pct: -0.10 },
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
    const price = model === "2step" ? acc.price2 : acc.price1;
    return (
      <div className={`pricing-card${acc.popular ? " pricing-card-popular" : ""}`}>
        {/* Badge */}
        <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: "#3B82F6", color: "#fff", fontSize: 8, fontWeight: 800, padding: "3px 12px", borderRadius: 100, letterSpacing: "1.5px", whiteSpace: "nowrap" }}>
          {acc.badge}
        </div>

        {/* Header */}
        <div style={{ padding: compact ? "18px 16px 10px" : "12px 16px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: "#6b7280", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 2 }}>
            {T.pricing.account}
          </div>
          <div style={{ fontSize: compact ? 28 : 20, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px" }}>
            {acc.size}
          </div>
        </div>

        {/* Prix + CTA */}
        <div style={{ padding: compact ? "10px 16px" : "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: compact ? 26 : 20, fontWeight: 800, color: "#FFFFFF" }}>{price}</div>
          </div>
          <a href={`/checkout?product=${acc.id}-${model}`} style={{
            display: "block", textAlign: "center",
            padding: compact ? "11px" : "8px",
            borderRadius: 8,
            fontSize: 11, fontWeight: 800,
            textDecoration: "none", letterSpacing: "1px", textTransform: "uppercase",
            background: acc.popular ? "#3B82F6" : "rgba(255,255,255,0.08)",
            color: "#FFFFFF",
            border: acc.popular ? "none" : "1px solid rgba(255,255,255,0.12)",
            transition: "opacity 0.2s",
          }}>
            {L("Commencer maintenant","Empezar","Get Started")}
          </a>
          <div style={{ textAlign: "center", fontSize: 9, color: "#4b5563", marginTop: 5 }}>
            {L("Frais unique (non remboursable)","Cargo único (no reembolsable)","One-time fee (non-refundable)")}
          </div>
        </div>

        {/* Rules */}
        <div style={{ padding: compact ? "6px 16px 8px" : "4px 16px 6px" }}>
          {rows.map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: compact ? "5px 0" : "4px 0",
              borderBottom: i < rows.length - 1 ? "1px dotted rgba(255,255,255,0.06)" : "none",
            }}>
              <span style={{ color: "#6b7280", fontSize: compact ? 11 : 10, fontWeight: 500 }}>{row.label}</span>
              <span style={{ color: "#FFFFFF", fontSize: compact ? 11 : 10, fontWeight: 700 }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Récompense moy. */}
        <div style={{
          margin: "0 16px 12px",
          background: "rgba(59,130,246,0.06)",
          border: "1px solid rgba(59,130,246,0.15)",
          borderRadius: 6, padding: "5px 10px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 10, color: "#6b7280" }}>{L("Récompense moy.","Recompensa prom.","Avg. reward")}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#FFFFFF" }}>{acc.reward}</span>
        </div>
      </div>
    );
  };

  return (
    <section id="pricing" style={{ padding: isMobile ? "16px 16px 24px" : "20px 16px 32px", backgroundColor: "#000000", scrollMarginTop: "calc(72px + var(--promo-banner-height, 0px))", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <style>{`
        .pricing-card {
          background: #0a0a0a;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          overflow: visible;
          position: relative;
          transition: border-color 0.2s, transform 0.2s;
        }
        .pricing-card:hover {
          border-color: rgba(59,130,246,0.35);
          transform: translateY(-3px);
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
        <div style={{ textAlign: "center", marginBottom: isMobile ? 16 : 20 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 6 }}>
            {L("Choisissez votre","Elige Tu","Choose your")} <span style={{ color: "#3B82F6" }}>{L("Challenge","Desafío","Challenge")}</span>
          </h2>
          <p style={{ fontSize: isMobile ? 12 : 13, color: "rgba(255,255,255,0.45)", fontWeight: 500, margin: 0 }}>
            {L("Tradez jusqu'à 200K en compte reward.","Opera hasta $200K en cuenta reward.","Trade up to $200K in reward account.")}
          </p>
        </div>

        {/* Toggle modèle */}
        <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 6 : 10, marginBottom: isMobile ? 16 : 20, flexWrap: "nowrap" }}>
          {(([
            { id: "2step", icon: "◈", label: L("2 Étapes","2 Pasos","2-Step"), sub: L("Challenge standard","Desafío estándar","Standard challenge") },
            { id: "1step", icon: "◆", label: L("1 Étape","1 Paso","1-Step"),   sub: L("Challenge rapide","Desafío rápido","Fast challenge") },
          ]) as { id: "2step"|"1step"; icon: string; label: string; sub: string }[]).map(tab => {
            const active = model === tab.id;
            return (
              <button key={tab.id} onClick={() => { setModel(tab.id); setSelectedSize(0); }} style={{
                background: active ? "#FFFFFF" : "#111111",
                border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: isMobile ? "8px 10px" : "10px 20px",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: isMobile ? 6 : 10,
                transition: "all 0.2s",
                flex: isMobile ? "1 1 0" : undefined,
                minWidth: isMobile ? 0 : 150,
                textAlign: "left",
              }}>
                <span style={{ fontSize: isMobile ? 14 : 16, color: active ? "#000" : "rgba(255,255,255,0.4)" }}>{tab.icon}</span>
                <div>
                  <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 800, color: active ? "#000" : "#FFFFFF", whiteSpace: "nowrap" }}>{tab.label}</div>
                  <div style={{ fontSize: isMobile ? 8 : 10, color: active ? "#555" : "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 1, whiteSpace: "nowrap" }}>{tab.sub}</div>
                </div>
              </button>
            );
          })}
          <a href="/vip" style={{
            background: "linear-gradient(135deg, #1d3a6e 0%, #1e3a8a 100%)",
            border: "1px solid rgba(59,130,246,0.5)",
            borderRadius: 10,
            padding: isMobile ? "8px 10px" : "10px 20px",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: isMobile ? 6 : 10,
            transition: "all 0.2s",
            flex: isMobile ? "1 1 0" : undefined,
            minWidth: isMobile ? 0 : 150,
            textDecoration: "none",
          }}>
            <span style={{ fontSize: isMobile ? 14 : 16 }}>⚡</span>
            <div>
              <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 800, color: "#3B82F6", whiteSpace: "nowrap" }}>Challenge VIP</div>
              <div style={{ fontSize: isMobile ? 8 : 10, color: "rgba(59,130,246,0.6)", fontWeight: 500, marginTop: 1, whiteSpace: "nowrap" }}>Algo intégré</div>
            </div>
          </a>
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
          </>
        )}

        {/* DESKTOP : grille 3 colonnes */}
        {!isMobile && (
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "nowrap" }}>
            {accounts.map(acc => (
              <div key={acc.id} style={{ flex: "1 1 0", maxWidth: 320 }}>
                <PriceCard acc={acc} compact={false} />
              </div>
            ))}
          </div>
        )}

        {/* Bouton Comment ça marche — visible partout */}
        <div style={{ textAlign: "center", marginTop: isMobile ? 20 : 24 }}>
          <a href="/#how-it-works" style={{
            display: "inline-block",
            padding: "14px 36px", borderRadius: 8,
            fontSize: 12, fontWeight: 700, letterSpacing: "1.5px",
            textTransform: "uppercase", textDecoration: "none",
            background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.8)",
            transition: "border-color 0.2s, color 0.2s",
          }}>
            {L("Comment ça marche ?","¿Cómo funciona?","How does it work?")}
          </a>
        </div>

      </div>
    </section>
  );
}
