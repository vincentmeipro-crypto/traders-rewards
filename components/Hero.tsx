"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

export default function Hero() {
  const { T } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const stats = [
    { label: T.hero.maxFunding, value: "$400K" },
    { label: T.hero.profitSplit, value: "Up to 90%" },
    { label: T.hero.feeRefunded, value: "1st Payout" },
    { label: "No Time Limit", value: "∞" },
  ];

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? "100px 20px 60px" : "120px 24px 80px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Subtle radial glow */}
      <div style={{
        position: "absolute",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600,
        height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(45,125,210,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Badge */}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(45,125,210,0.1)",
        border: "1px solid rgba(45,125,210,0.3)",
        borderRadius: 100,
        padding: "6px 16px",
        marginBottom: 28,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#2D7DD2", display: "inline-block" }} />
        <span style={{ color: "#2D7DD2", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>
          {T.hero.badge}
        </span>
      </div>

      {/* Title */}
      <h1 style={{
        fontSize: isMobile ? "clamp(2.6rem, 12vw, 3.5rem)" : "clamp(3rem, 8vw, 5.5rem)",
        fontWeight: 900,
        letterSpacing: "-2px",
        lineHeight: 1.05,
        maxWidth: 900,
        marginBottom: 20,
      }}>
        {T.hero.headline1}{" "}
        <span className="gold-gradient">{T.hero.headline2}</span>
      </h1>

      {/* Subtitle */}
      <p style={{
        color: "#666",
        fontSize: isMobile ? 15 : 18,
        maxWidth: 560,
        lineHeight: 1.7,
        marginBottom: 40,
      }}>
        {T.hero.sub}
      </p>

      {/* CTAs */}
      <div style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        justifyContent: "center",
        marginBottom: 56,
        width: isMobile ? "100%" : "auto",
      }}>
        <a href="#pricing" className="btn-primary btn-primary-animated"
          style={{ fontSize: 14, padding: "16px 36px", flex: isMobile ? "1" : "none" }}>
          {T.hero.cta1}
        </a>
        <a href="#how-it-works" className="btn-secondary"
          style={{ fontSize: 14, padding: "16px 36px", flex: isMobile ? "1" : "none" }}>
          {T.hero.cta2}
        </a>
      </div>

      {/* Stats bar */}
      {isMobile ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          width: "100%",
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid #2A2A38",
          borderRadius: 16,
          overflow: "hidden",
        }}>
          {stats.map((item, i) => (
            <div key={item.label} style={{
              padding: "16px 12px",
              textAlign: "center",
              borderRight: i % 2 === 0 ? "1px solid #2A2A38" : "none",
              borderBottom: i < 2 ? "1px solid #2A2A38" : "none",
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{item.value}</div>
              <div style={{ fontSize: 10, color: "#555", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.8px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.03)",
          border: "1px solid #2A2A38",
          borderRadius: 16,
          overflow: "hidden",
        }}>
          {stats.map((item, i, arr) => (
            <div key={item.label} style={{
              padding: "20px 40px",
              textAlign: "center",
              borderRight: i < arr.length - 1 ? "1px solid #2A2A38" : "none",
            }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>{item.value}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 4, textTransform: "uppercase", letterSpacing: "1px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
