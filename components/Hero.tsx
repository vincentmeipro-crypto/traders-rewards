"use client";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";

// Candle data: [bull, bodyY1, bodyY2, wickY1, wickY2]
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

const TRADERS = [
  { name: "TheBullTrader",  flag: "de", payout: 4200, size: "$100K", color: "#ef4444", initials: "TB" },
  { name: "Alexandre P.",   flag: "fr", payout: 3850, size: "$100K", color: "#2D7DD2", initials: "AP" },
  { name: "Thomas N.",      flag: "nl", payout: 2600, size: "$100K", color: "#a855f7", initials: "TN" },
  { name: "Jean-Pierre D.", flag: "fr", payout: 4650, size: "$100K", color: "#f59e0b", initials: "JP" },
  { name: "Marco V.",       flag: "it", payout: 3100, size: "$100K", color: "#3b82f6", initials: "MV" },
  { name: "Mathieu R.",     flag: "fr", payout: 3750, size: "$100K", color: "#22c55e", initials: "MR" },
  { name: "Nicolas B.",     flag: "fr", payout: 2950, size: "$100K", color: "#06b6d4", initials: "NB" },
  { name: "Camille F.",     flag: "fr", payout: 1850, size: "$50K",  color: "#06b6d4", initials: "CF" },
  { name: "Karim B.",       flag: "fr", payout: 2200, size: "$50K",  color: "#2D7DD2", initials: "KB" },
  { name: "Stefan B.",      flag: "at", payout: 4100, size: "$100K", color: "#f59e0b", initials: "SB" },
  { name: "Sarah L.",       flag: "gb", payout:  980, size: "$25K",  color: "#22c55e", initials: "SL" },
  { name: "Carlos G.",      flag: "es", payout: 1450, size: "$50K",  color: "#2D7DD2", initials: "CG" },
  { name: "Lucas M.",       flag: "fr", payout:  420, size: "$10K",  color: "#22c55e", initials: "LM" },
  { name: "Emma R.",        flag: "fr", payout:  360, size: "$10K",  color: "#f59e0b", initials: "ER" },
  { name: "Yann T.",        flag: "fr", payout:  480, size: "$10K",  color: "#2D7DD2", initials: "YT" },
];

