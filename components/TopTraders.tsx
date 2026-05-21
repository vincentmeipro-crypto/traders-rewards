"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const traders = [
  { name: "Karim B.",       flag: "FR", payout: "$4,820",  size: "$100K", color: "#2D7DD2", initials: "KB" },
  { name: "Marco V.",       flag: "IT", payout: "$9,640",  size: "$200K", color: "#3b82f6", initials: "MV" },
  { name: "Sarah L.",       flag: "GB", payout: "$2,350",  size: "$50K",  color: "#22c55e", initials: "SL" },
  { name: "Ahmed R.",       flag: "SA", payout: "$10,200", size: "$200K", color: "#a855f7", initials: "AR" },
  { name: "Lucas M.",       flag: "BR", payout: "$4,480",  size: "$100K", color: "#f59e0b", initials: "LM" },
  { name: "TheBullTrader",  flag: "DE", payout: "$11,360", size: "$200K", color: "#ef4444", initials: "TB" },
  { name: "Yuki T.",        flag: "JP", payout: "$5,100",  size: "$100K", color: "#06b6d4", initials: "YT" },
  { name: "Carlos G.",      flag: "ES", payout: "$2,720",  size: "$50K",  color: "#2D7DD2", initials: "CG" },
  { name: "PipHunterPro",   flag: "US", payout: "$8,960",  size: "$200K", color: "#22c55e", initials: "PH" },
  { name: "Fatima A.",      flag: "MA", payout: "$4,650",  size: "$100K", color: "#f59e0b", initials: "FA" },
  { name: "Dmitri K.",      flag: "RU", payout: "$9,280",  size: "$200K", color: "#3b82f6", initials: "DK" },
  { name: "Lena H.",        flag: "DE", payout: "$1,180",  size: "$25K",  color: "#a855f7", initials: "LH" },
  { name: "Jean-Pierre D.", flag: "FR", payout: "$10,850", size: "$200K", color: "#ef4444", initials: "JP" },
  { name: "GoldScalper",    flag: "AE", payout: "$12,100", size: "$200K", color: "#2D7DD2", initials: "GS" },
  { name: "Min-jun L.",     flag: "KR", payout: "$5,340",  size: "$100K", color: "#06b6d4", initials: "ML" },
];

function TraderCard({ trader }: { trader: typeof traders[0] }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      backgroundColor: "#21212B", border: "1.5px solid rgba(255,255,255,0.7)",
      borderRadius: 14, padding: "14px 20px",
      minWidth: 210, flexShrink: 0,
    }}>
      {/* Avatar + flag badge */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          backgroundColor: trader.color + "22",
          border: `2px solid ${trader.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: trader.color,
        }}>
          {trader.initials}
        </div>
        {/* Flag badge */}
        <img
          src={`https://flagcdn.com/20x15/${trader.flag.toLowerCase()}.png`}
          alt={trader.flag}
          style={{
            position: "absolute", bottom: -3, right: -6,
            width: 18, height: 14, borderRadius: 2,
            border: "1px solid rgba(255,255,255,0.15)",
            objectFit: "cover",
          }}
        />
      </div>

      {/* Info */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{trader.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 15 }}>{trader.payout}</span>
          <span style={{ color: "#333", fontSize: 11 }}>·</span>
          <span style={{ color: "#444", fontSize: 11 }}>{trader.size}</span>
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
  const title    = lang === "fr" ? "Dernières Récompenses" : "Latest Rewards";
  const subtitle = lang === "fr"
    ? "Nos traders certifiés reçoivent leurs récompenses chaque semaine."
    : "Our certified traders receive their rewards every week.";

  const doubled = [...traders, ...traders];

  const tableRows = [
    { size: "$10K",  profit: "$600",    reward: "~$480" },
    { size: "$25K",  profit: "$1,500",  reward: "~$1,200" },
    { size: "$50K",  profit: "$3,000",  reward: "~$2,400" },
    { size: "$100K", profit: "$6,000",  reward: "~$4,800" },
    { size: "$200K", profit: "$12,000", reward: "~$9,600" },
  ];

  return (
    <section style={{ padding: "60px 0", overflow: "hidden" }}>

      <div style={{ textAlign: "center", marginBottom: 36, padding: "0 24px" }}>
        <span style={{ color: "#2D7DD2", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 12 }}>
          {lang === "fr" ? "Communauté" : "Community"}
        </span>
        <h2 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12 }}>
          {title}
        </h2>
        <p style={{ color: "#555", fontSize: 14 }}>{subtitle}</p>
      </div>

      {/* Ticker */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, background: "linear-gradient(to right, #16161C, transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, background: "linear-gradient(to left, #16161C, transparent)", pointerEvents: "none" }} />
        <div style={{ display: "flex", gap: 16, animation: "ticker 40s linear infinite", width: "max-content", padding: "8px 16px" }}>
          {doubled.map((trader, i) => (
            <TraderCard key={i} trader={trader} />
          ))}
        </div>
      </div>

      {/* ── Earnings cards ── */}
      <div style={{ maxWidth: 900, margin: "64px auto 0", padding: "0 24px" }}>

        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
            {lang === "fr" ? "Potentiel de gains" : "Earnings potential"}
          </span>
          <h3 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12 }}>
            {lang === "fr" ? "Combien pouvez-vous gagner ?" : "How much can you earn?"}
          </h3>
          <p style={{ color: "#555", fontSize: 14, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            {lang === "fr"
              ? "À 6% de profit mensuel en moyenne, voici ce que nos traders certifiés touchent — avec jusqu'à 90% des gains."
              : "At an average 6% monthly profit, here is what our certified traders earn — keeping up to 90% of gains."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(5, 1fr)", gap: isMobile ? 10 : 12 }}>
          {tableRows.map((row, i) => {
            const colors = ["#2D7DD2", "#a855f7", "#22c55e", "#f59e0b", "#22c55e"];
            const glows  = ["#2D7DD222", "#a855f722", "#22c55e22", "#f59e0b22", "#22c55e22"];
            return (
              <div key={i} style={{
                background: `linear-gradient(145deg, #0f0f0f, #111)`,
                border: `1px solid ${colors[i]}33`,
                borderRadius: 18,
                padding: isMobile ? "18px 10px" : "24px 16px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
                gridColumn: isMobile && i === 4 ? "2 / 3" : undefined,
              }}>
                {/* Glow top */}
                <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 80, height: 80, borderRadius: "50%", background: glows[i], filter: "blur(20px)", pointerEvents: "none" }} />
                <div style={{ fontSize: 13, fontWeight: 800, color: colors[i], marginBottom: 16, letterSpacing: "1px" }}>{row.size}</div>
                <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
                  {lang === "fr" ? "Profit moyen" : "Avg. profit"}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#888", marginBottom: 16 }}>{row.profit}</div>
                <div style={{ width: "100%", height: 1, background: `linear-gradient(to right, transparent, ${colors[i]}44, transparent)`, marginBottom: 16 }} />
                <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>
                  {lang === "fr" ? "Votre récompense" : "Your reward"}
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#22c55e", letterSpacing: "-0.5px" }}>{row.reward}</div>
                <div style={{ fontSize: 10, color: "#333", marginTop: 4 }}>{lang === "fr" ? "/ mois" : "/ month"}</div>
              </div>
            );
          })}
        </div>

        <p style={{ color: "#2a2a2a", fontSize: 11, marginTop: 16, textAlign: "center" }}>
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
