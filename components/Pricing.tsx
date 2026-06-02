"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const accounts = [
  { size: "$100,000", id: "100k", price2: "€439", price1: "€429", popular: true  },
  { size: "$50,000",  id: "50k",  price2: "€299", price1: "€249", popular: false },
  { size: "$25,000",  id: "25k",  price2: "€199", price1: "€169", popular: false },
  { size: "$10,000",  id: "10k",  price2: "€99",  price1: "€79",  popular: false },
];

export default function Pricing() {
  const [model, setModel] = useState<"2step" | "1step">("2step");
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
    { label: isFr ? "Jours min"            : "Min days",        value: isFr ? "4 jours" : "4 days" },
    { label: isFr ? "Limite de temps"      : "Time limit",      value: isFr ? "Illimité" : "Unlimited" },
    { label: isFr ? "Remboursement frais"  : "Fee refunded",    value: "100%", highlight: true, green: true },
    { label: isFr ? "Partage profits"      : "Profit split",    value: isFr ? "80%" : "80%" },
  ];

  const rows1step: Row[] = [
    { label: isFr ? "Objectif profit"      : "Profit target",   value: "10%",               pct: 0.10  },
    { label: isFr ? "Perte journalière"    : "Max daily loss",  value: "3%",                pct: -0.03 },
    { label: isFr ? "Perte totale"         : "Total loss",      value: "10%",               pct: -0.10 },
    { label: isFr ? "Règle meilleur jour"  : "Best day rule",   value: "≤ 50%" },
    { label: isFr ? "Jours min"            : "Min days",        value: isFr ? "4 jours" : "4 days" },
    { label: isFr ? "Limite de temps"      : "Time limit",      value: isFr ? "Illimité" : "Unlimited" },
    { label: isFr ? "Partage profits"      : "Profit split",    value: "90%" },
    { label: isFr ? "Max cumulé"           : "Max cumulated",   value: "$200K" },
  ];

  const rows = model === "2step" ? rows2step : rows1step;
  const sizeMap: Record<string, number> = { "$100,000": 100000, "$50,000": 50000, "$25,000": 25000, "$10,000": 10000 };

  return (
    <section id="pricing" style={{ padding: "100px 24px", backgroundColor: "#fff", scrollMarginTop: "0px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span className="section-label" style={{ display: "block", marginBottom: 16 }}>{T.pricing.label}</span>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(2.2rem, 5vw, 3.4rem)", fontWeight: 600, color: "#0D1B3E", letterSpacing: "1px", marginBottom: 12 }}>
            {T.pricing.title} <em style={{ color: "#1B4FD8", fontStyle: "italic" }}>{T.pricing.titleGold}</em>
          </h2>
          <p style={{ color: "#4a5568", fontSize: 15, maxWidth: 440, margin: "0 auto" }}>{T.pricing.sub}</p>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
          <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: 4, display: "flex", gap: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            {(["2step", "1step"] as const).map(m => (
              <button key={m} onClick={() => setModel(m)} style={{
                padding: "10px 32px", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, letterSpacing: "0.5px", transition: "all 0.2s",
                backgroundColor: model === m ? "#0D1B3E" : "transparent",
                color: model === m ? "#fff" : "#8a96aa",
                boxShadow: model === m ? "0 2px 10px rgba(13,27,62,0.2)" : "none",
              }}>
                {m === "2step" ? T.pricing.twoStep : T.pricing.oneStep}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{
          display: isMobile ? "flex" : "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          overflowX: isMobile ? "scroll" : "auto",
          paddingBottom: isMobile ? 16 : 8,
          scrollSnapType: isMobile ? "x mandatory" : "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {accounts.map(acc => {
            const price = model === "2step" ? acc.price2 : acc.price1;
            return (
              <div key={acc.id} style={{
                position: "relative",
                flexShrink: 0,
                width: isMobile ? "82vw" : "auto",
                scrollSnapAlign: isMobile ? "center" : "none",
                background: "#fff",
                border: "1px solid #3a3f4d",
                borderRadius: 16,
                padding: "20px 16px 18px",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 8px 40px rgba(27,79,216,0.1), 0 2px 8px rgba(0,0,0,0.06)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(27,79,216,0.15), 0 4px 16px rgba(0,0,0,0.08)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(27,79,216,0.1), 0 2px 8px rgba(0,0,0,0.06)"; }}
              >

                {/* Popular badge */}
                {acc.popular && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #C9A84C, #E8C97A)",
                    color: "#000", fontSize: 10, fontWeight: 800,
                    padding: "5px 16px", borderRadius: 100,
                    letterSpacing: "1px", whiteSpace: "nowrap",
                  }}>
                    {isFr ? "MEILLEURE VALEUR" : "BEST VALUE"}
                  </div>
                )}

                {/* Account size */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: "#8a96aa", fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>
                    {T.pricing.account}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0D1B3E", letterSpacing: "-0.5px" }}>
                    {acc.size}
                  </div>
                </div>

                {/* Rules rows */}
                <div style={{ flex: 1, marginBottom: 14 }}>
                  {rows.map((row, i) => {
                    const accountNum = sizeMap[acc.size] ?? 0;
                    const usdAmt = row.pct != null ? Math.round(accountNum * Math.abs(row.pct)) : null;
                    const usdStr = usdAmt != null ? `${row.pct! < 0 ? "-" : "+"}$${usdAmt.toLocaleString()}` : null;
                    return (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "5px 0",
                        borderBottom: i < rows.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                      }}>
                        <span style={{ color: "#8a96aa", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          {row.label}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          {row.highlight ? (
                            <span style={{
                              backgroundColor: "rgba(34,197,94,0.12)",
                              color: "#16a34a",
                              fontSize: 11, fontWeight: 800,
                              padding: "2px 8px", borderRadius: 6,
                              border: "1px solid rgba(34,197,94,0.25)",
                            }}>{row.value}</span>
                          ) : (
                            <span style={{ color: "#0D1B3E", fontSize: 13, fontWeight: 700 }}>{row.value}</span>
                          )}
                          {usdStr && <div style={{ color: "#b0b8c8", fontSize: 10, marginTop: 1 }}>{usdStr}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ height: 1, backgroundColor: acc.popular ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", marginBottom: 20 }} />

                {/* Price */}
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#0D1B3E", letterSpacing: "-1px" }}>{price}</div>
                </div>

                {/* CTA */}
                <a href={`/checkout?product=${acc.id}-${model}`} style={{
                  display: "block", textAlign: "center",
                  padding: "13px 16px", borderRadius: 8,
                  fontSize: 12, fontWeight: 800,
                  textDecoration: "none", letterSpacing: "1.5px", textTransform: "uppercase",
                  background: "#0D1B3E", color: "#fff",
                  transition: "all 0.2s",
                }}
                  onMouseOver={e => { e.currentTarget.style.background = "#1B4FD8"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "#0D1B3E"; }}
                >
                  {isFr ? "Commencer" : "Get Started"}
                </a>
              </div>
            );
          })}
        </div>

        {isMobile && (
          <p style={{ textAlign: "center", color: "#8a96aa", fontSize: 12, marginTop: 12 }}>
            {isFr ? "← Glissez pour voir tous les comptes →" : "← Swipe to see all accounts →"}
          </p>
        )}
      </div>
    </section>
  );
}
