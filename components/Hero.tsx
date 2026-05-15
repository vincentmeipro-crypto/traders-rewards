"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

// Candle data: [bull, bodyY1, bodyY2, wickY1, wickY2]
// Uptrend pattern, prices rising left→right
const CANDLES: [boolean, number, number, number, number][] = [
  [true,  157, 226, 134, 249],
  [false, 150, 191, 127, 211],
  [true,  134, 196, 118, 219],
  [false, 127, 169, 105, 187],
  [true,  105, 173,  89, 196],
  [false, 100, 141,  82, 157],
  [true,   82, 146,  66, 164],
  [false,  77, 118,  59, 134],
  [true,   54, 123,  36, 141],
  [false,  50,  89,  31, 105],
];

function CandleChart({ side }: { side: "left" | "right" }) {
  const W = 240;
  const H = 320;
  const candleW = 13;
  const spacing = 22;

  const isRight = side === "right";

  return (
    <div style={{
      position: "absolute",
      top: "50%",
      transform: isRight ? "translateY(-50%) scaleX(-1)" : "translateY(-50%)",
      left: isRight ? undefined : 0,
      right: isRight ? 0 : undefined,
      width: W,
      height: H,
      pointerEvents: "none",
      zIndex: 0,
    }}>
      <svg width={W} height={H}>
        <defs>
          <linearGradient id={`g-${side}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.3" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`m-${side}`}>
            <rect width={W} height={H} fill={`url(#g-${side})`} />
          </mask>
        </defs>
        <g mask={`url(#m-${side})`}>
          {CANDLES.map(([bull, bodyY1, bodyY2, wickY1, wickY2], i) => {
            const cx = i * spacing + (spacing - candleW) / 2 + 4;
            const color = bull ? "#2D7DD2" : "#FFFFFF";
            return (
              <g key={i}>
                <line
                  x1={cx + candleW / 2} y1={wickY1}
                  x2={cx + candleW / 2} y2={wickY2}
                  stroke={color} strokeWidth={1.5} strokeOpacity={0.5}
                />
                <rect
                  x={cx} y={bodyY1}
                  width={candleW} height={bodyY2 - bodyY1}
                  fill={color} fillOpacity={0.55}
                  rx={2}
                />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

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

      {/* Candlestick decorations - desktop only */}
      {!isMobile && <CandleChart side="left" />}
      {!isMobile && <CandleChart side="right" />}

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
        zIndex: 0,
      }} />

      {/* Content — above candles */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          backgroundColor: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 100,
          padding: "6px 16px",
          marginBottom: 28,
        }}>
          <span style={{ fontSize: 12 }}>★</span>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase" }}>
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
          {T.hero.headline1}<br />
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
      </div>
    </section>
  );
}