function fmt(n: number): string {
  return "€" + Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const ENTER_MS = 550;
const HOLD_MS  = 2800;
const EXIT_MS  = 450;
const TOTAL_MS = ENTER_MS + HOLD_MS + EXIT_MS;

function RewardCard({ lang, isMobile }: { lang: string; isMobile: boolean }) {
  const [idx, setIdx]       = useState(0);
  const [amount, setAmount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const trader = TRADERS[idx];

    const t1 = setTimeout(() => {
      if (cancelled) return;
      const start = performance.now();
      const dur = 700;
      const tick = (now: number) => {
        if (cancelled) return;
        const p    = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setAmount(Math.round(ease * trader.payout));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
        else        setAmount(trader.payout);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, ENTER_MS);

    const t2 = setTimeout(() => {
      if (!cancelled) {
        setAmount(0);
        setIdx(i => (i + 1) % TRADERS.length);
      }
    }, TOTAL_MS + 80);

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [idx]);

  const t = TRADERS[idx];
  const enterPct = ((ENTER_MS / TOTAL_MS) * 100).toFixed(2);
  const holdPct  = (((ENTER_MS + HOLD_MS) / TOTAL_MS) * 100).toFixed(2);

  return (
    <div style={{ width: "100%", maxWidth: 420, margin: "0 auto", position: "relative" }}>

      {/* Glow behind card */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 420, height: 200,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(ellipse, ${t.color}20 0%, transparent 70%)`,
        pointerEvents: "none",
        transition: "background 1s ease",
      }} />

      {/* Card */}
      <div
        key={idx}
        style={{
          background: "linear-gradient(160deg, #09090f 0%, #0d1120 100%)",
          border: `1.5px solid ${t.color}55`,
          borderRadius: 20,
          padding: isMobile ? "16px 16px" : "22px 28px",
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 12 : 20,
          position: "relative",
          overflow: "hidden",
          boxShadow: `0 0 70px ${t.color}22, 0 16px 50px rgba(0,0,0,0.7)`,
          animation: `heroReward ${TOTAL_MS}ms linear forwards`,
        }}
      >
        {/* Top bar */}
        <div style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: 2,
          background: `linear-gradient(to right, transparent, ${t.color}, transparent)`,
        }} />

        {/* Left: avatar + flag */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: isMobile ? 40 : 52, height: isMobile ? 40 : 52, borderRadius: "50%",
            background: `${t.color}1a`,
            border: `2px solid ${t.color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: isMobile ? 11 : 14, fontWeight: 900, color: t.color,
            boxShadow: `0 0 20px ${t.color}40`,
          }}>
            {t.initials}
          </div>
          <img
            src={`https://flagcdn.com/24x18/${t.flag}.png`}
            alt=""
            style={{
              position: "absolute", bottom: -3, right: -7,
              width: 18, height: 13, borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.18)", objectFit: "cover",
            }}
          />
        </div>

        {/* Center: name + badge */}
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginBottom: 4,
          }}>
            <span style={{
              display: "inline-block", width: 6, height: 6, borderRadius: "50%",
              background: "#22c55e",
              boxShadow: "0 0 8px #22c55e",
              animation: "heroPulseDot 1.5s ease-in-out infinite",
              flexShrink: 0,
            }} />
            <span style={{ color: t.color, fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase" }}>
              {lang === "fr" ? "Récompense versée" : "Reward Paid"}
            </span>
          </div>
          <div style={{ fontWeight: 800, fontSize: isMobile ? 12 : 15, color: "#fff", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isMobile ? 88 : 160 }}>
            {t.name}
          </div>
          <div style={{ fontSize: isMobile ? 10 : 11, color: "#30304a", marginTop: 2 }}>
            Trader · {t.size}
          </div>
        </div>

        {/* Right: BIG amount */}
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "auto", minWidth: isMobile ? 90 : 165 }}>
          <div style={{
            fontSize: isMobile ? "clamp(1.3rem, 5.5vw, 1.6rem)" : "clamp(1.8rem, 5vw, 2.4rem)",
            fontWeight: 900, color: "#22c55e", lineHeight: 1,
            letterSpacing: "-1px",
            fontVariantNumeric: "tabular-nums",
            textShadow: "0 0 40px rgba(34,197,94,0.7), 0 0 80px rgba(34,197,94,0.3)",
            whiteSpace: "nowrap",
          }}>
            {fmt(amount)}
          </div>
          <div style={{ fontSize: 9, color: "#1e1e2e", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 3 }}>
            {lang === "fr" ? "Récompense" : "Reward"}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes heroReward {
          0%          { opacity: 0; transform: translateY(32px) scale(0.9);  animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
          ${enterPct}% { opacity: 1; transform: translateY(0px)  scale(1);   animation-timing-function: linear; }
          ${holdPct}%  { opacity: 1; transform: translateY(0px)  scale(1);   animation-timing-function: ease-in; }
          100%        { opacity: 0; transform: translateY(-18px) scale(0.96); }
        }
        @keyframes heroPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

function CandleChart({ side }: { side: "left" | "right" }) {
  const W = 520;
  const H = 900;
  const candleW = 26;
  const spacing = 44;
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
      zIndex: 2,
    }}>

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
              <g key={i}>
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
  const { T, lang } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: isMobile ? "flex-start" : "center",
      padding: isMobile ? "56px 20px 20px" : "60px 24px 40px",
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

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>

        {/* Logo texte — order 1 */}
        <img
          src="/logo-elysium-rewards.png"
          alt="Elysium Rewards"
          style={{ order: 1, height: isMobile ? 110 : 200, width: "auto", objectFit: "contain", marginBottom: isMobile ? -18 : -38 }}
        />

        {/* Reward card — order 2 desktop, order 5 mobile */}
        <div style={{
          order: isMobile ? 5 : 2,
          width: "100%",
          maxWidth: 480,
          marginBottom: isMobile ? 20 : 20,
          padding: isMobile ? "0 16px" : undefined,
        }}>
          <RewardCard lang={lang} isMobile={isMobile} />
        </div>

        {/* Title — order 3 desktop, order 2 mobile */}
        <h1 style={{
          order: isMobile ? 2 : 3,
          fontSize: isMobile ? "clamp(2rem, 8.5vw, 2.6rem)" : "clamp(2.8rem, 4.5vw, 4.2rem)",
          fontWeight: 900,
          letterSpacing: "-2px",
          lineHeight: 1.1,
          maxWidth: 1300,
          marginBottom: isMobile ? 6 : 16,
        }}>
          {T.hero.headline1}<br />
          {T.hero.headline2}
        </h1>

        {/* Subtitle — order 4 desktop, order 3 mobile */}
        <p style={{
          order: isMobile ? 3 : 4,
          color: isMobile ? "#666" : "#00C2FF",
          fontSize: isMobile ? 15 : 17,
          maxWidth: isMobile ? 560 : "none",
          whiteSpace: isMobile ? "normal" : "nowrap",
          lineHeight: 1.7,
          marginBottom: isMobile ? 10 : 24,
          textShadow: isMobile ? "none" : "0 0 24px rgba(0,194,255,0.45)",
        }}>
          {T.hero.sub}
        </p>

        {/* CTAs — order 5 desktop, order 4 mobile */}
        <div style={{
          order: isMobile ? 4 : 5,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: isMobile ? 10 : 28,
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

        {/* Promo Banner — order 6 (toujours en dernier) */}
        <div style={{
          order: 6,
          width: `calc(100% + ${isMobile ? 40 : 48}px)`,
          marginLeft: isMobile ? -20 : -24,
        }}>
          <a href="/#pricing" style={{ display: "block", cursor: "pointer" }}>
            <img src={isMobile ? "/PROMO40MOBILE.png" : "/PROMO40PC.png"} alt="Promotion" style={{ width: isMobile ? "100%" : "51%", display: "block", margin: "0 auto" }} />
          </a>
          <div style={{ padding: isMobile ? "0 16px 24px" : "0 20% 32px" }}>
            <a href="/#pricing" style={{
              display: "block", width: "100%", padding: isMobile ? "16px 0" : "18px 0",
              background: "#ffffff",
              borderRadius: 14,
              textAlign: "center", color: "#000", fontWeight: 800,
              fontSize: isMobile ? 14 : 16, letterSpacing: "1.5px",
              textDecoration: "none", textTransform: "uppercase", boxSizing: "border-box",
              boxShadow: "0 4px 24px rgba(255,255,255,0.18), 0 1px 4px rgba(0,0,0,0.18)",
              border: "none",
              transition: "box-shadow 0.2s, transform 0.2s",
            }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = "0 8px 36px rgba(255,255,255,0.28)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(255,255,255,0.18), 0 1px 4px rgba(0,0,0,0.18)"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              PROFITEZ MAINTENANT DE LA PROMOTION −40%
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
