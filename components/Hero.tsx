"use client";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
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

function LiveRewardCard() {
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
      background: "#111111",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 16,
      padding: "20px 24px",
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #444, #888)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: 16,
      }}>{t.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
          <img src={`https://flagcdn.com/40x30/${t.flag}.png`} alt="" style={{ width: 20, height: 15, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
        </div>
        <div style={{ color: "#9CA3AF", fontSize: 12 }}>{t.size} · Récompense reçue</div>
      </div>
      <div style={{ color: "#FFFFFF", fontWeight: 900, fontSize: 24, flexShrink: 0 }}>{fmt(amount)}</div>
    </div>
  );
}

export default function Hero() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <>
      <style>{`
        @keyframes flagFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        .flag-float { animation: flagFloat 2.4s ease-in-out infinite; }
        .hero-pill {
          display: inline-block;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 100px;
          padding: 7px 28px;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .h1 { animation: fadeUp 0.7s ease forwards; }
        .h2 { animation: fadeUp 0.7s ease 0.15s forwards; opacity: 0; }
        .h3 { animation: fadeUp 0.7s ease 0.3s forwards; opacity: 0; }
        .h4 { animation: fadeUp 0.7s ease 0.45s forwards; opacity: 0; }
        .hero-btn-primary {
          display: inline-block; text-align: center;
          padding: 16px 40px; border-radius: 8px;
          font-size: 13px; font-weight: 800; letter-spacing: 1.5px;
          text-transform: uppercase; text-decoration: none;
          background: #FFFFFF; color: #000000;
          transition: opacity 0.2s;
        }
        .hero-btn-primary:hover { opacity: 0.85; }
        .hero-btn-secondary {
          display: inline-block; text-align: center;
          padding: 14px 32px; border-radius: 8px;
          font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; text-decoration: none;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: rgba(255,255,255,0.8);
          transition: border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .hero-btn-secondary:hover { border-color: rgba(255,255,255,0.7); color: #FFFFFF; }
      `}</style>

      <section style={{
        background: "#000000",
        paddingTop: isMobile
          ? "calc(60px + var(--promo-banner-height, 0px) + 24px)"
          : "calc(72px + var(--promo-banner-height, 0px) + 32px)",
        paddingBottom: isMobile ? 0 : 32,
        paddingLeft: isMobile ? 24 : 80,
        paddingRight: isMobile ? 24 : 80,
      }}>
        <div style={{
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}>

          {/* Neon phrase fixe */}
          <div style={{ marginBottom: isMobile ? 16 : 32, padding: isMobile ? "0 20px" : 0, width: "100%", boxSizing: "border-box" as const }}>
            <div className="hero-pill">
              <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "0.3px", whiteSpace: isMobile ? "normal" : "nowrap", textAlign: "center", lineHeight: 1.5 }}>
                {isFr ? "Le programme Français qui récompense les traders disciplinés" : isEs ? "El programa que recompensa a los traders disciplinados" : "The program that rewards disciplined traders"}
              </span>
            </div>
          </div>

          <h1 className="h1" style={{
            fontWeight: 900,
            color: "#FFFFFF",
            lineHeight: 1.05,
            margin: isMobile ? "0 0 16px" : "0 0 40px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            <span style={{
              fontSize: isMobile ? "clamp(1.4rem, 6vw, 2rem)" : "clamp(2rem, 4vw, 5rem)",
              letterSpacing: isMobile ? "-0.5px" : "-1px",
              color: "#FFFFFF",
              fontWeight: 700,
              display: "block",
              marginBottom: isMobile ? 6 : 10,
            }}>
              {isFr
                ? <>Transformez votre trading <span style={{ color: "#5DC241" }}>démo</span></>
                : isEs
                  ? <>Transforma tu trading <span style={{ color: "#5DC241" }}>demo</span></>
                  : "Turn your trading skills"}
            </span>
            <span style={{
              fontSize: isMobile ? "clamp(2.2rem, 11vw, 3.5rem)" : "clamp(3rem, 5.8vw, 8rem)",
              letterSpacing: isMobile ? "-1px" : "-4px",
              color: "#FFFFFF",
              fontWeight: 900,
              display: "block",
              textTransform: "uppercase",
            }}>
              {isFr ? "en vraies récompenses" : isEs ? "en verdaderas recompensas" : "into real rewards"}
            </span>
          </h1>

          <div className="h2" style={{ textAlign: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 600 }}>
              {isFr ? "Trading Simulé · Programme éducatif récompensé" : isEs ? "Trading Simulado · Programa educativo recompensado" : "Simulated Trading · Rewarded educational program"}
            </span>
          </div>

        </div>
      </section>
    </>
  );
}
