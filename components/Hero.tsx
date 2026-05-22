"use client";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

// Candle data: [bull, bodyY1, bodyY2, wickY1, wickY2]
// Uptrend pattern, prices rising left→right
const CANDLES: [boolean, number, number, number, number][] = [
  [true,  314, 452, 268, 498],
  [false, 300, 382, 254, 422],
  [true,  268, 392, 236, 438],
  [false, 254, 338, 210, 374],
  [true,  210, 346, 178, 392],
  [false, 200, 282, 164, 314],
  [true,  164, 292, 132, 328],
  [false, 154, 236, 118, 268],
  [true,  108, 246,  72, 282],
  [false, 100, 178,  62, 210],
];


function CandleChart({ side }: { side: "left" | "right" }) {
  const W = 520;
  const H = 900;
  const candleW = 26;
  const spacing = 44;
  const isRight = side === "right";
  const DURATION = 2.8;
  const STEP = 0.18;

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
      zIndex: 2,
    }}>
      <style>{`
        @keyframes candleWave {
          0%, 100% { transform: translateY(0px); opacity: 1; }
          50%       { transform: translateY(22px); opacity: 0.6; }
        }
      `}</style>

      <svg width={W} height={H}>
        <defs>
          <linearGradient id={`g-${side}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
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
              <g key={i} style={{
                animation: `candleWave ${DURATION}s ease-in-out infinite`,
                animationDelay: `${i * STEP - CANDLES.length * STEP}s`,
              }}>
                <line
                  x1={cx + candleW / 2} y1={wickY1}
                  x2={cx + candleW / 2} y2={wickY2}
                  stroke={color} strokeWidth={1.5} strokeOpacity={0.75}
                />
                <rect
                  x={cx} y={bodyY1}
                  width={candleW} height={bodyY2 - bodyY1}
                  fill={color} fillOpacity={0.8}
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
    { label: T.hero.maxFunding, value: "$200K" },
    { label: T.hero.profitSplit, value: "Up to 90%" },
    { label: T.hero.feeRefunded, value: "1st Reward" },
    { label: "No Time Limit", value: "∞" },
  ];

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? "120px 20px 60px" : "180px 24px 80px",
      textAlign: "center",
      position: "relative",
      backgroundColor: "#000000",
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


        {/* Title */}
        <h1 style={{
          fontSize: isMobile ? "clamp(2.2rem, 9vw, 3rem)" : "clamp(2.8rem, 4.5vw, 4.2rem)",
          fontWeight: 900,
          letterSpacing: "-2px",
          lineHeight: 1.1,
          maxWidth: 1300,
          marginBottom: 20,
        }}>
          {T.hero.headline1}<br />
          {T.hero.headline2}
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
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
          width: isMobile ? "100%" : "auto",
          padding: isMobile ? "0 16px" : undefined,
        }}>
          <a href="#pricing" className="btn-primary btn-primary-animated"
            style={{ fontSize: 14, padding: "16px 36px", width: isMobile ? "100%" : "auto", textAlign: "center" }}>
            {T.hero.cta1}
          </a>
          <a href="#how-it-works" className="btn-secondary"
            style={{ fontSize: 14, padding: "16px 36px", width: isMobile ? "100%" : "auto", textAlign: "center" }}>
            {T.hero.cta2}
          </a>
        </div>

        {/* Promo Banner */}
        <div style={{ width: "100vw", position: "relative", left: "50%", transform: "translateX(-50%)", marginTop: 0 }}>
          <a href="/#pricing" style={{ display: "block", cursor: "pointer" }}>
            <img src={isMobile ? "/PROMO50MOBILE.png" : "/PROMO50ENG.png"} alt="Promotion" style={{ width: isMobile ? "100%" : "60%", display: "block", margin: "0 auto" }} />
          </a>
          <div style={{ padding: isMobile ? "0 16px 24px" : "0 20% 32px" }}>
            <a href="/#pricing" style={{ display: "block", width: "100%", padding: isMobile ? "18px 0" : "20px 0", backgroundColor: "#22c55e", border: "2px solid #fff", borderRadius: 12, textAlign: "center", color: "#fff", fontWeight: 900, fontSize: isMobile ? 15 : 18, letterSpacing: "1px", textDecoration: "none", textTransform: "uppercase", boxSizing: "border-box" }}>
              PROFITEZ MAINTENANT DE LA PROMOTION −50%
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
