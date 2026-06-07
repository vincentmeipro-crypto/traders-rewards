"use client";
import { useLanguage } from "@/lib/LanguageContext";

const ICONS = ["◎", "◈", "◉"];

export default function HowItWorks() {
  const { T } = useLanguage();
  return (
    <section id="how-it-works" style={{ padding: "100px 24px", backgroundColor: "transparent", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/hero-section-bg.png')", backgroundSize: "cover", backgroundPosition: "center", opacity: 1, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span className="section-label" style={{ display: "block", marginBottom: 16 }}>{T.how.label}</span>
          <h2 style={{
            fontFamily: "var(--font-cormorant)",
            fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
            fontWeight: 600,
            color: "#0D1B3E",
            letterSpacing: "1px",
            marginBottom: 16,
          }}>
            {T.how.title} <em style={{ color: "#0D1B3E", fontStyle: "italic" }}>{T.how.titleGold}</em>
          </h2>
          <p style={{ color: "#4a5568", fontSize: 17, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>{T.how.sub}</p>
        </div>

        {/* Steps */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {T.how.steps.map((step, i) => (
            <div key={i} style={{
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: 20,
              padding: "44px 36px",
              position: "relative",
              boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
              transition: "all 0.25s ease",
            }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = "0 12px 40px rgba(27,79,216,0.1)"; e.currentTarget.style.transform = "translateY(-4px)"; }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "none"; }}
            >
              {/* Step number */}
              <div style={{
                fontSize: 72,
                fontWeight: 900,
                color: "rgba(27,79,216,0.06)",
                lineHeight: 1,
                marginBottom: 24,
                fontFamily: "var(--font-cormorant)",
                letterSpacing: "-2px",
              }}>0{i + 1}</div>

              {/* Icon badge */}
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: i === 1 ? "#1565C0" : "rgba(27,79,216,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20,
                border: i === 1 ? "none" : "1px solid rgba(27,79,216,0.15)",
              }}>
                <span style={{ color: i === 1 ? "#fff" : "#1B4FD8", fontSize: 20 }}>{ICONS[i]}</span>
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1565C0", marginBottom: 12, letterSpacing: "-0.3px" }}>{step.title}</h3>
              <p style={{ color: "#4a5568", fontSize: 15, lineHeight: 1.75 }}>{step.desc}</p>

              {/* Connector line (not last) */}
              {i < T.how.steps.length - 1 && (
                <div style={{
                  position: "absolute", right: -12, top: "50%",
                  width: 24, height: 1,
                  background: "linear-gradient(to right, rgba(27,79,216,0.2), transparent)",
                  display: "none",
                }} />
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
