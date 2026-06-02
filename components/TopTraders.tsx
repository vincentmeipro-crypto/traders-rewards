"use client";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const TRADERS = [
  { name: "Karim B.",       flag: "fr", payout: 3200,  size: "$100K", initials: "KB" },
  { name: "Marco V.",       flag: "it", payout: 3100,  size: "$100K", initials: "MV" },
  { name: "Thomas D.",      flag: "fr", payout: 1850,  size: "$50K",  initials: "TD" },
  { name: "Antoine M.",     flag: "be", payout: 4200,  size: "$100K", initials: "AM" },
  { name: "Mathieu R.",     flag: "fr", payout: 3750,  size: "$100K", initials: "MR" },
  { name: "Alexandre P.",   flag: "fr", payout: 3850,  size: "$100K", initials: "AP" },
  { name: "Sarah L.",       flag: "gb", payout: 2200,  size: "$50K",  initials: "SL" },
  { name: "Carlos G.",      flag: "es", payout: 1450,  size: "$50K",  initials: "CG" },
  { name: "Camille F.",     flag: "fr", payout: 2950,  size: "$100K", initials: "CF" },
  { name: "Nicolas B.",     flag: "fr", payout: 4650,  size: "$100K", initials: "NB" },
  { name: "Jean-Pierre D.", flag: "fr", payout: 4650,  size: "$100K", initials: "JP" },
  { name: "Lukas W.",       flag: "ch", payout: 3600,  size: "$100K", initials: "LW" },
  { name: "Julien M.",      flag: "fr", payout: 2600,  size: "$100K", initials: "JM" },
  { name: "Lena H.",        flag: "de", payout: 1150,  size: "$25K",  initials: "LH" },
  { name: "Lucas M.",       flag: "fr", payout:  420,  size: "$10K",  initials: "LM" },
  { name: "Emma R.",        flag: "fr", payout:  360,  size: "$10K",  initials: "ER" },
  { name: "Yann T.",        flag: "fr", payout:  470,  size: "$10K",  initials: "YT" },
];

