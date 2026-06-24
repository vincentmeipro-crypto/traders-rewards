"use client";
import { useLanguage } from "@/lib/LanguageContext";

const ICONS = ["◎", "◈", "◉"];

export default function HowItWorks() {
  const { T, lang } = useLanguage();
  return (
    <section id="how-it-works" style={{ padding: "80px 24px", backgroundColor: "#0A0A0A" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#3B82F6", marginBottom: 16 }}>
            {T.how.label}
          </div>
          <h2 style={{
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "-1px",
            marginBottom: 16,
            lineHeight: 1.1,
          }}>
            {T.how.title} <span style={{ color: "#3B82F6" }}>{T.how.titleGold}</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>{T.how.sub}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {T.how.steps.map((step, i) => (
            <div key={i} style={{
              background: "#111111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "36px 28px",
              position: "relative",
              transition: "border-color 0.2s, transform 0.2s",
            }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{
                fontSize: 64,
                fontWeight: 900,
                color: "rgba(255,255,255,0.04)",
                lineHeight: 1,
                marginBottom: 20,
                letterSpacing: "-2px",
              }}>0{i + 1}</div>

              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: i === 1 ? "#3B82F6" : "rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
                border: i === 1 ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}>
                <span style={{ color: i === 1 ? "#000" : "#FFFFFF", fontSize: 18 }}>{ICONS[i]}</span>
              </div>

              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#FFFFFF", marginBottom: 10, letterSpacing: "-0.3px" }}>{step.title}</h3>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.75, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
