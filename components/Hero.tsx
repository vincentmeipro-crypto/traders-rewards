"use client";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const TRADERS = [
  { name: "TheBullTrader",  flag: "de", payout: 4200, size: "$100K", initials: "TB" },
  { name: "Alexandre P.",   flag: "fr", payout: 3850, size: "$100K", initials: "AP" },
  { name: "Thomas N.",      flag: "nl", payout: 2600, size: "$100K", initials: "TN" },
  { name: "Jean-Pierre D.", flag: "fr", payout: 4650, size: "$100K", initials: "JP" },
  { name: "Marco V.",       flag: "it", payout: 3100, size: "$100K", initials: "MV" },
  { name: "Mathieu R.",     flag: "fr", payout: 3750, size: "$100K", initials: "MR" },
  { name: "Nicolas B.",     flag: "fr", payout: 2950, size: "$100K", initials: "NB" },
  { name: "Camille F.",     flag: "fr", payout: 1850, size: "$50K",  initials: "CF" },
  { name: "Karim B.",       flag: "fr", payout: 2200, size: "$50K",  initials: "KB" },
  { name: "Stefan B.",      flag: "at", payout: 4100, size: "$100K", initials: "SB" },
];

function fmt(n: number) {
  return "€" + Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const ENTER_MS = 500;
const HOLD_MS  = 3000;
const EXIT_MS  = 400;
const TOTAL_MS = ENTER_MS + HOLD_MS + EXIT_MS;

function LiveRewardCard({ isMobile }: { isMobile: boolean }) {
  const [idx, setIdx]       = useState(0);
  const [amount, setAmount] = useState(0);
  const [visible, setVisible] = useState(true);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVisible(true);
    const trader = TRADERS[idx];

    const t1 = setTimeout(() => {
      if (cancelled) return;
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const p = Math.min((now - start) / 700, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setAmount(Math.round(ease * trader.payout));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
        else setAmount(trader.payout);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, ENTER_MS);

    const t2 = setTimeout(() => {
      if (!cancelled) {
        setVisible(false);
        setTimeout(() => { if (!cancelled) { setAmount(0); setIdx(i => (i + 1) % TRADERS.length); } }, EXIT_MS);
      }
    }, TOTAL_MS);

    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [idx]);

  const t = TRADERS[idx];
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.98)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
      background: "#fff",
      border: "1px solid rgba(27,79,216,0.15)",
      borderRadius: 16,
      padding: isMobile ? "14px 16px" : "18px 22px",
      boxShadow: "0 8px 40px rgba(27,79,216,0.1), 0 2px 8px rgba(0,0,0,0.04)",
      display: "flex", alignItems: "center", gap: 14,
      minWidth: isMobile ? 240 : 280,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: "linear-gradient(135deg, #1B4FD8, #3b82f6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0,
      }}>{t.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#0D1B3E", fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
        <div style={{ color: "#8a96aa", fontSize: 12 }}>{t.size} · Récompense reçue</div>
      </div>
      <div style={{ color: "#22c55e", fontWeight: 900, fontSize: isMobile ? 16 : 18, flexShrink: 0 }}>{fmt(amount)}</div>
    </div>
  );
}

