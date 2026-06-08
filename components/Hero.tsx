"use client";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const TRADERS = [
  { name: "TheBullTrader",  flag: "de", payout: 4183.27, size: "$100K", initials: "TB" },
  { name: "Alexandre P.",   flag: "fr", payout: 3847.64, size: "$100K", initials: "AP" },
  { name: "Thomas N.",      flag: "nl", payout: 2578.43, size: "$100K", initials: "TN" },
  { name: "Jean-Pierre D.", flag: "fr", payout: 4612.89, size: "$100K", initials: "JP" },
  { name: "Marco V.",       flag: "it", payout: 3094.51, size: "$100K", initials: "MV" },
  { name: "Mathieu R.",     flag: "fr", payout: 3731.18, size: "$100K", initials: "MR" },
  { name: "Nicolas B.",     flag: "fr", payout: 2963.74, size: "$100K", initials: "NB" },
  { name: "Camille F.",     flag: "fr", payout: 1847.32, size: "$50K",  initials: "CF" },
  { name: "Karim B.",       flag: "fr", payout: 2214.67, size: "$50K",  initials: "KB" },
  { name: "Stefan B.",      flag: "at", payout: 4076.93, size: "$100K", initials: "SB" },
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
      background: "rgba(255,255,255,0.6)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1.5px solid rgba(13,27,62,0.7)",
      borderRadius: isMobile ? 17 : 24,
      padding: isMobile ? "10px 11px" : "28px 36px",
      boxShadow: "0 8px 40px rgba(21,101,192,0.15), 0 1px 0 rgba(255,255,255,0.9) inset",
      display: "flex", alignItems: "center", gap: isMobile ? 15 : 22,
      minWidth: isMobile ? 168 : 480,
    }} className="reward-card-glow">
      <div style={{
        width: isMobile ? 50 : 72, height: isMobile ? 50 : 72, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #1565C0, #42A5F5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: isMobile ? 15 : 22,
      }}>{t.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, marginBottom: 4 }}>
          <span style={{ color: "#1565C0", fontWeight: 700, fontSize: isMobile ? 15 : 22, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
          <img src={`https://flagcdn.com/40x30/${t.flag}.png`} alt="" style={{ width: isMobile ? 20 : 28, height: isMobile ? 15 : 21, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
        </div>
        <div style={{ color: "#8a96aa", fontSize: isMobile ? 11 : 16 }}>{t.size} · Récompense reçue</div>
      </div>
      <div style={{ color: "#1565C0", fontWeight: 900, fontSize: isMobile ? 11 : 30, flexShrink: 0 }}>{fmt(amount)}</div>
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
        @keyframes borderGlow {
          0%, 100% { box-shadow: 0 8px 40px rgba(13,27,62,0.15), 0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 1.5px rgba(13,27,62,0.5); }
          50% { box-shadow: 0 8px 40px rgba(13,27,62,0.35), 0 1px 0 rgba(255,255,255,0.9) inset, 0 0 0 2px rgba(13,27,62,1), 0 0 24px rgba(13,27,62,0.3); }
        }
        .reward-card-glow {
          animation: borderGlow 2s ease-in-out infinite !important;
          border: 1.5px solid rgba(13,27,62,0.7) !important;
        }
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
        minHeight: "auto",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        position: "relative",
        overflow: "visible",
        paddingTop: 72,
      }}>

        {/* Mobile : H1 complet — carte centrée */}
        {isMobile ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 24px 0px" }}>
            <h1 className="hero-animate-1" style={{ fontSize: "clamp(2.2rem, 8vw, 2.8rem)", fontWeight: 800, color: "#0D1B3E", lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 28, marginTop: 0 }}>
              {isFr
                ? <>Transformez votre<br />trading démo en<br /><span style={{ color: "#1565C0" }}>vraies récompenses</span></>
                : <>Turn your trading<br />skills into<br /><span style={{ color: "#1565C0" }}>real rewards</span></>}
            </h1>
            <div className="hero-animate-2" style={{ display: "flex", justifyContent: "center" }}>
              <LiveRewardCard isMobile={true} />
            </div>
          </div>
        ) : (
          /* Desktop : H1 + carte absolue en bas */
          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 1200, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 24px 80px" }}>
            {/* App install image — desktop only, bottom-left */}
            <img src="/pwa-install.png" alt="" style={{ position: "absolute", bottom: -50, left: 20, height: 170, width: "auto", zIndex: 10, pointerEvents: "none", userSelect: "none" }} />
            <h1 className="hero-animate-1" style={{ fontSize: "clamp(3.6rem, 5.2vw, 5.2rem)", fontWeight: 800, color: "#0D1B3E", lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 28, whiteSpace: "nowrap" }}>
              {isFr
                ? <>Transformez votre trading démo<br />en <span style={{ color: "#1565C0" }}>vraies récompenses</span></>
                : <>Turn your trading skills<br />into <span style={{ color: "#1565C0" }}>real rewards</span></>}
            </h1>
            <div className="hero-animate-2" style={{ position: "absolute", bottom: -44, left: 0, right: 0, zIndex: 20, display: "flex", justifyContent: "center", alignItems: "center" }}>
              <LiveRewardCard isMobile={false} />
            </div>
          </div>
        )}
      </section>
    </>
  );
}
