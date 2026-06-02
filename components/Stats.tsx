"use client";
import { useLanguage } from "@/lib/LanguageContext";

export default function Stats() {
  const { T } = useLanguage();
  const stats = [
    { value: "$24,800+", label: T.stats.payouts },
    { value: "37+",      label: T.stats.traders },
    { value: "98%",      label: T.stats.satisfaction },
    { value: "<24h",     label: T.stats.support },
  ];

  return (
    <section style={{ padding: "0 24px 80px", backgroundColor: "transparent" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          background: "#fff",
          borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              textAlign: "center",
              padding: "40px 24px",
              borderRight: i < stats.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none",
            }}>
              <div style={{
                fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
                fontWeight: 900,
                color: "#0D1B3E",
                letterSpacing: "-1px",
                fontFamily: "var(--font-inter)",
                marginBottom: 8,
              }}>
                {stat.value}
              </div>
              <div style={{ color: "#8a96aa", fontSize: 12, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
