"use client";
import { useLanguage } from "@/lib/LanguageContext";

export default function HowItWorks() {
  const { T } = useLanguage();
  return (
    <section id="how-it-works" style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 16 }}>{T.how.label}</span>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-1px" }}>
            {T.how.title} <span className="gold-gradient">{T.how.titleGold}</span>
          </h2>
          <p style={{ color: "#666", marginTop: 16, fontSize: 16, maxWidth: 500, margin: "16px auto 0" }}>{T.how.sub}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {T.how.steps.map((step, i) => (
            <div key={i} className="card" style={{ padding: "40px 32px" }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: "rgba(201,168,76,0.08)", lineHeight: 1, marginBottom: 24, letterSpacing: "-2px" }}>0{i + 1}</div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #A07830, #C9A84C)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <span style={{ color: "#000", fontWeight: 900, fontSize: 16 }}>{i + 1}</span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, letterSpacing: "-0.5px" }}>{step.title}</h3>
              <p style={{ color: "#666", fontSize: 15, lineHeight: 1.7 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
