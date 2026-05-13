"use client";
import { useLanguage } from "@/lib/LanguageContext";

export default function Rules() {
  const { T } = useLanguage();
  const groups = [
    { title: T.rules.allowed,    color: "#22c55e", items: T.rules.allowedList,    icon: "✓" },
    { title: T.rules.notAllowed, color: "#ef4444", items: T.rules.notAllowedList, icon: "✕" },
  ];

  return (
    <section id="rules" style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 16 }}>{T.rules.label}</span>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-1px" }}>
            {T.rules.title} <span className="gold-gradient">{T.rules.titleGold}</span>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {groups.map((group, i) => (
            <div key={i} className="card" style={{ padding: "36px 32px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 28, color: group.color, textTransform: "uppercase", letterSpacing: "1.5px" }}>{group.title}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {group.items.map((rule, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: group.color, fontSize: 16, marginTop: 1, flexShrink: 0 }}>{group.icon}</span>
                    <span style={{ color: "#888", fontSize: 14, lineHeight: 1.5 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 60, backgroundColor: "#111", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20, padding: "48px 40px", textAlign: "center", background: "linear-gradient(145deg, #0f0f0f, #141208)" }}>
          <h3 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: 16, letterSpacing: "-1px" }}>
            {T.rules.ctaTitle} <span className="gold-gradient">{T.rules.ctaGold}</span>
          </h3>
          <p style={{ color: "#666", fontSize: 16, marginBottom: 32 }}>{T.rules.ctaSub}</p>
          <a href="#pricing" className="btn-primary" style={{ fontSize: 15, padding: "16px 48px" }}>{T.rules.ctaBtn}</a>
        </div>
      </div>
    </section>
  );
}
