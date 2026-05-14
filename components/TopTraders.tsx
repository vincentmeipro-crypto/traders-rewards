"use client";
import { useLanguage } from "@/lib/LanguageContext";

const traders = [
  { name: "Karim B.",       country: "🇫🇷", payout: "$18,400",  model: "2-Step", size: "$100K", color: "#C9A84C", initials: "KB" },
  { name: "Marco V.",       country: "🇮🇹", payout: "$31,200",  model: "1-Step", size: "$200K", color: "#3b82f6", initials: "MV" },
  { name: "Sarah L.",       country: "🇬🇧", payout: "$9,800",   model: "2-Step", size: "$50K",  color: "#22c55e", initials: "SL" },
  { name: "Ahmed R.",       country: "🇸🇦", payout: "$52,600",  model: "2-Step", size: "$200K", color: "#a855f7", initials: "AR" },
  { name: "Lucas M.",       country: "🇧🇷", payout: "$14,750",  model: "1-Step", size: "$100K", color: "#f59e0b", initials: "LM" },
  { name: "TheBullTrader",  country: "🇩🇪", payout: "$88,300",  model: "1-Step", size: "$200K", color: "#ef4444", initials: "TB" },
  { name: "Yuki T.",        country: "🇯🇵", payout: "$23,150",  model: "2-Step", size: "$100K", color: "#06b6d4", initials: "YT" },
  { name: "Carlos G.",      country: "🇪🇸", payout: "$11,400",  model: "2-Step", size: "$50K",  color: "#C9A84C", initials: "CG" },
  { name: "PipHunterPro",   country: "🇺🇸", payout: "$67,900",  model: "1-Step", size: "$200K", color: "#22c55e", initials: "PH" },
  { name: "Fatima A.",      country: "🇲🇦", payout: "$19,200",  model: "2-Step", size: "$100K", color: "#f59e0b", initials: "FA" },
  { name: "Dmitri K.",      country: "🇷🇺", payout: "$44,500",  model: "2-Step", size: "$200K", color: "#3b82f6", initials: "DK" },
  { name: "Lena H.",        country: "🇩🇪", payout: "$7,600",   model: "1-Step", size: "$25K",  color: "#a855f7", initials: "LH" },
  { name: "Jean-Pierre D.", country: "🇫🇷", payout: "$36,800",  model: "2-Step", size: "$200K", color: "#ef4444", initials: "JP" },
  { name: "GoldScalper",    country: "🇦🇪", payout: "$121,000", model: "1-Step", size: "$200K", color: "#C9A84C", initials: "GS" },
  { name: "Min-jun L.",     country: "🇰🇷", payout: "$28,300",  model: "2-Step", size: "$100K", color: "#06b6d4", initials: "ML" },
];

function TraderCard({ trader }: { trader: typeof traders[0] }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e",
      borderRadius: 14, padding: "14px 20px",
      minWidth: 220, flexShrink: 0,
    }}>
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        backgroundColor: trader.color + "22",
        border: `2px solid ${trader.color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 800, color: trader.color, flexShrink: 0,
      }}>
        {trader.initials}
      </div>

      {/* Info */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{trader.name}</span>
          <span style={{ fontSize: 16 }}>{trader.country}</span>
        </div>
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
  const title    = lang === "fr" ? "Derniers Retraits" : "Latest Payouts";
  const subtitle = lang === "fr"
    ? "Nos traders financés retirent leurs profits chaque semaine."
    : "Our funded traders withdraw their profits every week.";

  const doubled = [...traders, ...traders];

  return (
    <section style={{ padding: "60px 0", overflow: "hidden" }}>
      <div style={{ textAlign: "center", marginBottom: 36, padding: "0 24px" }}>
        <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 12 }}>
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
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 2, background: "linear-gradient(to right, #070707, transparent)", pointerEvents: "none" }} />
        {/* Fade right */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 2, background: "linear-gradient(to left, #070707, transparent)", pointerEvents: "none" }} />

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
