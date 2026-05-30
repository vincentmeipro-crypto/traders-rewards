"use client";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const TRADERS = [
  { name: "Karim B.",       flag: "fr", payout: 3200,  size: "$100K", color: "#00C2FF", initials: "KB" },
  { name: "Marco V.",       flag: "it", payout: 3100,  size: "$100K", color: "#3b82f6", initials: "MV" },
  { name: "Thomas D.",      flag: "fr", payout: 1850,  size: "$50K",  color: "#22c55e", initials: "TD" },
  { name: "Antoine M.",     flag: "be", payout: 4200,  size: "$100K", color: "#a855f7", initials: "AM" },
  { name: "Mathieu R.",     flag: "fr", payout: 3750,  size: "$100K", color: "#f59e0b", initials: "MR" },
  { name: "Alexandre P.",   flag: "fr", payout: 3850,  size: "$100K", color: "#ef4444", initials: "AP" },
  { name: "Sarah L.",       flag: "gb", payout: 2200,  size: "$50K",  color: "#06b6d4", initials: "SL" },
  { name: "Carlos G.",      flag: "es", payout: 1450,  size: "$50K",  color: "#00C2FF", initials: "CG" },
  { name: "Camille F.",     flag: "fr", payout: 2950,  size: "$100K", color: "#22c55e", initials: "CF" },
  { name: "Nicolas B.",     flag: "fr", payout: 4650,  size: "$100K", color: "#f59e0b", initials: "NB" },
  { name: "Jean-Pierre D.", flag: "fr", payout: 4650,  size: "$100K", color: "#ef4444", initials: "JP" },
  { name: "Lukas W.",       flag: "ch", payout: 3600,  size: "$100K", color: "#00C2FF", initials: "LW" },
  { name: "Julien M.",      flag: "fr", payout: 2600,  size: "$100K", color: "#06b6d4", initials: "JM" },
  { name: "Andrei P.",      flag: "ro", payout:  980,  size: "$25K",  color: "#3b82f6", initials: "AP" },
  { name: "Lena H.",        flag: "de", payout: 1150,  size: "$25K",  color: "#a855f7", initials: "LH" },
  { name: "Lucas M.",       flag: "fr", payout:  420,  size: "$10K",  color: "#22c55e", initials: "LM" },
  { name: "Emma R.",        flag: "fr", payout:  360,  size: "$10K",  color: "#f59e0b", initials: "ER" },
  { name: "Yann T.",        flag: "fr", payout:  470,  size: "$10K",  color: "#00C2FF", initials: "YT" },
];