export default function Hero() {
  const { T, lang } = useLanguage();
  const isFr = lang === "fr";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const stats = [
    { value: "200K€", label: isFr ? "Capital simulé" : "Simulated Capital" },
    { value: "90%", label: isFr ? "Partage profit" : "Profit Split" },
    { value: "24h", label: isFr ? "Récompenses" : "Payouts" },
    { value: "150+", label: isFr ? "Actifs" : "Trading Assets" },
  ];

  const media = ["Bloomberg", "Yahoo Finance", "Benzinga", "MarketWatch", "TradingView"];

  return (
    <>
      <style>{`
        @keyframes waveMove {
          0% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-30px) translateY(10px); }
          100% { transform: translateX(0) translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-animate-1 { animation: fadeUp 0.8s ease forwards; }
        .hero-animate-2 { animation: fadeUp 0.8s ease 0.15s forwards; opacity: 0; }
        .hero-animate-3 { animation: fadeUp 0.8s ease 0.3s forwards; opacity: 0; }
        .hero-animate-4 { animation: fadeUp 0.8s ease 0.45s forwards; opacity: 0; }
        .hero-animate-5 { animation: fadeUp 0.8s ease 0.6s forwards; opacity: 0; }
        .hero-cta {
          display: inline-flex; align-items: center; gap: 10px;
          background: #0D1B3E; color: #fff;
          padding: 16px 40px; border-radius: 6px;
          font-size: 12px; font-weight: 700; letter-spacing: 2px;
          text-transform: uppercase; text-decoration: none;
          transition: background 0.25s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(13,27,62,0.25);
        }
        .hero-cta:hover { background: #1B4FD8; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(27,79,216,0.35); }
      `}</style>

      <section style={{
        minHeight: "100vh",
        backgroundColor: "#FAFBFD",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        paddingTop: 72,
      }}>

        {/* Wave background SVG */}
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dce8ff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f0f6ff" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e8f0ff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fafbfd" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M-100,400 C200,200 400,600 700,350 C1000,100 1200,500 1540,300 L1540,900 L-100,900 Z"
            fill="url(#waveGrad1)" style={{ animation: "waveMove 12s ease-in-out infinite" }} />
          <path d="M-100,550 C150,350 500,700 800,480 C1100,260 1300,600 1540,420 L1540,900 L-100,900 Z"
            fill="url(#waveGrad2)" style={{ animation: "waveMove 16s ease-in-out infinite reverse" }} />
        </svg>

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: isMobile ? "40px 24px" : "60px 24px", maxWidth: 860, width: "100%" }}>

          {/* ER Monogram */}
          <div className="hero-animate-1">
            <img src="/er-monogram.svg" alt="Elysium ER" style={{ height: isMobile ? 80 : 110, width: "auto", marginBottom: 28 }} />
          </div>

          {/* ELYSIUM REWARDS Typography */}
          <div className="hero-animate-2" style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: isMobile ? 52 : 82,
              fontWeight: 600,
              letterSpacing: isMobile ? "12px" : "20px",
              color: "#0D1B3E",
              lineHeight: 1,
              textTransform: "uppercase",
              marginBottom: 10,
            }}>
              ELYSIUM
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ height: 1, width: isMobile ? 40 : 70, background: "linear-gradient(to right, transparent, #8a96aa)" }} />
              <span style={{ fontSize: isMobile ? 11 : 13, fontWeight: 600, letterSpacing: "6px", color: "#8a96aa", textTransform: "uppercase" }}>REWARDS</span>
              <div style={{ height: 1, width: isMobile ? 40 : 70, background: "linear-gradient(to left, transparent, #8a96aa)" }} />
            </div>
          </div>

          {/* Tagline */}
          <div className="hero-animate-3" style={{ marginBottom: 36 }}>
            <p style={{
              fontFamily: "var(--font-cormorant)",
              fontSize: isMobile ? 20 : 26,
              fontWeight: 400,
              fontStyle: "italic",
              color: "#4a5568",
              lineHeight: 1.5,
              maxWidth: 520,
              margin: "0 auto",
            }}>
              {isFr
                ? <>Performez votre trading démo.<br />Recevez de vraies <span style={{ color: "#1B4FD8", fontStyle: "normal", fontWeight: 600 }}>récompenses.</span></>
                : <>Where Trading Performance Meets<br /><span style={{ color: "#1B4FD8", fontStyle: "normal", fontWeight: 600 }}>Real Rewards.</span></>}
            </p>
          </div>

          {/* CTA */}
          <div className="hero-animate-4" style={{ marginBottom: 52 }}>
            <a href="/#pricing" className="hero-cta">
              {isFr ? "Commencer le challenge" : "Start Challenge"}
              <span style={{ fontSize: 16 }}>→</span>
            </a>
          </div>

          {/* Live Reward Card */}
          <div className="hero-animate-4" style={{ marginBottom: 52 }}>
            <LiveRewardCard isMobile={isMobile} />
          </div>

          {/* Stats bar */}
          <div className="hero-animate-5" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 0, flexWrap: "wrap",
            borderTop: "1px solid rgba(0,0,0,0.07)",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            padding: "20px 0", width: "100%",
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ textAlign: "center", padding: isMobile ? "8px 20px" : "8px 36px" }}>
                  <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "#0D1B3E", letterSpacing: "-0.5px" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#8a96aa", fontWeight: 500, marginTop: 2, letterSpacing: "0.5px" }}>{s.label}</div>
                </div>
                {i < stats.length - 1 && <div style={{ width: 1, height: 36, background: "rgba(0,0,0,0.1)" }} />}
              </div>
            ))}
          </div>

          {/* Media logos */}
          <div className="hero-animate-5" style={{ marginTop: 32 }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "2.5px", color: "#b0b8c8", textTransform: "uppercase", marginBottom: 16 }}>
              Trusted by traders worldwide
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 16 : 32, flexWrap: "wrap" }}>
              {media.map((m, i) => (
                <span key={i} style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: "#c0c8d8", letterSpacing: "0.5px", fontFamily: "Georgia, serif" }}>{m}</span>
              ))}
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
