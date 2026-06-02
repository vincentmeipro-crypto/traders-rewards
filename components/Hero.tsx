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
        background: "linear-gradient(135deg, #1565C0, #42A5F5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: 14, flexShrink: 0,
      }}>{t.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#0D1B3E", fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
        <div style={{ color: "#8a96aa", fontSize: 12 }}>{t.size} · Récompense reçue</div>
      </div>
      <div style={{ color: "#1565C0", fontWeight: 900, fontSize: isMobile ? 16 : 18, flexShrink: 0 }}>{fmt(amount)}</div>
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
    { value: "150+", label: isFr ? "Actifs" : "Trading Assets" },
  ];

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
          background: #1565C0; color: #fff;
          padding: 16px 40px; border-radius: 8px;
          font-size: 13px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; text-decoration: none;
          transition: background 0.25s, transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(21,101,192,0.3);
        }
        .hero-cta:hover { background: #0D47A1; transform: translateY(-2px); box-shadow: 0 8px 30px rgba(21,101,192,0.4); }
      `}</style>

      <section style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #ffffff 0%, #D6EDFF 60%, #B8DFFF 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        paddingTop: 72,
      }}>

        {/* Subtle radial glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 60% at 50% 80%, rgba(100,181,246,0.18) 0%, transparent 70%)",
        }} />

        {/* Content — centré vertical */}
        <div style={{
          position: "relative", zIndex: 1, width: "100%", maxWidth: 860,
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
          padding: isMobile ? "40px 24px 60px" : "40px 24px 60px",
        }}>

          {/* H1 — 2 lignes, centré, très grand */}
          <h1 className="hero-animate-1" style={{
            fontSize: isMobile ? "clamp(2.4rem, 9vw, 3rem)" : "clamp(3.2rem, 5vw, 5rem)",
            fontWeight: 800,
            color: "#0D1B3E",
            lineHeight: 1.1,
            letterSpacing: "-1.5px",
            marginBottom: 32,
          }}>
            {isFr
              ? <>Transformez votre trading démo<br />en <span style={{ color: "#1565C0" }}>vraies récompenses.</span></>
              : <>Turn your trading skills<br />into <span style={{ color: "#1565C0" }}>real rewards.</span></>}
          </h1>

          {/* Carte animée */}
          <div className="hero-animate-2" style={{ marginBottom: 32, width: "100%", display: "flex", justifyContent: "center" }}>
            <LiveRewardCard isMobile={isMobile} />
          </div>

          {/* CTA */}
          <div className="hero-animate-3" style={{ marginBottom: 32 }}>
            <a href="/#pricing" className="hero-cta">{isFr ? "Commencer le challenge" : "Start Challenge"}</a>
          </div>

          {/* Sous-titre */}
          <p className="hero-animate-4" style={{
            fontSize: isMobile ? 15 : 17,
            color: "#5a7090",
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 480,
          }}>
            {isFr
              ? "Tradez dans un environnement 100% simulé et recevez jusqu'à 90% de vos gains sous forme de récompenses."
              : "Trade in a fully simulated environment and earn up to 90% rewards on your performance."}
          </p>

          {/* Stats */}
          <div className="hero-animate-5" style={{
            display: "flex", gap: 0, justifyContent: "center",
            borderTop: "1px solid rgba(21,101,192,0.12)",
            paddingTop: 24, width: "100%",
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ textAlign: "center", paddingRight: 28 }}>
                  <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "#0D1B3E", letterSpacing: "-0.5px" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#7a90b0", fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                </div>
                {i < stats.length - 1 && <div style={{ width: 1, height: 36, background: "rgba(21,101,192,0.15)", marginRight: 28 }} />}
              </div>
            ))}
          </div>

        </div>
      </section>
    </>
  );
}
