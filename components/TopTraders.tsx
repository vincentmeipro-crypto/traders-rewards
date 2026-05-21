"use client";
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

      {/* Earnings table */}
      <div style={{ maxWidth: 680, margin: "0 auto 56px", padding: "0 24px" }}>
        <p style={{ color: "#555", fontSize: 15, lineHeight: 1.8, marginBottom: 28, textAlign: "center" }}>
          {lang === "fr"
            ? "Basé sur une performance moyenne de 6% par mois, voici ce que nos traders certifiés touchent en récompense selon leur taille de compte — avec un partage de profit allant jusqu'à 90%."
            : "Based on an average monthly performance of 6%, here is what our certified traders earn in rewards depending on their account size — with a profit split of up to 90%."}
        </p>
        <div style={{ border: "1px solid #1a1a1a", borderRadius: 16, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", backgroundColor: "#0f0f0f", borderBottom: "1px solid #1a1a1a" }}>
            {[
              lang === "fr" ? "Compte" : "Account",
              lang === "fr" ? "Profit mensuel (6%)" : "Monthly profit (6%)",
              lang === "fr" ? "Votre récompense (80%)" : "Your reward (80%)",
            ].map((h, i) => (
              <div key={i} style={{ padding: "12px 20px", fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "1px", textAlign: i === 0 ? "left" : "center" }}>
                {h}
              </div>
            ))}
          </div>
          {/* Rows */}
          {tableRows.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: i < tableRows.length - 1 ? "1px solid #111" : "none", backgroundColor: i % 2 === 0 ? "#0a0a0a" : "#080808" }}>
              <div style={{ padding: "14px 20px", fontWeight: 800, fontSize: 15, color: "#fff" }}>{row.size}</div>
              <div style={{ padding: "14px 20px", fontWeight: 600, fontSize: 15, color: "#888", textAlign: "center" }}>{row.profit}</div>
              <div style={{ padding: "14px 20px", fontWeight: 800, fontSize: 15, color: "#22c55e", textAlign: "center" }}>{row.reward}</div>
            </div>
          ))}
        </div>
        <p style={{ color: "#333", fontSize: 12, marginTop: 10, textAlign: "center" }}>
          {lang === "fr" ? "* Estimations basées sur 6% de profit mensuel et 80% de partage. Les performances varient selon les traders." : "* Estimates based on 6% monthly profit and 80% split. Results vary per trader."}
        </p>
      </div>

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
        {/* Fade left */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, background: "linear-gradient(to right, #16161C, transparent)", pointerEvents: "none" }} />
        {/* Fade right */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, background: "linear-gradient(to left, #16161C, transparent)", pointerEvents: "none" }} />

        <div style={{ display: "flex", gap: 16, animation: "ticker 40s linear infinite", width: "max-content", padding: "8px 16px" }}>
          {doubled.map((trader, i) => (
            <TraderCard key={i} trader={trader} />
          ))}
        </div>
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
