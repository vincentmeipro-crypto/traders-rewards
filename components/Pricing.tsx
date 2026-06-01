"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const accounts = [
  { size: "$100,000", id: "100k", price2: "€439",   old2: "€526",  price1: "€429",   popular: true, discount: "-20%" },
  { size: "$50,000",  id: "50k",  price2: "€345",   old2: null,    price1: "€299",   popular: false },
  { size: "$25,000",  id: "25k",  price2: "€250",   old2: null,    price1: "€189",   popular: false },
  { size: "$10,000",  id: "10k",  price2: "€89",    old2: null,    price1: "€69",    popular: false },
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

  type Row = { label: string; value: string; highlight: boolean; green?: boolean; pct?: number };

  const rows2step: Row[] = [
    { label: isFr ? "ÉTAPE 1" : "PHASE 1",          value: "10%",   pct: 0.10, highlight: false },
    { label: isFr ? "ÉTAPE 2" : "PHASE 2",          value: "5%",    pct: 0.05, highlight: false },
    { label: isFr ? "Perte journalière max" : "Max daily loss",  value: "5%",  pct: -0.05, highlight: false },
    { label: isFr ? "Perte totale max" : "Max total loss",       value: "10%", pct: -0.10, highlight: false },
    { label: isFr ? "Jours de trading min" : "Min trading days", value: isFr ? "4 jours" : "4 days", highlight: false },
    { label: isFr ? "Limite de temps" : "Time limit",            value: isFr ? "Illimité" : "Unlimited", highlight: false },
    { label: isFr ? "Remboursement frais" : "Fee refunded",      value: "YES 100%", highlight: true, green: true },
    { label: isFr ? "Partage des profits" : "Profit split",      value: isFr ? "Jusqu'à 80%" : "Up to 80%", highlight: false },
  ];

  const rows1step: Row[] = [
    { label: isFr ? "Objectif de profit" : "Profit target",           value: "10%",  pct: 0.10,  highlight: false },
    { label: isFr ? "Perte journalière max" : "Max daily loss",       value: "3%",   pct: -0.03, highlight: false },
    { label: isFr ? "Perte totale (trailing)" : "Total loss (trailing)", value: "10%", pct: -0.10, highlight: false },
    { label: isFr ? "Règle meilleur jour" : "Best day rule",          value: "≤ 50%", highlight: false },
    { label: isFr ? "Jours de trading min" : "Min trading days",      value: isFr ? "4 jours" : "4 days", highlight: false },
    { label: isFr ? "Limite de temps" : "Time limit",                 value: isFr ? "Illimité" : "Unlimited", highlight: false },
    { label: isFr ? "Partage des profits" : "Profit split",           value: isFr ? "Jusqu'à 90%" : "Up to 90%", highlight: false },
    { label: isFr ? "Cumul comptes max" : "Max cumulated accounts",   value: "$200K", highlight: false },
  ];

  const rows = model === "2step" ? rows2step : rows1step;

  const sizeToNumber: Record<string, number> = {
    "$100,000": 100000, "$50,000": 50000, "$25,000": 25000, "$10,000": 10000,
  };

  return (
    <section id="pricing" style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ color: "#00C2FF", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 16 }}>{T.pricing.label}</span>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 0 }}>
            {T.pricing.title} <span className="gold-gradient">{T.pricing.titleGold}</span>
          </h2>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginBottom: 48 }}>
          <div style={{ backgroundColor: "#1E1E26", border: "1px solid #2A2A38", borderRadius: 12, padding: 4, display: "flex", gap: 4 }}>
            {(["2step", "1step"] as const).map(m => (
              <button key={m} onClick={() => setModel(m)} style={{
                padding: "10px 32px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 700, letterSpacing: "0.5px", transition: "all 0.2s",
                backgroundColor: model === m ? "#00C2FF" : "transparent",
                color: model === m ? "#fff" : "#555",
              }}>
                {m === "2step" ? T.pricing.twoStep : T.pricing.oneStep}
              </button>
            ))}
          </div>
          <img src="/MT5.png" alt="MT5" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover" }} />
        </div>

        {/* Cards */}
        <div style={{
          display: isMobile ? "flex" : "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          overflowX: isMobile ? "scroll" : "auto",
          paddingTop: 20,
          paddingBottom: isMobile ? 16 : 8,
          scrollSnapType: isMobile ? "x mandatory" : "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {accounts.map((acc) => {
            const price = model === "2step" ? acc.price2 : acc.price1;
            const oldPrice = model === "2step" ? acc.old2 : null;
            return (
              <div key={acc.id} style={{
                position: "relative",
                flexShrink: 0,
                width: isMobile ? "82vw" : "auto",
                scrollSnapAlign: isMobile ? "center" : "none",
                background: acc.popular
                  ? "linear-gradient(160deg, #1C2535, #21212B)"
                  : "#1E1E26",
                border: acc.popular ? "2px solid #c8e8ff" : "1px solid #c8e8ff",
                borderRadius: 14,
                padding: "22px 14px 18px",
                display: "flex",
                flexDirection: "column",
                boxShadow: acc.popular
                  ? "0 0 18px rgba(200,232,255,0.45), 0 0 4px rgba(255,255,255,0.3)"
                  : "0 0 10px rgba(200,232,255,0.2), 0 0 2px rgba(255,255,255,0.15)",
                minWidth: 0,
              }}>

                {/* Popular badge */}
                {acc.popular && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #16a34a, #22c55e)",
                    color: "#fff", fontSize: 11, fontWeight: 800,
                    padding: "5px 14px", borderRadius: 100,
                    letterSpacing: "0.5px", whiteSpace: "nowrap",
                    boxShadow: "0 4px 12px rgba(34,197,94,0.45)",
                  }}>
                    {isFr ? "Meilleure valeur" : "Best value"}
                  </div>
                )}

                {/* Account size */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>
                    {T.pricing.account}
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
                    {acc.size}
                  </div>
                </div>

                {/* Rules rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1, marginBottom: 20 }}>
                  {rows.map((row, i) => {
                    const accountNum = sizeToNumber[acc.size] ?? 0;
                    const usdAmt = row.pct != null ? Math.round(accountNum * Math.abs(row.pct)) : null;
                    const usdStr = usdAmt != null ? `${row.pct! < 0 ? "-" : "+"}$${usdAmt.toLocaleString()}` : null;
                    return (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "7px 0",
                        borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}>
                        <span style={{ color: "#555", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {row.label}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          {row.highlight ? (
                            <span style={{
                              backgroundColor: row.green ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                              color: row.green ? "#22c55e" : "#ef4444",
                              fontSize: 11, fontWeight: 800,
                              padding: "2px 8px", borderRadius: 6,
                              border: `1px solid ${row.green ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.25)"}`,
                            }}>
                              {row.value}
                            </span>
                          ) : (
                            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{row.value}</span>
                          )}
                          {usdStr && (
                            <div style={{ color: "#444", fontSize: 10, fontWeight: 600, marginTop: 1 }}>{usdStr}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Separator */}
                <div style={{ height: 1, backgroundColor: "#2A2A38", marginBottom: 20 }} />

                {/* Price */}
                <div style={{ marginBottom: 16, textAlign: "center" }}>
                  {oldPrice && (
                    <div style={{ color: "#555", fontSize: 13, textDecoration: "line-through", marginBottom: 2 }}>
                      {oldPrice}
                    </div>
                  )}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: acc.popular ? "#00C2FF" : "#fff", letterSpacing: "-1px" }}>
                      {price}
                    </div>
                    {"discount" in acc && acc.discount && (
                      <span style={{
                        fontSize: 13, fontWeight: 800,
                        color: "#ff6a00",
                        backgroundColor: "rgba(255,106,0,0.12)",
                        border: "1px solid rgba(255,106,0,0.3)",
                        borderRadius: 6, padding: "2px 7px",
                      }}>
                        {acc.discount}
                      </span>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <a
                  href={`/checkout?product=${acc.id}-${model}`}
                  style={{
                    display: "block", textAlign: "center",
                    padding: "13px 16px", borderRadius: 10,
                    fontSize: 13, fontWeight: 800,
                    textDecoration: "none", letterSpacing: "0.5px",
                    background: "#ffffff",
                    color: "#000000",
                    border: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = "#e0e0e0"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "#ffffff"; }}
                >
                  {isFr ? "Commencer maintenant" : "Get started"}
                </a>
              </div>
            );
          })}
        </div>

        {/* Mobile hint */}
        {isMobile && (
          <p style={{ textAlign: "center", color: "#444", fontSize: 12, marginTop: 12 }}>
            {isFr ? "← Glissez pour voir tous les comptes →" : "← Swipe to see all accounts →"}
          </p>
        )}

      </div>
    </section>
  );
}