function fmt(n: number): string {
  return "€" + Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const ENTER_MS  = 600;
const HOLD_MS   = 2600;
const EXIT_MS   = 500;
const TOTAL_MS  = ENTER_MS + HOLD_MS + EXIT_MS; // 3700ms

function TraderSpotlight({ lang }: { lang: string }) {
  const [idx, setIdx]           = useState(0);
  const [displayAmount, setAmt] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const trader = TRADERS[idx];

    // Start counting right when card is visible
    const t1 = setTimeout(() => {
      if (cancelled) return;
      const start = performance.now();
      const dur   = 750;
      const tick  = (now: number) => {
        if (cancelled) return;
        const p    = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setAmt(Math.round(ease * trader.payout));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
        else        setAmt(trader.payout);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, ENTER_MS);

    // Advance to next trader after full cycle
    const t2 = setTimeout(() => {
      if (!cancelled) {
        setAmt(0);
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

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      padding: "48px 24px", minHeight: 380, position: "relative",
    }}>

      {/* Ambient background glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 700, height: 380,
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(ellipse, ${t.color}18 0%, transparent 68%)`,
        pointerEvents: "none",
        transition: "background 1s ease",
      }} />

      {/* Card — key={idx} forces remount → CSS animation fires fresh every time */}
      <div
        key={idx}
        style={{
          width: "100%", maxWidth: 560,
          background: "linear-gradient(160deg, #08080e 0%, #0d1120 100%)",
          border: `1.5px solid ${t.color}60`,
          borderRadius: 28,
          padding: "40px 44px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
          zIndex: 1,
          boxShadow: `0 0 100px ${t.color}28, 0 30px 90px rgba(0,0,0,0.75)`,
          animation: `spotlightCycle ${TOTAL_MS}ms linear forwards`,
        }}
      >
        {/* Top accent bar */}
        <div style={{
          position: "absolute", top: 0, left: "15%", right: "15%", height: 2,
          background: `linear-gradient(to right, transparent, ${t.color}, transparent)`,
        }} />

        {/* RÉCOMPENSE badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 9,
          background: `${t.color}14`,
          border: `1px solid ${t.color}40`,
          borderRadius: 100, padding: "7px 20px", marginBottom: 30,
        }}>
          <span style={{
            display: "inline-block", width: 8, height: 8, borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 10px #22c55e, 0 0 20px #22c55e80",
            animation: "pulseDot 1.5s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{ color: t.color, fontSize: 11, fontWeight: 800, letterSpacing: "2.5px", textTransform: "uppercase" }}>
            {lang === "fr" ? "Récompense versée" : "Reward Paid"}
          </span>
        </div>

        {/* Trader row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 30 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              background: `${t.color}1a`,
              border: `2.5px solid ${t.color}55`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 17, fontWeight: 900, color: t.color,
              boxShadow: `0 0 24px ${t.color}40`,
            }}>
              {t.initials}
            </div>
            <img
              src={`https://flagcdn.com/24x18/${t.flag}.png`}
              alt=""
              style={{
                position: "absolute", bottom: -4, right: -8,
                width: 22, height: 16, borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.18)", objectFit: "cover",
              }}
            />
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "2.5px",
              textTransform: "uppercase", color: t.color, marginBottom: 4,
            }}>
              Trader
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", lineHeight: 1.2 }}>
              {t.name}
            </div>
            <div style={{ fontSize: 12, color: "#35354a", marginTop: 3 }}>
              {lang === "fr" ? "Compte" : "Account"} {t.size}
            </div>
          </div>
        </div>

        {/* BIG counter */}
        <div style={{
          fontSize: "clamp(3.8rem, 13vw, 5.6rem)",
          fontWeight: 900, color: "#22c55e", lineHeight: 1,
          letterSpacing: "-3px", marginBottom: 6,
          fontVariantNumeric: "tabular-nums",
          textShadow: "0 0 60px rgba(34,197,94,0.6), 0 0 130px rgba(34,197,94,0.25)",
        }}>
          {fmt(displayAmount)}
        </div>

        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "3px",
          textTransform: "uppercase", color: "#1e1e2e", marginBottom: 28,
        }}>
          {lang === "fr" ? "Récompense reçue" : "Reward Received"}
        </div>

        {/* Divider */}
        <div style={{
          width: "50%", height: 1, margin: "0 auto 22px",
          background: `linear-gradient(to right, transparent, ${t.color}55, transparent)`,
        }} />

        {/* Bottom badges */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "#22c55e0e", border: "1px solid #22c55e28",
            borderRadius: 8, padding: "5px 13px",
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M10 3L5 9 2 6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 700 }}>
              {lang === "fr" ? "Trader certifié" : "Certified Trader"}
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#222232", fontWeight: 600 }}>
            · {lang === "fr" ? "Versé cette semaine" : "Paid this week"}
          </span>
        </div>

        {/* Bottom bar */}
        <div style={{
          position: "absolute", bottom: 0, left: "15%", right: "15%", height: 1,
          background: `linear-gradient(to right, transparent, ${t.color}38, transparent)`,
        }} />
      </div>

      <style>{`
        @keyframes spotlightCycle {
          0%   {
            opacity: 0;
            transform: translateY(52px) scale(0.87);
            animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          ${((ENTER_MS / TOTAL_MS) * 100).toFixed(2)}% {
            opacity: 1;
            transform: translateY(0px) scale(1);
            animation-timing-function: linear;
          }
          ${(((ENTER_MS + HOLD_MS) / TOTAL_MS) * 100).toFixed(2)}% {
            opacity: 1;
            transform: translateY(0px) scale(1);
            animation-timing-function: ease-in;
          }
          100% {
            opacity: 0;
            transform: translateY(-22px) scale(0.96);
          }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
}

function TraderCard({ trader }: { trader: typeof TRADERS[0] }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      backgroundColor: "#0c0c12", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14, padding: "14px 20px",
      minWidth: 210, flexShrink: 0,
    }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          backgroundColor: trader.color + "18",
          border: `2px solid ${trader.color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: trader.color,
        }}>
          {trader.initials}
        </div>
        <img
          src={`https://flagcdn.com/20x15/${trader.flag}.png`}
          alt={trader.flag}
          style={{
            position: "absolute", bottom: -3, right: -6,
            width: 18, height: 14, borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.12)", objectFit: "cover",
          }}
        />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#ccc" }}>{trader.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 15 }}>{fmt(trader.payout)}</span>
          <span style={{ color: "#1a1a28", fontSize: 11 }}>·</span>
          <span style={{ color: "#282838", fontSize: 11 }}>{trader.size}</span>
        </div>
      </div>
    </div>
  );
}

