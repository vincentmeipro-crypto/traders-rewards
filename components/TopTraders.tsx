"use client";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const TRADERS = [
  { name: "Karim B.",       flag: "fr", payout: 3187.54,  size: "$100K", initials: "KB" },
  { name: "Marco V.",       flag: "it", payout: 3094.51,  size: "$100K", initials: "MV" },
  { name: "Thomas D.",      flag: "fr", payout: 1847.32,  size: "$50K",  initials: "TD" },
  { name: "Antoine M.",     flag: "be", payout: 4213.78,  size: "$100K", initials: "AM" },
  { name: "Mathieu R.",     flag: "fr", payout: 3731.18,  size: "$100K", initials: "MR" },
  { name: "Alexandre P.",   flag: "fr", payout: 3847.64,  size: "$100K", initials: "AP" },
  { name: "Sarah L.",       flag: "gb", payout: 2196.83,  size: "$50K",  initials: "SL" },
  { name: "Carlos G.",      flag: "es", payout: 1438.29,  size: "$50K",  initials: "CG" },
  { name: "Camille F.",     flag: "fr", payout: 2941.67,  size: "$100K", initials: "CF" },
  { name: "Nicolas B.",     flag: "fr", payout: 4638.92,  size: "$100K", initials: "NB" },
  { name: "Jean-Pierre D.", flag: "fr", payout: 4612.89,  size: "$100K", initials: "JP" },
  { name: "Lukas W.",       flag: "ch", payout: 3574.36,  size: "$100K", initials: "LW" },
  { name: "Julien M.",      flag: "fr", payout: 2578.43,  size: "$100K", initials: "JM" },
  { name: "Lena H.",        flag: "de", payout: 1163.47,  size: "$25K",  initials: "LH" },
  { name: "Lucas M.",       flag: "fr", payout: 1046.58,  size: "$25K",  initials: "LM" },
  { name: "Emma R.",        flag: "fr", payout:  890.53,  size: "$25K",  initials: "ER" },
  { name: "Yann T.",        flag: "fr", payout: 1179.60,  size: "$25K",  initials: "YT" },
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
      background: "#111111",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 24,
      padding: "28px 28px 24px",
      textAlign: "center",
      position: "relative",
      overflow: "hidden",
      animation: `spotCycle ${TOTAL_MS}ms linear forwards`,
    }}>

      <div style={{ position: "absolute", top: 0, left: "15%", right: "15%", height: 2, background: "linear-gradient(to right, transparent, #3B82F6, transparent)", borderRadius: "0 0 4px 4px" }} />

      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(59, 130, 246,0.12)", border: "1px solid rgba(59, 130, 246,0.3)", borderRadius: 100, padding: "5px 14px", marginBottom: 22 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3B82F6", display: "inline-block" }} />
        <span style={{ color: "#3B82F6", fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>
          {lang === "fr" ? "Récompense versée" : lang === "es" ? "Recompensa pagada" : "Reward Paid"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 24, padding: "14px 20px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#FFFFFF" }}>{t.initials}</div>
          <img src={`https://flagcdn.com/24x18/${t.flag}.png`} alt="" style={{ position: "absolute", bottom: -3, right: -7, width: 18, height: 14, borderRadius: 3, objectFit: "cover" }} />
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", color: "#3B82F6", marginBottom: 3, textTransform: "uppercase" }}>Trader</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#FFFFFF" }}>{t.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{lang === "fr" ? "Compte" : lang === "es" ? "Cuenta" : "Account"} {t.size}</div>
        </div>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: "clamp(2.8rem, 10vw, 4rem)", fontWeight: 900, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-2px", fontVariantNumeric: "tabular-nums" }}>
          {fmt(amt)}
        </div>
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "3px", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginBottom: 20 }}>
        {lang === "fr" ? "Récompense reçue" : lang === "es" ? "Recompensa recibida" : "Reward Received"}
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 16 }} />

      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(59, 130, 246,0.1)", border: "1px solid rgba(59, 130, 246,0.25)", borderRadius: 8, padding: "6px 14px" }}>
        <span style={{ fontSize: 11, color: "#3B82F6", fontWeight: 700 }}>✓ {lang === "fr" ? "Trader Reward" : "Reward Trader"}</span>
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
  const L = (fr: string, es: string, en: string) => lang === "fr" ? fr : lang === "es" ? es : en;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const tableRows = [
    { size: "$25K",  profit: "€1,500",  reward: "~€1,200" },
    { size: "$50K",  profit: "€3,000",  reward: "~€2,400" },
    { size: "$100K", profit: "€6,000",  reward: "~€4,800" },
  ];

  return (
    <section style={{ padding: "72px 0 0", overflow: "hidden", background: "#000000", position: "relative" }}>

      <div style={{ textAlign: "center", marginBottom: 56, padding: "0 24px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#3B82F6", marginBottom: 16 }}>
          {L("Dernières Récompenses","Últimas Recompensas","Latest Rewards")}
        </div>
        <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px", marginBottom: 0 }}>
          {L("Nos traders touchent","Nuestros traders reciben","Our traders receive")}
          <br /><span style={{ color: "#3B82F6" }}>{L("leurs récompenses chaque semaine.","sus recompensas cada semana.","their rewards every week.")}</span>
        </h2>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto 64px", padding: "0 24px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 40, alignItems: "center" }}>

        <SpotlightCard lang={lang} />

        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", marginBottom: 8 }}>
              {L("Votre récompense estimée","Tu recompensa estimada","Your estimated reward")}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: 1.7 }}>
              {L("Basé sur 6% de profit moyen, après les 20% de partage avec Traders Rewards.","Basado en 6% de profit promedio, después del 20% de reparto con Traders Rewards.","Based on 6% average profit, after the 20% split with Traders Rewards.")}
            </p>
          </div>
          <div style={{ background: "#111111", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "12px 20px", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {[L("Compte","Cuenta","Account"), L("Profit moy. 6%","Profit prom. 6%","Avg profit 6%"), L("Votre récompense","Tu recompensa","Your reward")].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "1.5px" }}>{h}</div>
              ))}
            </div>
            {tableRows.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "14px 20px", borderBottom: i < tableRows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>{row.size}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{row.profit}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#3B82F6" }}>{row.reward}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}
