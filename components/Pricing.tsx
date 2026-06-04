"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const accounts = [
  { size: "$100,000", id: "100k", price2: "€439", price1: "€429", popular: true,  premium: false, reward: "~€4,800" },
  { size: "$200,000", id: "200k", price2: "€799", price1: "€779", popular: false, premium: true,  reward: "~€9,600" },
  { size: "$50,000",  id: "50k",  price2: "€299", price1: "€249", popular: false, premium: false, reward: "~€2,400" },
  { size: "$25,000",  id: "25k",  price2: "€199", price1: "€169", popular: false, premium: false, reward: "~€1,200" },
  { size: "$10,000",  id: "10k",  price2: "€99",  price1: "€79",  popular: false, premium: false, reward: "~€480"   },
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
  const sizeMap: Record<string, number> = { "$200,000": 200000, "$100,000": 100000, "$50,000": 50000, "$25,000": 25000, "$10,000": 10000 };

  return (
    <section id="pricing" style={{ padding: isMobile ? "48px 16px 16px" : "60px 16px 60px", backgroundColor: "transparent", scrollMarginTop: "0px", position: "relative", zIndex: 1, overflow: "hidden" }}>
      <img src="/FEMME-TRADER2.png" alt="" aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", opacity: 0.6, pointerEvents: "none", zIndex: 0, maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)", WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)" }} />
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 16 : 28 }}>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, color: "#0D1B3E", letterSpacing: "-0.5px", lineHeight: 1.1, marginBottom: 10 }}>
            {T.pricing.title} <span style={{ color: "#1565C0" }}>{T.pricing.titleGold}</span>
          </h2>
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: isMobile ? 16 : 28 }}>
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
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 12,
          overflowX: isMobile ? "scroll" : "auto",
          paddingTop: 16,
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
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.75)",
                borderRadius: 12,
                padding: "18px 10px 10px",
                marginTop: 14,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 8px 32px rgba(21,101,192,0.12), 0 1px 0 rgba(255,255,255,0.9) inset",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 60px rgba(27,79,216,0.15), 0 4px 16px rgba(0,0,0,0.08)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(27,79,216,0.1), 0 2px 8px rgba(0,0,0,0.06)"; }}
              >

                {/* Badge MEILLEURE VALEUR — vert pour 100K */}
                {acc.popular && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #16a34a, #22c55e)",
                    color: "#fff", fontSize: 10, fontWeight: 800,
                    padding: "5px 16px", borderRadius: 100,
                    letterSpacing: "1px", whiteSpace: "nowrap",
                  }}>
                    {isFr ? "MEILLEURE VALEUR" : "BEST VALUE"}
                  </div>
                )}

                {/* Badge PREMIUM — doré pour 200K */}
                {acc.premium && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg, #92400e, #C9A84C, #F6D976)",
                    color: "#000", fontSize: 10, fontWeight: 800,
                    padding: "5px 16px", borderRadius: 100,
                    letterSpacing: "1px", whiteSpace: "nowrap",
                    boxShadow: "0 2px 8px rgba(201,168,76,0.4)",
                  }}>
                    {isFr ? "✦ PREMIUM" : "✦ PREMIUM"}
                  </div>
                )}

                {/* Account size */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ color: "#8a96aa", fontSize: 8, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 2 }}>
                    {T.pricing.account}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#0D1B3E", letterSpacing: "-0.5px" }}>
                    {acc.size}
                  </div>
                </div>

                {/* Rules rows */}
                <div style={{ flex: 1, marginBottom: 10 }}>
                  {rows.map((row, i) => {
                    const accountNum = sizeMap[acc.size] ?? 0;
                    const usdAmt = row.pct != null ? Math.round(accountNum * Math.abs(row.pct)) : null;
                    const usdStr = usdAmt != null ? `${row.pct! < 0 ? "-" : "+"}$${usdAmt.toLocaleString()}` : null;
                    return (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "3px 0",
                        borderBottom: i < rows.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                      }}>
                        <span style={{ color: "#8a96aa", fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                          {row.label}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          {row.highlight ? (
                            <span style={{
                              backgroundColor: "rgba(21,101,192,0.1)",
                              color: "#1565C0",
                              fontSize: 10, fontWeight: 800,
                              padding: "1px 6px", borderRadius: 4,
                              border: "1px solid rgba(21,101,192,0.2)",
                            }}>{row.value}</span>
                          ) : (
                            <span style={{ color: "#0D1B3E", fontSize: 10, fontWeight: 700 }}>{row.value}</span>
                          )}
                          {usdStr && <div style={{ color: "#b0b8c8", fontSize: 9, marginTop: 0 }}>{usdStr}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ height: 1, backgroundColor: "rgba(0,0,0,0.06)", marginBottom: 10 }} />

                {/* Price */}
                <div style={{ textAlign: "center", marginBottom: 6 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#0D1B3E", letterSpacing: "-1px" }}>{price}</div>
                </div>

                {/* Récompense moyenne */}
                <div style={{
                  background: "rgba(21,101,192,0.08)",
                  border: "1px solid rgba(21,101,192,0.2)",
                  borderRadius: 6, padding: "5px 8px",
                  textAlign: "center", marginBottom: 8,
                }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: "#7a90b0", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 1 }}>
                    {isFr ? "Récompense moy." : "Avg. reward"}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#1565C0", letterSpacing: "-0.5px" }}>{acc.reward}</div>
                </div>

                {/* CTA */}
                <a href={`/checkout?product=${acc.id}-${model}`} style={{
                  display: "block", textAlign: "center",
                  padding: "10px 12px", borderRadius: 7,
                  fontSize: 11, fontWeight: 800,
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
          <>
            <p style={{ textAlign: "center", color: "#8a96aa", fontSize: 12, marginTop: 12 }}>
              {isFr ? "← Glissez pour voir tous les comptes →" : "← Swipe to see all accounts →"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginTop: 32 }}>
              <img src="/MT5 ROND TRANSPARENT.png" alt="MetaTrader 5" style={{ width: "calc(100vw - 2cm)", maxWidth: 340, height: "auto", objectFit: "contain" }} />
              <img src="/$400K.png" alt="400K" style={{ width: "calc(100vw - 2cm)", maxWidth: 340, height: "auto", objectFit: "contain" }} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
