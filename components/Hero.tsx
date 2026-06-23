"use client";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const GOLD = "#D4AF37";
const GRAY = "#9CA3AF";
const DARK_GRAY = "#1F2937";

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
  return "€" + Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const ENTER_MS = 500;
const HOLD_MS  = 3200;
const EXIT_MS  = 400;
const TOTAL_MS = ENTER_MS + HOLD_MS + EXIT_MS;

function LiveRewardCard() {
  const [idx, setIdx]         = useState(0);
  const [amount, setAmount]   = useState(0);
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
        setTimeout(() => {
          if (!cancelled) { setAmount(0); setIdx(i => (i + 1) % TRADERS.length); }
        }, EXIT_MS);
      }
    }, TOTAL_MS);

    return () => {
      cancelled = true; clearTimeout(t1); clearTimeout(t2);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [idx]);

  const t = TRADERS[idx];

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(-6px)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
      background: "rgba(255,255,255,0.04)",
      border: `1px solid rgba(212,175,55,0.25)`,
      borderRadius: 16,
      padding: "20px 28px",
      display: "flex",
      alignItems: "center",
      gap: 20,
      maxWidth: 460,
      width: "100%",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
        background: `linear-gradient(135deg, ${GOLD}33, ${GOLD}66)`,
        border: `1px solid ${GOLD}55`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: GOLD, fontWeight: 800, fontSize: 15,
        fontFamily: "var(--font-montserrat), sans-serif",
      }}>{t.initials}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{
            color: "#fff", fontWeight: 600, fontSize: 15,
            fontFamily: "var(--font-montserrat), sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{t.name}</span>
          <img src={`https://flagcdn.com/40x30/${t.flag}.png`} alt=""
            style={{ width: 22, height: 16, borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />
        </div>
        <div style={{ color: GRAY, fontSize: 13, fontFamily: "var(--font-montserrat), sans-serif" }}>
          {t.size} · Récompense reçue
        </div>
      </div>

      <div style={{
        color: GOLD, fontWeight: 800, fontSize: 22, flexShrink: 0,
        fontFamily: "var(--font-montserrat), sans-serif",
        letterSpacing: "-0.5px",
      }}>{fmt(amount)}</div>
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
    { value: "$200K", label: isFr ? "Capital max" : "Max Capital" },
    { value: "80%",   label: isFr ? "Partage profit" : "Profit Split" },
    { value: "24-48h", label: isFr ? "Délai paiement" : "Payout delay" },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .h-a1 { animation: fadeUp 0.7s ease forwards; }
        .h-a2 { animation: fadeUp 0.7s ease 0.12s forwards; opacity: 0; }
        .h-a3 { animation: fadeUp 0.7s ease 0.24s forwards; opacity: 0; }
        .h-a4 { animation: fadeUp 0.7s ease 0.36s forwards; opacity: 0; }
        .h-a5 { animation: fadeUp 0.7s ease 0.48s forwards; opacity: 0; }
        .hero-cta-gold {
          display: inline-flex; align-items: center; gap: 10px;
          background: ${GOLD}; color: #000;
          padding: 15px 36px; border-radius: 6px;
          font-size: 13px; font-weight: 600; letter-spacing: 1.5px;
          text-transform: uppercase; text-decoration: none;
          font-family: var(--font-montserrat), sans-serif;
          transition: opacity 0.2s, transform 0.2s;
        }
        .hero-cta-gold:hover { opacity: 0.88; transform: translateY(-1px); }
        .hero-cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          color: ${GRAY}; font-size: 13px; font-weight: 500;
          letter-spacing: 0.5px; text-decoration: none;
          font-family: var(--font-montserrat), sans-serif;
          transition: color 0.2s;
          border-bottom: 1px solid transparent;
        }
        .hero-cta-ghost:hover { color: #fff; border-bottom-color: rgba(255,255,255,0.3); }
      `}</style>

      <section style={{
        background: "#0A0A0A",
        minHeight: isMobile ? "auto" : "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: isMobile
          ? "calc(60px + var(--promo-banner-height, 0px) + 48px)"
          : "calc(72px + var(--promo-banner-height, 0px))",
        paddingBottom: isMobile ? 64 : 80,
        paddingLeft: 24,
        paddingRight: 24,
      }}>

        <div style={{
          maxWidth: 720,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}>

          {/* Badge */}
          <div className="h-a1" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            border: `1px solid ${GOLD}44`,
            borderRadius: 100,
            padding: "6px 18px",
            marginBottom: 36,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: GOLD, flexShrink: 0,
              boxShadow: `0 0 8px ${GOLD}`,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: "2px",
              color: GOLD, textTransform: "uppercase",
              fontFamily: "var(--font-montserrat), sans-serif",
            }}>
              {isFr ? "Prop Firm Française" : "French Prop Firm"}
            </span>
          </div>

          {/* H1 */}
          <h1 className="h-a2" style={{
            fontFamily: "var(--font-montserrat), sans-serif",
            fontWeight: 800,
            fontSize: isMobile ? "clamp(2.4rem, 9vw, 3rem)" : "clamp(3.2rem, 5vw, 4.4rem)",
            color: "#FFFFFF",
            lineHeight: 1.08,
            letterSpacing: isMobile ? "-1px" : "-2px",
            margin: "0 0 24px 0",
          }}>
            {isFr
              ? <>La prop firm qui récompense<br />les traders <span style={{ color: GOLD }}>disciplinés.</span></>
              : <>The prop firm that rewards<br /><span style={{ color: GOLD }}>disciplined</span> traders.</>}
          </h1>

          {/* Sous-titre */}
          <p className="h-a3" style={{
            fontFamily: "var(--font-montserrat), sans-serif",
            fontWeight: 500,
            fontSize: isMobile ? 15 : 17,
            color: GRAY,
            lineHeight: 1.7,
            margin: "0 0 40px 0",
            maxWidth: 480,
          }}>
            {isFr
              ? "Prouvez vos compétences. Recevez vos récompenses."
              : "Prove your skills. Receive your rewards."}
          </p>

          {/* CTAs */}
          <div className="h-a4" style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap", justifyContent: "center", marginBottom: 64 }}>
            <a href="/#pricing" className="hero-cta-gold">
              {isFr ? "Commencer" : "Get Started"} →
            </a>
            <a href="/#rules" className="hero-cta-ghost">
              {isFr ? "Voir les règles" : "View the rules"} →
            </a>
          </div>

          {/* Stats */}
          <div className="h-a4" style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: isMobile ? 16 : 32,
            width: "100%",
            maxWidth: 480,
            marginBottom: 56,
            paddingBottom: 56,
            borderBottom: `1px solid ${DARK_GRAY}`,
          }}>
            {stats.map((s) => (
              <div key={s.value} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontFamily: "var(--font-montserrat), sans-serif",
                  fontWeight: 800,
                  fontSize: isMobile ? 22 : 28,
                  color: GOLD,
                  letterSpacing: "-0.5px",
                }}>{s.value}</span>
                <span style={{
                  fontFamily: "var(--font-montserrat), sans-serif",
                  fontWeight: 500,
                  fontSize: 12,
                  color: GRAY,
                  letterSpacing: "0.5px",
                }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Live Reward Card */}
          <div className="h-a5" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%" }}>
            <span style={{
              fontFamily: "var(--font-montserrat), sans-serif",
              fontWeight: 500, fontSize: 12, color: GRAY,
              letterSpacing: "1.5px", textTransform: "uppercase",
            }}>
              {isFr ? "Dernière récompense" : "Latest reward"}
            </span>
            <LiveRewardCard />
          </div>

        </div>
      </section>
    </>
  );
}
