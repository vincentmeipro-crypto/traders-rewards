"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const PROMO_CODE = "TRD50";
const PROMO_PCT  = 50;

const accounts = [
  { size: "$100,000", id: "100k", price2: "€439", price1: "€429", promo2: "€219", promo1: "€214", popular: true,  premium: false, reward: "~€4,800" },
  { size: "$200,000", id: "200k", price2: "€799", price1: "€779", promo2: "€399", promo1: "€389", popular: false, premium: true,  reward: "~€9,600" },
  { size: "$50,000",  id: "50k",  price2: "€299", price1: "€249", promo2: "€149", promo1: "€124", popular: false, premium: false, reward: "~€2,400" },
  { size: "$25,000",  id: "25k",  price2: "€199", price1: "€169", promo2: "€99",  promo1: "€84",  popular: false, premium: false, reward: "~€1,200" },
  { size: "$10,000",  id: "10k",  price2: "€99",  price1: "€79",  promo2: "€49",  promo1: "€39",  popular: false, premium: false, reward: "~€480"   },
];

export default function Pricing() {
  const [model, setModel] = useState<"2step" | "1step" | "instant">("2step");
  const [isMobile, setIsMobile] = useState(false);
  const { T, lang } = useLanguage();
  const isFr = lang === "fr";

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  type Row = { label: string; value: string; highlight?: boolean; green?: boolean; pct?: number };

  const rows2step: Row[] = [
    { label: isFr ? "Étape 1"              : "Phase 1",         value: "10%",               pct: 0.10  },
    { label: isFr ? "Étape 2"              : "Phase 2",         value: "5%",                pct: 0.05  },
    { label: isFr ? "Perte journalière"    : "Max daily loss",  value: "5%",                pct: -0.05 },
    { label: isFr ? "Perte totale"         : "Max total loss",  value: "10%",               pct: -0.10 },
    { label: isFr ? "Jours min"            : "Min days",        value: isFr ? "5 jours" : "5 days" },
    { label: isFr ? "Limite de temps"      : "Time limit",      value: isFr ? "Illimité" : "Unlimited" },
    { label: isFr ? "Partage profits"      : "Profit split",    value: isFr ? "80%" : "80%" },
  ];

  const rows1step: Row[] = [
    { label: isFr ? "Objectif profit"      : "Profit target",   value: "8%",                pct: 0.08  },
    { label: isFr ? "Perte journalière"    : "Max daily loss",  value: "3%",                pct: -0.03 },
    { label: isFr ? "Perte totale"         : "Total loss",      value: "8% EOD",            pct: -0.08 },
    { label: isFr ? "Règle meilleur jour"  : "Best day rule",   value: "≤ 50%" },
    { label: isFr ? "Jours min"            : "Min days",        value: isFr ? "5 jours" : "5 days" },
    { label: isFr ? "Limite de temps"      : "Time limit",      value: isFr ? "Illimité" : "Unlimited" },
    { label: isFr ? "Partage profits"      : "Profit split",    value: "90%" },
    { label: isFr ? "Max cumulé"           : "Max cumulated",   value: "$200K" },
  ];

  const rowsInstant: Row[] = [
    { label: isFr ? "Objectif profit"   : "Profit target",  value: isFr ? "Aucun" : "None" },
    { label: isFr ? "Perte journalière" : "Max daily loss", value: "3% EOD",  pct: -0.03 },
    { label: isFr ? "Perte totale"      : "Max total loss", value: "8% EOD",  pct: -0.08 },
    { label: isFr ? "Trading news"      : "News trading",   value: isFr ? "±5 min interdit" : "±5 min banned" },
    { label: isFr ? "Jours min"         : "Min days",       value: isFr ? "7 jours" : "7 days" },
    { label: isFr ? "Risque par trade"  : "Risk per trade",  value: "≤ 1.5%" },
    { label: isFr ? "Stop Loss"         : "Stop Loss",       value: isFr ? "Obligatoire < 1min" : "Required < 1min" },
    { label: isFr ? "Partage profits"   : "Profit split",    value: "90%" },
    { label: isFr ? "Compte reward"     : "Reward account",  value: isFr ? "Immédiat ✓" : "Instant ✓", highlight: true },
  ];

  const rows = model === "2step" ? rows2step : model === "1step" ? rows1step : rowsInstant;
  const sizeMap: Record<string, number> = { "$200,000": 200000, "$100,000": 100000, "$50,000": 50000, "$25,000": 25000, "$10,000": 10000 };

  return (
    <section id="pricing" style={{ padding: isMobile ? "16px 16px 16px" : "32px 16px 60px", backgroundColor: "#0A0A0A", scrollMarginTop: "0px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 40 }}>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px", lineHeight: 1.1, marginBottom: 12 }}>
            {isFr ? <>Commencez votre <span style={{ color: "#9A7B2F" }}>Challenge</span></> : <>Start your <span style={{ color: "#9A7B2F" }}>Challenge</span></>}
          </h2>
          <p style={{ fontSize: isMobile ? 13 : 15, color: "rgba(255,255,255,0.45)", fontWeight: 500, margin: 0 }}>
            {isFr
              ? "Tradez jusqu'à 400K en compte reward."
              : "Trade up to $400K in reward account."}
          </p>
        </div>

        {/* Toggle FTMO-style */}
        <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 20 : 36, flexWrap: "wrap" }}>
          {(([
            { id: "2step", icon: "◈", label: isFr ? "2 Étapes" : "2-Step", sub: isFr ? "Challenge standard 2 phases" : "Standard 2-phase challenge", isNew: false },
            { id: "1step", icon: "◆", label: isFr ? "1 Étape" : "1-Step", sub: isFr ? "Challenge rapide 1 phase" : "Fast 1-phase challenge", isNew: false },
            { id: "instant", icon: "★", label: "Instant Reward", sub: isFr ? "Compte reward immédiat" : "Immediate reward account", isNew: true },
          ]) as { id: "2step"|"1step"|"instant"; icon: string; label: string; sub: string; isNew: boolean }[]).map(tab => {
            const active = model === tab.id;
            return (
              <button key={tab.id} onClick={() => setModel(tab.id)} style={{
                position: "relative",
                background: active ? "#FFFFFF" : "#111111",
                border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: isMobile ? "12px 16px" : "16px 28px",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.2s",
                minWidth: isMobile ? 140 : 180,
                textAlign: "left",
              }}>
                {tab.isNew && (
                  <span style={{
                    position: "absolute", top: -8, right: -8,
                    background: "#ef4444", color: "#fff",
                    fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4,
                  }}>NEW</span>
                )}
                <span style={{ fontSize: 20, color: active ? "#000" : "rgba(255,255,255,0.4)" }}>{tab.icon}</span>
                <div>
                  <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: active ? "#000" : "#FFFFFF", letterSpacing: "0.2px" }}>{tab.label}</div>
                  <div style={{ fontSize: isMobile ? 10 : 11, color: active ? "#555" : "rgba(255,255,255,0.4)", fontWeight: 500, marginTop: 2 }}>{tab.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Cards */}
        <div style={{
          display: model === "instant" ? "flex" : isMobile ? "flex" : "grid",
          gridTemplateColumns: model === "instant" ? undefined : "repeat(5, 1fr)",
          justifyContent: model === "instant" ? "center" : undefined,
          gap: 12,
          overflowX: isMobile && model !== "instant" ? "scroll" : "visible",
          paddingTop: 16,
          paddingBottom: isMobile ? 16 : 8,
          scrollSnapType: isMobile && model !== "instant" ? "x mandatory" : "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {(model === "instant"
            ? [{ size: "$50,000", id: "50k-instant", price2: "€1,300", price1: "€1,300", promo2: "€1,300", promo1: "€1,300", popular: false, premium: false, reward: "~€2,250" }]
            : accounts
          ).map(acc => {
            const price      = model === "2step" ? acc.price2 : acc.price1;
            const promoPrice = model === "2step" ? acc.promo2 : model === "1step" ? acc.promo1 : acc.price1;
            return (
              <div key={acc.id} style={{
                position: "relative",
                flexShrink: 0,
                width: model === "instant" ? (isMobile ? "90vw" : 340) : isMobile ? "82vw" : "auto",
                scrollSnapAlign: isMobile ? "center" : "none",
                background: "#111111",
                border: acc.popular ? "1.5px solid #9A7B2F" : "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                padding: "0 0 16px",
                marginTop: 20,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                transition: "transform 0.2s, border-color 0.2s",
              }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = acc.popular ? "#9A7B2F" : "rgba(255,255,255,0.25)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = acc.popular ? "#9A7B2F" : "rgba(255,255,255,0.1)"; }}
              >
                {/* Header de la carte */}
                <div style={{
                  padding: "16px 16px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  position: "relative",
                }}>
                  {/* Badge */}
                  {(acc.popular || acc.premium) && (
                    <div style={{
                      position: "absolute", top: -1, right: -1,
                      background: acc.popular ? "#9A7B2F" : "rgba(154,123,47,0.15)",
                      color: acc.popular ? "#000" : "#9A7B2F",
                      fontSize: 9, fontWeight: 800,
                      padding: "4px 12px",
                      borderRadius: "0 14px 0 8px",
                      letterSpacing: "1px", whiteSpace: "nowrap",
                      border: acc.premium ? "1px solid #9A7B2F" : "none",
                    }}>
                      {acc.popular ? (isFr ? "POPULAIRE" : "POPULAR") : (isFr ? "✦ PREMIUM" : "✦ PREMIUM")}
                    </div>
                  )}
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>
                    {T.pricing.account}
                  </div>
                  <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px" }}>
                    {acc.size}
                  </div>
                </div>

                {/* Rules rows */}
                <div style={{ flex: 1, padding: "10px 16px" }}>
                  {rows.map((row, i) => {
                    const accountNum = sizeMap[acc.size] ?? 0;
                    const usdAmt = row.pct != null ? Math.round(accountNum * Math.abs(row.pct)) : null;
                    const usdStr = usdAmt != null ? `${row.pct! < 0 ? "-" : "+"}$${usdAmt.toLocaleString()}` : null;
                    return (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "7px 0",
                        borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                      }}>
                        <span style={{ color: "#9CA3AF", fontSize: 11, fontWeight: 500 }}>
                          {row.label}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ color: row.highlight ? "#9A7B2F" : "#FFFFFF", fontSize: 11, fontWeight: 700 }}>
                            {row.value}
                          </span>
                          {usdStr && <div style={{ color: "#6b7280", fontSize: 9, marginTop: 1 }}>{usdStr}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", margin: "0 16px 14px" }} />

                {/* Prix */}
                <div style={{ padding: "0 16px", marginBottom: 10 }}>
                  {model === "instant" ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28, fontWeight: 800, color: "#9A7B2F", letterSpacing: "-1px" }}>€1,300</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                        {isFr ? "Compte reward direct" : "Direct reward account"}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <span style={{ fontSize: 12, color: "#6b7280", textDecoration: "line-through" }}>{price}</span>
                        <span style={{ marginLeft: 8, background: "#9A7B2F", color: "#000", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>−{PROMO_PCT}%</span>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#9A7B2F", letterSpacing: "-0.5px" }}>{promoPrice}</div>
                    </div>
                  )}
                </div>

                {/* Récompense moyenne */}
                <div style={{
                  margin: "0 16px 12px",
                  background: "rgba(154,123,47,0.06)",
                  border: "1px solid rgba(154,123,47,0.2)",
                  borderRadius: 8, padding: "8px 12px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>
                    {isFr ? "Récompense moy." : "Avg. reward"}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#9A7B2F" }}>{acc.reward}</span>
                </div>

                {/* CTA */}
                <div style={{ padding: "0 16px" }}>
                  <a href={model === "instant" ? `/checkout?product=50k-instant` : `/checkout?product=${acc.id}-${model}`} style={{
                    display: "block", textAlign: "center",
                    padding: "12px", borderRadius: 8,
                    fontSize: 12, fontWeight: 700,
                    textDecoration: "none", letterSpacing: "1px", textTransform: "uppercase",
                    background: acc.popular ? "#9A7B2F" : "#FFFFFF",
                    color: "#000",
                    transition: "opacity 0.2s",
                  }}
                    onMouseOver={e => { (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
                    onMouseOut={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  >
                    {isFr ? "Commencer" : "Get Started"}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {isMobile && (
          <p style={{ textAlign: "center", color: "#6b7280", fontSize: 12, marginTop: 12 }}>
            {isFr ? "← Glissez pour voir tous les comptes →" : "← Swipe to see all accounts →"}
          </p>
        )}
      </div>
    </section>
  );
}