export default function TopTraders() {
  const { lang } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const tableRows = [
    { size: "$10K",  profit: "€600",   reward: "~€480" },
    { size: "$25K",  profit: "€1,500", reward: "~€1,200" },
    { size: "$50K",  profit: "€3,000", reward: "~€2,400" },
    { size: "$100K", profit: "€6,000", reward: "~€4,800" },
  ];

  const doubled = [...TRADERS, ...TRADERS];

  return (
    <section style={{ padding: "60px 0 0", overflow: "hidden", background: "#000" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 4, padding: "0 24px" }}>
        <span style={{ color: "#00C2FF", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 12 }}>
          {lang === "fr" ? "Communauté" : "Community"}
        </span>
        <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 10 }}>
          {lang === "fr" ? "Dernières Récompenses" : "Latest Rewards"}
        </h2>
        <p style={{ color: "#2a2a3a", fontSize: 14, maxWidth: 460, margin: "0 auto" }}>
          {lang === "fr"
            ? "Nos traders certifiés reçoivent leurs récompenses chaque semaine."
            : "Our certified traders receive their rewards every week."}
        </p>
      </div>

      {/* SPOTLIGHT */}
      <TraderSpotlight lang={lang} />

      {/* Ticker */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 100, zIndex: 2, background: "linear-gradient(to right, #000, transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 100, zIndex: 2, background: "linear-gradient(to left, #000, transparent)", pointerEvents: "none" }} />
        <div style={{ display: "flex", gap: 14, animation: "ticker 50s linear infinite", width: "max-content", padding: "8px 16px" }}>
          {doubled.map((trader, i) => (
            <TraderCard key={i} trader={trader} />
          ))}
        </div>
      </div>

      {/* Earnings potential */}
      <div style={{ maxWidth: 900, margin: "72px auto 0", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
            {lang === "fr" ? "Potentiel de gains" : "Earnings potential"}
          </span>
          <h3 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12 }}>
            {lang === "fr" ? "Combien pouvez-vous gagner ?" : "How much can you earn?"}
          </h3>
          <p style={{ color: "#333", fontSize: 14, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            {lang === "fr"
              ? "À 6% de profit mensuel en moyenne, voici ce que nos traders certifiés touchent — avec jusqu'à 90% des gains."
              : "At an average 6% monthly profit, here is what our certified traders earn — keeping up to 90% of gains."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12 }}>
          {tableRows.map((row, i) => {
            const colors = ["#00C2FF", "#a855f7", "#22c55e", "#f59e0b"];
            const glows  = ["#00C2FF22", "#a855f722", "#22c55e22", "#f59e0b22"];
            return (
              <div key={i} style={{
                background: "linear-gradient(145deg, #080808, #0c0c0c)",
                border: `1px solid ${colors[i]}44`,
                borderRadius: 18,
                padding: isMobile ? "22px 16px" : "24px 16px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 100, height: 100, borderRadius: "50%", background: glows[i], filter: "blur(24px)", pointerEvents: "none" }} />
                <div style={{ fontSize: isMobile ? 16 : 13, fontWeight: 800, color: colors[i], marginBottom: 14, letterSpacing: "1px" }}>{row.size}</div>
                <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
                  {lang === "fr" ? "Profit moyen" : "Avg. profit"}
                </div>
                <div style={{ fontSize: isMobile ? 17 : 18, fontWeight: 700, color: "#fff", marginBottom: 14 }}>{row.profit}</div>
                <div style={{ width: "100%", height: 1, background: `linear-gradient(to right, transparent, ${colors[i]}55, transparent)`, marginBottom: 14 }} />
                <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
                  {lang === "fr" ? "Votre récompense" : "Your reward"}
                </div>
                <div style={{ fontSize: isMobile ? 24 : 26, fontWeight: 900, color: "#22c55e", letterSpacing: "-0.5px" }}>{row.reward}</div>
                <div style={{ fontSize: 11, color: "#2a2a2a", marginTop: 4 }}>{lang === "fr" ? "/ mois" : "/ month"}</div>
              </div>
            );
          })}
        </div>

        <p style={{ color: "#151515", fontSize: 11, marginTop: 16, textAlign: "center" }}>
          {lang === "fr"
            ? "* Estimations basées sur 6% de profit mensuel et 80% de partage. Les performances varient selon les traders."
            : "* Estimates based on 6% monthly profit and 80% split. Results vary per trader."}
        </p>
      </div>

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
