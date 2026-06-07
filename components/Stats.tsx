"use client";
import { useLanguage } from "@/lib/LanguageContext";
import { useState, useEffect } from "react";

export default function Stats() {
  const { T } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const stats = [
    { value: "$24,800+", label: T.stats.payouts },
    { value: "37+",      label: T.stats.traders },
    { value: "98%",      label: T.stats.satisfaction },
    { value: "<24h",     label: T.stats.support },
  ];

  return (
    <section style={{ padding: "40px 16px 80px", backgroundColor: "transparent" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
          gap: isMobile ? 1 : 0,
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.75)",
          boxShadow: "0 8px 32px rgba(21,101,192,0.12), 0 1px 0 rgba(255,255,255,0.9) inset",
          overflow: "hidden",
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              textAlign: "center",
              padding: isMobile ? "24px 16px" : "40px 24px",
              background: "#fff",
              borderRight: !isMobile && i < stats.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none",
              borderBottom: isMobile && i < 2 ? "1px solid rgba(21,101,192,0.08)" : "none",
            }}>
              <div style={{
                fontSize: isMobile ? "1.6rem" : "clamp(1.8rem, 3.5vw, 2.6rem)",
                fontWeight: 900,
                color: "#1565C0",
                letterSpacing: "-1px",
                marginBottom: 6,
              }}>
                {stat.value}
              </div>
              <div style={{ color: "#8a96aa", fontSize: 11, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