function fmt(n: number) {
  return "€" + Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const ENTER_MS = 600, HOLD_MS = 2800, EXIT_MS = 500;
const TOTAL_MS = ENTER_MS + HOLD_MS + EXIT_MS;

function SpotlightCard({ lang }: { lang: string }) {
  const [idx, setIdx] = useState(0);
  const [amt, setAmt] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const trader = TRADERS[idx];
    const t1 = setTimeout(() => {
      if (cancelled) return;
      const start = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const p = Math.min((now - start) / 750, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setAmt(Math.round(ease * trader.payout));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
        else setAmt(trader.payout);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, ENTER_MS);
    const t2 = setTimeout(() => {
      if (!cancelled) { setAmt(0); setIdx(i => (i + 1) % TRADERS.length); }
    }, TOTAL_MS + 80);
    return () => { cancelled = true; clearTimeout(t1); clearTimeout(t2); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [idx]);

  const t = TRADERS[idx];
  return (
    <div key={idx} style={{
      background: "#fff",
      border: "1px solid #3a3f4d",
      borderRadius: 16,
      padding: "28px 28px 24px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 8px 40px rgba(27,79,216,0.1), 0 2px 8px rgba(0,0,0,0.06)",
      animation: `spotCycle ${TOTAL_MS}ms linear forwards`,
    }}>

      {/* Top accent line */}
      <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 2, background: "linear-gradient(to right, transparent, #1B4FD8, transparent)", borderRadius: "0 0 4px 4px" }} />

      {/* Badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 100, padding: "5px 14px", marginBottom: 22 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e" }} />
        <span style={{ color: "#16a34a", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>
          {lang === "fr" ? "Récompense versée" : "Reward Paid"}
        </span>
      </div>

      {/* Trader */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 24, padding: "14px 20px", background: "rgba(0,0,0,0.02)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.05)" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(27,79,216,0.08)", border: "1.5px solid rgba(27,79,216,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#1B4FD8" }}>{t.initials}</div>
          <img src={`https://flagcdn.com/24x18/${t.flag}.png`} alt="" style={{ position: "absolute", bottom: -3, right: -7, width: 18, height: 14, borderRadius: 3, border: "1px solid rgba(0,0,0,0.1)", objectFit: "cover" }} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", color: "#C9A84C", marginBottom: 3, textTransform: "uppercase" }}>Trader</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#0D1B3E" }}>{t.name}</div>
          <div style={{ fontSize: 11, color: "#8a96aa", marginTop: 1 }}>{lang === "fr" ? "Compte" : "Account"} {t.size}</div>
        </div>
      </div>

      {/* Amount */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: "clamp(2.8rem, 10vw, 4rem)", fontWeight: 900, color: "#22c55e", lineHeight: 1, letterSpacing: "-2px", fontVariantNumeric: "tabular-nums" }}>
          {fmt(amt)}
        </div>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "3px", color: "#8a96aa", textTransform: "uppercase", marginBottom: 20 }}>
        {lang === "fr" ? "Récompense reçue" : "Reward Received"}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(0,0,0,0.06)", marginBottom: 16 }} />

      {/* Certified badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(27,79,216,0.06)", border: "1px solid rgba(27,79,216,0.15)", borderRadius: 8, padding: "6px 14px" }}>
        <span style={{ fontSize: 11, color: "#1B4FD8", fontWeight: 700 }}>✓ {lang === "fr" ? "Trader certifié" : "Certified Trader"}</span>
      </div>

      <style>{`
        @keyframes spotCycle {
          0% { opacity: 0; transform: translateY(40px) scale(0.9); animation-timing-function: cubic-bezier(0.34,1.56,0.64,1); }
          ${((ENTER_MS / TOTAL_MS) * 100).toFixed(1)}% { opacity: 1; transform: translateY(0) scale(1); animation-timing-function: linear; }
          ${(((ENTER_MS + HOLD_MS) / TOTAL_MS) * 100).toFixed(1)}% { opacity: 1; transform: translateY(0) scale(1); animation-timing-function: ease-in; }
          100% { opacity: 0; transform: translateY(-16px) scale(0.97); }
        }
      `}</style>
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
    { size: "$10K",  profit: "€600",    reward: "~€480" },
    { size: "$25K",  profit: "€1,500",  reward: "~€1,200" },
    { size: "$50K",  profit: "€3,000",  reward: "~€2,400" },
    { size: "$100K", profit: "€6,000",  reward: "~€4,800" },
    { size: "$200K", profit: "€12,000", reward: "~€9,600" },
  ];

  const doubled = [...TRADERS, ...TRADERS];

  return (
    <section style={{ padding: "100px 0 0", overflow: "hidden", background: "transparent" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 64, padding: "0 24px" }}>
        <span className="section-label" style={{ display: "block", marginBottom: 16 }}>
          {lang === "fr" ? "Dernières Récompenses" : "Latest Rewards"}
        </span>
        <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 600, color: "#0D1B3E", letterSpacing: "1px", marginBottom: 12 }}>
          {lang === "fr" ? "Nos traders certifiés touchent" : "Our certified traders receive"}
          <br /><em style={{ color: "#1B4FD8", fontStyle: "italic" }}>{lang === "fr" ? "leurs récompenses chaque semaine." : "their rewards every week."}</em>
        </h2>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 48, alignItems: "center", marginBottom: 72 }}>

        {/* Spotlight */}
        <SpotlightCard lang={lang} />

        {/* Reward table */}
        <div>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0D1B3E", marginBottom: 8 }}>
              {lang === "fr" ? "Votre récompense estimée" : "Your estimated reward"}
            </h3>
            <p style={{ color: "#4a5568", fontSize: 14, lineHeight: 1.7 }}>
              {lang === "fr"
                ? "Basé sur 6% de profit moyen, après les 20% de partage avec Elysium."
                : "Based on 6% average profit, after the 20% split with Elysium."}
            </p>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(26,114,245,0.15)", overflow: "hidden", boxShadow: "0 4px 24px rgba(26,114,245,0.08)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "12px 20px", background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              {[lang === "fr" ? "Compte" : "Account", lang === "fr" ? "Profit moy. 6%" : "Avg profit 6%", lang === "fr" ? "Votre récompense" : "Your reward"].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#8a96aa", textTransform: "uppercase", letterSpacing: "1.5px" }}>{h}</div>
              ))}
            </div>
            {tableRows.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "16px 20px", borderBottom: i < tableRows.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#0D1B3E" }}>{row.size}</div>
                <div style={{ fontSize: 14, color: "#4a5568" }}>{row.profit}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#22c55e" }}>{row.reward}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrolling marquee */}
      <div style={{ overflow: "hidden", borderTop: "1px solid rgba(26,114,245,0.1)", borderBottom: "1px solid rgba(26,114,245,0.1)", padding: "20px 0", background: "rgba(255,255,255,0.7)" }}>
        <div className="marquee-track">
          {doubled.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginRight: 32, flexShrink: 0, padding: "4px 20px 4px 4px", background: "rgba(0,0,0,0.02)", borderRadius: 100, border: "1px solid rgba(0,0,0,0.05)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(27,79,216,0.08)", border: "1.5px solid rgba(27,79,216,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#1B4FD8", flexShrink: 0 }}>{t.initials}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#0D1B3E" }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>{fmt(t.payout)} · {t.size}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
