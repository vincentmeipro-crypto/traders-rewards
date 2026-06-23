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
      border: "1px solid rgba(212,175,55,0.35)",
      borderRadius: 16,
      padding: "20px 24px",
      display: "flex", alignItems: "center", gap: 18,
      width: "100%",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #D4AF37, #F6D976)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#000", fontWeight: 800, fontSize: 16,
      }}>{t.initials}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
          <img src={`https://flagcdn.com/40x30/${t.flag}.png`} alt="" style={{ width: 22, height: 16, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
        </div>
        <div style={{ color: "#9CA3AF", fontSize: 13 }}>{t.size} · Récompense reçue</div>
      </div>
      <div style={{ color: "#D4AF37", fontWeight: 900, fontSize: 26, flexShrink: 0 }}>{fmt(amount)}</div>
    </div>
  );
}

export default function Hero() {
  const { T, lang } = useLanguage();
  const isFr = lang === "fr";
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
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .h-anim-1 { animation: fadeUp 0.7s ease forwards; }
        .h-anim-2 { animation: fadeUp 0.7s ease 0.15s forwards; opacity: 0; }
        .h-anim-3 { animation: fadeUp 0.7s ease 0.3s forwards; opacity: 0; }
        .h-anim-4 { animation: fadeUp 0.7s ease 0.45s forwards; opacity: 0; }
        .hero-btn-primary {
          display: block; width: 100%; text-align: center;
          padding: 16px 24px; border-radius: 8px;
          font-size: 13px; font-weight: 800; letter-spacing: 1.5px;
          text-transform: uppercase; text-decoration: none;
          background: #FFFFFF; color: #000000;
          transition: opacity 0.2s;
        }
        .hero-btn-primary:hover { opacity: 0.85; }
        .hero-btn-secondary {
          display: block; width: 100%; text-align: center;
          padding: 14px 24px; border-radius: 8px;
          font-size: 12px; font-weight: 700; letter-spacing: 1.5px;
          text-transform: uppercase; text-decoration: none;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.3);
          color: rgba(255,255,255,0.8);
          transition: border-color 0.2s, color 0.2s;
        }
        .hero-btn-secondary:hover { border-color: rgba(255,255,255,0.7); color: #FFFFFF; }
      `}</style>

      <section style={{
        background: "#0A0A0A",
        paddingTop: isMobile
          ? "calc(60px + var(--promo-banner-height, 0px) + 48px)"
          : "calc(72px + var(--promo-banner-height, 0px) + 64px)",
        paddingBottom: isMobile ? 48 : 80,
        paddingLeft: isMobile ? 24 : 64,
        paddingRight: isMobile ? 24 : 64,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 40 : 80,
        }}>

          {/* COLONNE GAUCHE — Texte */}
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <div className="h-anim-1" style={{
              display: "inline-block",
              fontSize: 11, fontWeight: 700, letterSpacing: "2px",
              textTransform: "uppercase", color: "#D4AF37",
              marginBottom: 20,
            }}>
              {isFr ? "La Prop Firm Française" : "The French Prop Firm"}
            </div>

            <h1 className="h-anim-2" style={{
              fontSize: isMobile ? "clamp(2rem, 9vw, 2.6rem)" : "clamp(2.8rem, 3.8vw, 4rem)",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.08,
              letterSpacing: "-1.5px",
              margin: "0 0 24px",
            }}>
              {isFr
                ? <>Transformez votre<br />trading démo en<br /><span style={{ color: "#D4AF37" }}>vraies récompenses</span></>
                : <>Turn your trading<br />skills into<br /><span style={{ color: "#D4AF37" }}>real rewards</span></>}
            </h1>

            <p className="h-anim-3" style={{
              fontSize: isMobile ? 14 : 16,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 460,
            }}>
              {isFr
                ? "Qui récompense les traders sur toutes disciplines — Forex, Indices, Crypto, Matières premières."
                : "Rewarding traders across all disciplines — Forex, Indices, Crypto, Commodities."}
            </p>
          </div>

          {/* COLONNE DROITE — CTAs + Carte */}
          <div className="h-anim-4" style={{
            flex: "0 0 auto",
            width: isMobile ? "100%" : 380,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            <a href="/#pricing" className="hero-btn-primary">
              {isFr ? "Commencer" : "Get Started"}
            </a>
            <a href="/#how-it-works" className="hero-btn-secondary">
              {isFr ? "Comment ça marche ?" : "How does it work?"}
            </a>
            <div style={{ marginTop: 8 }}>
              <LiveRewardCard />
            </div>
          </div>

        </div>
      </section>
    </>
  );
}
