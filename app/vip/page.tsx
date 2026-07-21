"use client";
import { useLanguage } from "@/lib/LanguageContext";
import { Check, Zap, Shield, Clock, TrendingUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";

const PLANS = [
  { size: "$25,000", price: "1 250€", productId: "25k-vip", features: ["Phase 1 : +10% objectif", "Phase 2 : +5% objectif", "Algorithme intégré actif", "100% des récompenses", "Sans limite de temps", "Récompenses tous les 30 jours"] },
  { size: "$50,000", price: "2 500€", productId: "50k-vip", popular: true, features: ["Phase 1 : +10% objectif", "Phase 2 : +5% objectif", "Algorithme intégré actif", "100% des récompenses", "Sans limite de temps", "Récompenses tous les 30 jours"] },
  { size: "$100,000", price: "5 000€", productId: "100k-vip", features: ["Phase 1 : +10% objectif", "Phase 2 : +5% objectif", "Algorithme intégré actif", "100% des récompenses", "Sans limite de temps", "Récompenses tous les 30 jours"] },
];

const VIP_SIMS = [
  { label: "25K",  invest: 1250, challenge: 25000,  reward: 325,  total: 2925,  net: 1675  },
  { label: "50K",  invest: 2500, challenge: 50000,  reward: 650,  total: 5850,  net: 3350  },
  { label: "100K", invest: 5000, challenge: 100000, reward: 1300, total: 11700, net: 6700  },
];

const STEPS = [
  { icon: <Zap size={22} color="#3B82F6" />, title: "Vous choisissez votre compte", desc: "Sélectionnez la taille de compte VIP. Vous payez l'accès une seule fois." },
  { icon: <TrendingUp size={22} color="#3B82F6" />, title: "L'algorithme trade", desc: "Une stratégie algorithmique professionnelle s'active sur votre compte et passe les deux phases automatiquement." },
  { icon: <Shield size={22} color="#3B82F6" />, title: "Validation automatique", desc: "Une fois les objectifs atteints, votre compte Reward est activé automatiquement. Aucune action requise." },
  { icon: <Clock size={22} color="#3B82F6" />, title: "Récompenses tous les 30 jours", desc: "Les profits sont calculés tous les 30 jours. Vous effectuez votre demande de retrait pour recevoir vos récompenses." },
];

export default function VipPage() {
  useLanguage();
  const [simIdx, setSimIdx] = useState(2);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [counter, setCounter] = useState(0);
  const [compVisible, setCompVisible] = useState(false);
  const compRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = compRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setCompVisible(true);
        let start: number | null = null;
        const animate = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / 1800, 1);
          setCounter(Math.round(p * 95));
          if (p < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;
    const plan = VIP_SIMS[simIdx];
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement!.clientWidth;
    const H = 220;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const PL = 64, PR = 16, PT = 16, PB = 36;
    const cW = W - PL - PR, cH = H - PT - PB;
    const maxY = plan.total * 1.08;

    const toX = (i: number) => PL + (i / 12) * cW;
    const toY = (v: number) => PT + ((maxY - v) / maxY) * cH;

    // Phase backgrounds
    ctx.fillStyle = "rgba(59,130,246,0.06)";
    ctx.fillRect(toX(0), PT, toX(3) - toX(0), cH);
    ctx.fillStyle = "rgba(34,197,94,0.05)";
    ctx.fillRect(toX(3), PT, toX(12) - toX(3), cH);

    // Phase labels
    ctx.font = "700 9px system-ui"; ctx.textAlign = "center";
    ctx.fillStyle = "rgba(59,130,246,0.6)";
    ctx.fillText("CHALLENGE", toX(1.5), PT + 14);
    ctx.fillStyle = "rgba(34,197,94,0.6)";
    ctx.fillText("REWARDS", toX(7.5), PT + 14);

    // Grid lines
    const ticks = [0, plan.reward * 3, plan.reward * 6, plan.total];
    ticks.forEach(v => {
      const y = toY(v);
      ctx.beginPath(); ctx.moveTo(PL, y); ctx.lineTo(W - PR, y);
      ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "rgba(148,163,184,0.55)"; ctx.font = "9px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(v >= 1000 ? (v / 1000).toFixed(1) + "K€" : v + "€", PL - 6, y + 3);
    });

    // Investment line
    const invY = toY(plan.invest);
    ctx.beginPath(); ctx.moveTo(PL, invY); ctx.lineTo(W - PR, invY);
    ctx.strokeStyle = "rgba(245,158,11,0.5)"; ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(245,158,11,0.8)"; ctx.font = "700 9px system-ui";
    ctx.textAlign = "left";
    ctx.fillText("Investissement " + plan.invest.toLocaleString("fr-FR") + "€", PL + 4, invY - 5);

    // Cumulative rewards data
    const cumul: number[] = [];
    let acc = 0;
    for (let i = 0; i <= 12; i++) {
      if (i >= 4) acc += plan.reward;
      cumul.push(acc);
    }

    // Area fill
    ctx.beginPath();
    cumul.forEach((v, i) => ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(v)));
    ctx.lineTo(toX(12), PT + cH); ctx.lineTo(toX(0), PT + cH); ctx.closePath();
    const grad = ctx.createLinearGradient(0, PT, 0, PT + cH);
    grad.addColorStop(0, "rgba(34,197,94,0.18)");
    grad.addColorStop(1, "rgba(34,197,94,0.02)");
    ctx.fillStyle = grad; ctx.fill();

    // Cumulative line
    ctx.beginPath();
    cumul.forEach((v, i) => ctx[i === 0 ? "moveTo" : "lineTo"](toX(i), toY(v)));
    ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.stroke();

    // Break-even dot
    const beMonth = Math.ceil(plan.invest / plan.reward) + 3;
    if (beMonth <= 12) {
      const beCumul = (beMonth - 3) * plan.reward;
      ctx.beginPath(); ctx.arc(toX(beMonth), toY(beCumul), 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b"; ctx.strokeStyle = "#000"; ctx.lineWidth = 1.5;
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(245,158,11,0.9)"; ctx.font = "700 9px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Break-even", toX(beMonth), toY(beCumul) - 10);
    }

    // Dots on line
    cumul.forEach((v, i) => {
      if (i < 4) return;
      ctx.beginPath(); ctx.arc(toX(i), toY(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = "#22c55e"; ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
      ctx.fill(); ctx.stroke();
    });

    // X labels
    [0, 1, 2, 3, 4, 7, 10, 12].forEach(i => {
      ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.font = "9px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("M" + i, toX(i), H - 6);
    });

    // Final label
    ctx.fillStyle = "rgba(34,197,94,0.9)"; ctx.font = "700 10px system-ui";
    ctx.textAlign = "right";
    ctx.fillText("+" + plan.total.toLocaleString("fr-FR") + "€", toX(12) - 2, toY(plan.total) - 8);

  }, [simIdx]);

  return (
    <>
      <style>{`
        @keyframes vipTextFlow {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vip-hero-text {
          background: linear-gradient(90deg, #1d4ed8 0%, #3B82F6 20%, #ffffff 40%, #EF4444 60%, #1d4ed8 80%, #3B82F6 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: vipTextFlow 3s linear infinite;
        }
        .fade-1 { animation: fadeUp 0.7s ease forwards; }
        .fade-2 { animation: fadeUp 0.7s ease 0.15s forwards; opacity: 0; }
        .fade-3 { animation: fadeUp 0.7s ease 0.3s forwards; opacity: 0; }
        .fade-4 { animation: fadeUp 0.7s ease 0.45s forwards; opacity: 0; }
        .plan-card {
          background: #0a0a0a;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 36px 28px;
          transition: border-color 0.2s, transform 0.2s;
          position: relative;
        }
        .plan-card:hover { border-color: rgba(59,130,246,0.4); transform: translateY(-4px); }
        .plan-card.popular { border-color: #3B82F6; background: linear-gradient(135deg, #0a0a0a 0%, #0d1829 100%); }
        .step-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 28px 24px;
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(59,130,246,0.25), 0 0 0 1px rgba(59,130,246,0.4); }
          50%       { box-shadow: 0 0 40px rgba(59,130,246,0.45), 0 0 0 1px rgba(59,130,246,0.6); }
        }
        .comp-visible { animation: fadeSlideUp 0.7s ease forwards; }
        .comp-hidden  { opacity: 0; }
        .comp-vip-card { animation: glowPulse 3s ease-in-out infinite; }
        .comp-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .comp-row:last-child { border-bottom: none; }
        .comp-cell {
          padding: 16px 20px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .comp-cell-bad  { color: rgba(255,255,255,0.45); border-right: 1px solid rgba(255,255,255,0.05); }
        .comp-cell-good { color: rgba(255,255,255,0.9); font-weight: 600; }
        .disclaimer {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px 24px;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          line-height: 1.7;
        }
      `}</style>

      <Navbar />

      <main style={{ background: "#000", paddingLeft: 24, paddingRight: 24 }}>

        {/* Hero */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "calc(72px + var(--promo-banner-height, 0px) + 40px)", paddingBottom: 16, position: "relative", overflow: "hidden" }}>
          {/* Spotlight beam */}
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 1000, height: 440, background: "radial-gradient(ellipse 60% 95% at 50% -10%, rgba(59,130,246,0.9) 0%, rgba(59,130,246,0.55) 18%, rgba(59,130,246,0.2) 42%, rgba(59,130,246,0.05) 65%, transparent 80%)", filter: "blur(3px)", pointerEvents: "none", zIndex: 0 }} />
          <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, height: 320, background: "radial-gradient(ellipse 45% 75% at 50% -20%, rgba(147,197,253,0.75) 0%, rgba(59,130,246,0.35) 40%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
          <div style={{ maxWidth: 1100, width: "100%", margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
            <h1 className="fade-1" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", fontWeight: 900, color: "#fff", lineHeight: 1.05, marginBottom: 24, marginTop: 0 }}>
              Challenge <span className="vip-hero-text">VIP</span><br />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.55em", fontWeight: 600 }}>L&apos;algorithme s&apos;occupe de tout</span>
            </h1>
            <p className="fade-3" style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 900, margin: "0 auto 16px", lineHeight: 1.7 }}>
              Vous payez l&apos;accès une seule fois. Une stratégie algorithmique professionnelle s&apos;active sur votre compte, passe les phases, et les récompenses sont disponibles tous les 30 jours.
            </p>
          </div>
        </div>

        {/* Reste de la page */}
        <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 80 }}>

          {/* Plans */}
          <div style={{ marginBottom: 64 }}>
            <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, marginBottom: 12, color: "#fff", textShadow: "0 0 8px rgba(59,130,246,0.9), 0 0 24px rgba(59,130,246,0.6), 0 0 48px rgba(59,130,246,0.35)" }}>Choisissez votre compte VIP</h2>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 40 }}>Accès unique — aucun abonnement</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {PLANS.map((p, i) => (
                <div key={i} className={`plan-card${p.popular ? " popular" : ""}`}>
                  {p.popular && (
                    <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#3B82F6", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", padding: "4px 16px", borderRadius: 100 }}>
                      Le Plus Populaire
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "1.5px" }}>Taille du compte</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 10 }}>{p.size}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "1.5px" }}>Prix d&apos;accès unique</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#3B82F6", marginBottom: 24 }}>{p.price}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                    {p.features.map((f, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Check size={14} color="#22c55e" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a href={`/checkout-vip?product=${p.productId}`} style={{
                    display: "block", textAlign: "center",
                    background: p.popular ? "#3B82F6" : "rgba(255,255,255,0.08)",
                    color: "#fff", borderRadius: 10, padding: "14px 0",
                    fontWeight: 800, fontSize: 13, letterSpacing: "1px",
                    textTransform: "uppercase", textDecoration: "none",
                    border: p.popular ? "none" : "1px solid rgba(255,255,255,0.15)",
                    transition: "opacity 0.2s",
                  }}>
                    Accéder au Challenge VIP
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* ── Comparatif VIP vs Classique ── */}
          <div ref={compRef} style={{ marginBottom: 80 }}>

            {/* Stat choc */}
            <div className={compVisible ? "comp-visible" : "comp-hidden"} style={{ textAlign: "center", marginBottom: 56 }}>
              <div style={{ display: "inline-block", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 100, padding: "4px 18px", fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: "#EF4444", textTransform: "uppercase", marginBottom: 20 }}>
                Challenge classique — réalité du marché
              </div>
              <div style={{ fontSize: "clamp(88px, 18vw, 160px)", fontWeight: 900, color: "#EF4444", lineHeight: 0.9, fontVariantNumeric: "tabular-nums", letterSpacing: "-4px" }}>
                {counter}%
              </div>
              <div style={{ fontSize: "clamp(16px, 3vw, 22px)", fontWeight: 700, color: "#fff", marginTop: 16, marginBottom: 8 }}>
                des participants n&apos;atteignent jamais les récompenses
              </div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 520, margin: "0 auto" }}>
                Seuls les traders les plus expérimentés et les plus disciplinés y parviennent. Le challenge classique n&apos;est pas fait pour tout le monde.
              </div>
            </div>

            {/* Comparaison côte à côte */}
            <div className={compVisible ? "comp-visible" : "comp-hidden"} style={{ animationDelay: "0.2s", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>

              {/* En-têtes */}
              <div style={{ background: "rgba(239,68,68,0.06)", padding: "24px 20px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(239,68,68,0.7)", marginBottom: 6 }}>❌ Challenge Classique</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Vous tradez vous-même</div>
              </div>
              <div className="comp-vip-card" style={{ background: "rgba(59,130,246,0.08)", padding: "24px 20px", textAlign: "center", borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#3B82F6", marginBottom: 6 }}>✦ Challenge VIP</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>L&apos;algorithme s&apos;occupe de tout</div>
              </div>

              {/* Lignes de comparaison */}
              {[
                {
                  label: "Qui trade ?",
                  bad:  "Vous — avec le risque émotionnel et humain",
                  good: "Un algorithme professionnel, sans émotion",
                },
                {
                  label: "Taux de succès",
                  bad:  "~5% des traders atteignent les récompenses",
                  good: "100% — les phases sont passées automatiquement",
                },
                {
                  label: "Expérience requise",
                  bad:  "Des années de pratique et d'apprentissage",
                  good: "Aucune — accès immédiat pour tous",
                },
                {
                  label: "Temps quotidien",
                  bad:  "4 à 8 heures d'analyse et de trading",
                  good: "0 minute — l'algo tourne 24h/24",
                },
                {
                  label: "Récompenses",
                  bad:  "Incertaines — si et seulement si vous réussissez",
                  good: "Garanties dès le 4ème mois, tous les 30 jours",
                },
                {
                  label: "Limite de temps",
                  bad:  "Stricte — échec si non respectée",
                  good: "Aucune — l'algo avance à son rythme",
                },
                {
                  label: "Stress",
                  bad:  "Élevé — drawdown, pression, pertes",
                  good: "Inexistant — vous suivez, l'algo exécute",
                },
                {
                  label: "Split des récompenses",
                  bad:  "Partiel selon les propfirms (70-80%)",
                  good: "100% pour vous, sans exception",
                },
              ].map((row, i) => (
                <div key={i} className="comp-row">
                  <div className="comp-cell comp-cell-bad" style={{ background: i % 2 === 0 ? "rgba(239,68,68,0.03)" : "transparent" }}>
                    <span style={{ color: "#EF4444", fontSize: 14, flexShrink: 0 }}>✗</span>
                    <span>{row.bad}</span>
                  </div>
                  <div className="comp-cell comp-cell-good" style={{ background: i % 2 === 0 ? "rgba(59,130,246,0.05)" : "rgba(59,130,246,0.02)" }}>
                    <span style={{ color: "#22c55e", fontSize: 14, flexShrink: 0 }}>✓</span>
                    <span>{row.good}</span>
                  </div>
                </div>
              ))}

              {/* CTA final */}
              <div style={{ gridColumn: "1 / -1", background: "rgba(59,130,246,0.06)", padding: "28px 24px", textAlign: "center", borderTop: "1px solid rgba(59,130,246,0.15)" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Pourquoi laisser 95% de chances à l&apos;échec quand vous pouvez garantir votre succès ?
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  Le Challenge VIP n&apos;est pas un avantage — c&apos;est une évidence.
                </div>
              </div>
            </div>
          </div>

          {/* Simulation de performance */}
          <div style={{ marginBottom: 80, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: "40px 32px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ display: "inline-block", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 100, padding: "4px 16px", fontSize: 10, fontWeight: 700, letterSpacing: "2px", color: "#22c55e", textTransform: "uppercase", marginBottom: 12 }}>
                Projection financière
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Évolution de votre compte sur 12 mois</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>1,3% de rewards disponibles sur demande chaque mois dès le mois 4 — Split 100% client</p>
            </div>

            {/* Sélecteur compte */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 28 }}>
              {VIP_SIMS.map((s, i) => (
                <button key={i} onClick={() => setSimIdx(i)} style={{
                  padding: "8px 22px", borderRadius: 100, cursor: "pointer",
                  background: simIdx === i ? "#3B82F6" : "rgba(255,255,255,0.06)",
                  border: simIdx === i ? "none" : "1px solid rgba(255,255,255,0.1)",
                  color: simIdx === i ? "#fff" : "rgba(255,255,255,0.5)",
                  fontSize: 13, fontWeight: 800, transition: "all 0.2s",
                }}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* KPIs */}
            {(() => {
              const p = VIP_SIMS[simIdx];
              const beMonth = Math.ceil(p.invest / p.reward) + 3;
              const roi = Math.round((p.net / p.invest) * 100);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: 28 }}>
                  {[
                    { label: "Investissement", value: p.invest.toLocaleString("fr-FR") + "€", color: "#94a3b8" },
                    { label: "Reward / mois", value: "+" + p.reward.toLocaleString("fr-FR") + "€", color: "#22c55e" },
                    { label: "Total rewards 12 mois", value: "+" + p.total.toLocaleString("fr-FR") + "€", color: "#22c55e" },
                    { label: "Gain net", value: "+" + p.net.toLocaleString("fr-FR") + "€", color: "#22c55e" },
                    { label: "ROI", value: roi + "%", color: "#f59e0b" },
                    { label: "Break-even", value: "Mois " + beMonth, color: "#f59e0b" },
                  ].map((k, i) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>{k.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Chart */}
            <div style={{ width: "100%", position: "relative" }}>
              <canvas ref={chartRef} style={{ display: "block", width: "100%" }} />
            </div>

            <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              Projection basée sur un taux fixe de 1,3%/mois sur le compte propfirm · Rewards disponibles sur demande du mois 4 au mois 12 · Split 100% client
            </div>
          </div>

          {/* Comment ça marche */}
          <div style={{ marginBottom: 80 }}>
            <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 40 }}>Comment ça marche</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {STEPS.map((s, i) => (
                <div key={i} className="step-card">
                  <div style={{ marginBottom: 16 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, color: "#3B82F6", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Étape {i + 1}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer légal */}
          <div className="disclaimer">
            <strong style={{ color: "rgba(255,255,255,0.6)" }}>Avertissement :</strong> Les Challenges VIP Traders Rewards utilisent des comptes de trading simulés. L&apos;algorithme activé opère sur un environnement de démonstration. Aucun capital réel n&apos;est investi. Les récompenses versées proviennent du programme Traders Rewards et ne constituent pas des rendements d&apos;investissement. Ce service est un outil d&apos;entraînement algorithmique dans un cadre éducatif simulé. Les performances passées de l&apos;algorithme ne garantissent pas les résultats futurs. Accès limité — Traders Rewards se réserve le droit de suspendre les nouvelles inscriptions à tout moment.
          </div>

        </div>
      </main>
    </>
  );
}
