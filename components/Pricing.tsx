"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const accounts = [
  { size: "$50,000",  id: "50k",  price2step: "€299", price1step: "€249", popular: false },
  { size: "$100,000", id: "100k", price2step: "€449", price1step: "€399", popular: true  },
  { size: "$200,000", id: "200k", price2step: "€899", price1step: "€849", popular: false },
];

export default function Pricing() {
  const [model, setModel] = useState<"2step" | "1step">("2step");
  const { T } = useLanguage();
  const features = model === "2step" ? T.pricing.features2 : T.pricing.features1;

  return (
    <section id="pricing" style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span style={{ color: "#2D7DD2", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 16 }}>{T.pricing.label}</span>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>
            {T.pricing.title} <span className="gold-gradient">{T.pricing.titleGold}</span>
          </h2>
          <p style={{ color: "#666", fontSize: 16 }}>{T.pricing.sub}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 48 }}>
          <div style={{ backgroundColor: #1E1E26, border: "1px solid #222", borderRadius: 12, padding: 4, display: "flex", gap: 4 }}>
            {(["2step", "1step"] as const).map(m => (
              <button key={m} onClick={() => setModel(m)} style={{
                padding: "10px 28px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 700, letterSpacing: "0.5px", transition: "all 0.2s",
                backgroundColor: model === m ? "#2D7DD2" : "transparent",
                color: model === m ? "#000" : "#666",
              }}>
                {m === "2step" ? T.pricing.twoStep : T.pricing.oneStep}
              </button>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: #1E1E26, border: "1px solid #2A2A38", borderRadius: 16, padding: "24px 32px", marginBottom: 40, maxWidth: 800, margin: "0 auto 40px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {features.slice(0, 4).map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Check size={16} color="#2D7DD2" />
                <span style={{ color: "#A0A0A0", fontSize: 13 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          {accounts.map((acc, i) => (
            <div key={i} className={acc.popular ? "card-featured" : "card"} style={{ padding: "32px 24px", textAlign: "center", flex: "1 1 180px", maxWidth: 220, position: "relative" }}>
              {acc.popular && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", backgroundColor: "#2D7DD2", color: "#000", fontSize: 11, fontWeight: 800, padding: "4px 16px", borderRadius: 100, letterSpacing: "1px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {T.pricing.mostPopular}
                </div>
              )}
              <div style={{ color: "#666", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>{T.pricing.account}</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#2D7DD2", marginBottom: 4 }}>{acc.size}</div>
              <div style={{ fontSize: 32, fontWeight: 900, marginBottom: 24 }}>{model === "2step" ? acc.price2step : acc.price1step}</div>
              <a href={`/checkout?product=${acc.id}-${model}`} className={acc.popular ? "btn-primary" : "btn-secondary"} style={{ display: "block", textAlign: "center", padding: "12px 20px", fontSize: 13 }}>
                {T.pricing.getStarted}
              </a>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 64, maxWidth: 700, margin: "64px auto 0" }}>
          <h3 style={{ textAlign: "center", fontSize: 13, fontWeight: 700, marginBottom: 32, color: "#555", letterSpacing: "2px" }}>{T.pricing.allInclude}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "rgba(45,125,210,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={12} color="#2D7DD2" />
                </div>
                <span style={{ color: "#888", fontSize: 14 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
