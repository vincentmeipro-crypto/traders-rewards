"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

export default function Rules() {
  const { T, lang } = useLanguage();
  const [tab, setTab] = useState<"challenge" | "funded">("challenge");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isFr = lang === "fr";

  const labels = {
    tabChallenge: isFr ? "Règles Compte Challenge" : "Challenge Account Rules",
    tabFunded: isFr ? "Règles Compte Certifié" : "Certified Account Rules",
    phase1: isFr ? "Phase 1" : "Phase 1",
    phase2: isFr ? "Phase 2" : "Phase 2",
    oneStep: isFr ? "1 Étape" : "1-Step",
    twoStep: isFr ? "2 Étapes" : "2-Step",
    profitTarget: isFr ? "Objectif de Profit" : "Profit Target",
    dailyLoss: isFr ? "Perte Journalière Max" : "Max Daily Loss",
    totalLoss: isFr ? "Perte Totale Max" : "Max Total Loss",
    tradingDays: isFr ? "Jours de Trading Min" : "Min Trading Days",
    timeLimit: isFr ? "Limite de Temps" : "Time Limit",
    bestDay: isFr ? "Règle Meilleur Jour" : "Best Day Rule",
    none: isFr ? "Aucune" : "None",
    days: isFr ? "jours" : "days",
    profitSplit: isFr ? "Partage des Profits" : "Profit Split",
    payout: isFr ? "Fréquence des Récompenses" : "Reward Frequency",
    payoutVal: isFr ? "À partir du J+7" : "From Day 7+",
    feeRefund: isFr ? "Remboursement des Frais" : "Fee Refund",
    feeRefundVal: isFr ? "À la 1ère récompense" : "At 1st reward",
    scaling: isFr ? "Scaling Possible" : "Scaling",
    scalingVal: isFr ? "Jusqu'à $400,000" : "Up to $400,000",
    noTarget: isFr ? "Aucun objectif" : "No target",
    keepRules: isFr ? "Maintenues" : "Maintained",
  };

  const challengeRows2Step = [
    { label: labels.profitTarget,  p1: "+10%",       p2: "+5%"        },
    { label: labels.dailyLoss,     p1: "5%",         p2: "5%"         },
    { label: labels.totalLoss,     p1: "10%",        p2: "10%"        },
    { label: labels.tradingDays,   p1: `5 ${labels.days}`, p2: `5 ${labels.days}` },
    { label: labels.timeLimit,     p1: labels.none,  p2: labels.none  },
  ];

  const challengeRows1Step = [
    { label: labels.profitTarget,  val: "+8%"                               },
    { label: labels.dailyLoss,     val: "3%"                                },
    { label: labels.totalLoss,     val: isFr ? "8% (Trailing EOD)" : "8% (Trailing EOD)" },
    { label: labels.bestDay,       val: isFr ? "≤ 50% du profit total" : "≤ 50% of total profits" },
    { label: labels.tradingDays,   val: `5 ${labels.days}`                  },
    { label: labels.timeLimit,     val: labels.none                         },
  ];

  const fundedRows = [
    { label: labels.profitTarget, v2: labels.noTarget,            v1: labels.noTarget            },
    { label: labels.dailyLoss,    v2: labels.keepRules + " (5%)", v1: labels.keepRules + " (3%)" },
    { label: labels.totalLoss,    v2: labels.keepRules + " (10%)",v1: labels.keepRules + " (10%)" },
    { label: labels.tradingDays,  v2: isFr ? "7 jours" : "7 days", v1: isFr ? "7 jours" : "7 days" },
    { label: isFr ? "Trading news" : "News trading",  v2: isFr ? "±5 min interdit" : "±5 min banned", v1: isFr ? "±5 min interdit" : "±5 min banned" },
    { label: labels.profitSplit,  v2: "80%",                      v1: "90%"                      },
    { label: labels.payout,       v2: labels.payoutVal,           v1: labels.payoutVal           },
  ];

  const groups = [
    { title: T.rules.allowed,    color: "#1565C0", items: T.rules.allowedList,    icon: "✓" },
    { title: T.rules.notAllowed, color: "#ef4444", items: T.rules.notAllowedList, icon: "✕" },
  ];

  return (
    <section id="rules" style={{ padding: "100px 24px", backgroundColor: "transparent", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/hero-section-bg.png')", backgroundSize: "cover", backgroundPosition: "center", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span className="section-label" style={{ display: "block", marginBottom: 16 }}>{T.rules.label}</span>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(2.2rem, 5vw, 3.4rem)", fontWeight: 600, color: "#0D1B3E", letterSpacing: "1px" }}>
            {T.rules.title} <em style={{ color: "#0D1B3E", fontStyle: "italic" }}>{T.rules.titleGold}</em>
          </h2>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
          {(["challenge", "funded"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 28px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
              border: tab === t ? "1px solid #1565C0" : "1px solid rgba(0,0,0,0.1)",
              backgroundColor: tab === t ? "#1565C0" : "#fff",
              color: tab === t ? "#fff" : "#4a5568",
              transition: "all 0.2s",
              boxShadow: tab === t ? "0 4px 16px rgba(13,27,62,0.2)" : "none",
            }}>
              {t === "challenge" ? labels.tabChallenge : labels.tabFunded}
            </button>
          ))}
        </div>

        {/* Challenge Tab */}
        {tab === "challenge" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24, marginBottom: 40 }}>

            {/* 2-Step table */}
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <span style={{ backgroundColor: "rgba(27,79,216,0.08)", color: "#1B4FD8", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 100, border: "1px solid rgba(27,79,216,0.2)" }}>{labels.twoStep}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                <div style={{ padding: "10px 0", color: "#8a96aa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{isFr ? "Critère" : "Criteria"}</div>
                <div style={{ padding: "10px 0", color: "#1B4FD8", fontSize: 11, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{labels.phase1}</div>
                <div style={{ padding: "10px 0", color: "#1B4FD8", fontSize: 11, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{labels.phase2}</div>
                {challengeRows2Step.map((row, i) => (
                  <>
                    <div key={`l${i}`} style={{ padding: "12px 0", color: "#4a5568", fontSize: 13, borderBottom: i < challengeRows2Step.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>{row.label}</div>
                    <div key={`p1${i}`} style={{ padding: "12px 0", color: "#1565C0", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < challengeRows2Step.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>{row.p1}</div>
                    <div key={`p2${i}`} style={{ padding: "12px 0", color: "#1565C0", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < challengeRows2Step.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>{row.p2}</div>
                  </>
                ))}
              </div>
            </div>

            {/* 1-Step table */}
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <span style={{ backgroundColor: "rgba(27,79,216,0.08)", color: "#1B4FD8", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 100, border: "1px solid rgba(27,79,216,0.2)" }}>{labels.oneStep} ⚡</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                <div style={{ padding: "10px 0", color: "#8a96aa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{isFr ? "Critère" : "Criteria"}</div>
                <div style={{ padding: "10px 0", color: "#1B4FD8", fontSize: 11, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{isFr ? "Valeur" : "Value"}</div>
                {challengeRows1Step.map((row, i) => (
                  <>
                    <div key={`l${i}`} style={{ padding: "12px 0", color: "#4a5568", fontSize: 13, borderBottom: i < challengeRows1Step.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>{row.label}</div>
                    <div key={`v${i}`} style={{ padding: "12px 0", color: "#1565C0", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < challengeRows1Step.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>{row.val}</div>
                  </>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Funded Tab */}
        {tab === "funded" && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16, padding: 28, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 0 }}>
                <div style={{ padding: "10px 0", color: "#8a96aa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{isFr ? "Critère" : "Criteria"}</div>
                <div style={{ padding: "10px 0", color: "#1B4FD8", fontSize: 11, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{labels.twoStep}</div>
                <div style={{ padding: "10px 0", color: "#1B4FD8", fontSize: 11, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{labels.oneStep} ⚡</div>
                {fundedRows.map((row, i) => (
                  <>
                    <div key={`l${i}`} style={{ padding: "14px 0", color: "#4a5568", fontSize: 13, borderBottom: i < fundedRows.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>{row.label}</div>
                    <div key={`v2${i}`} style={{ padding: "14px 0", color: "#1565C0", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < fundedRows.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>{row.v2}</div>
                    <div key={`v1${i}`} style={{ padding: "14px 0", color: "#1565C0", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < fundedRows.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>{row.v1}</div>
                  </>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Risk Philosophy Block */}
        <div style={{ marginBottom: 32, backgroundColor: "rgba(27,79,216,0.04)", border: "1px solid rgba(27,79,216,0.12)", borderRadius: 16, padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>⚖️</span>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1B4FD8", marginBottom: 10, letterSpacing: "-0.3px" }}>
                {isFr ? "Notre approche sur la gestion du risque" : "Our approach to risk management"}
              </h3>
              <p style={{ color: "#4a5568", fontSize: 14, lineHeight: 1.8 }}>
                {isFr
                  ? "Il n'existe pas de règle fixe sur la taille de vos positions. Nous surveillons activement l'activité de chaque trader et nous nous réservons le droit d'examiner tout compte présentant des signes de gestion du risque insuffisante ou non viable. Cet examen est mené au cas par cas."
                  : "There is no fixed rule on position sizing. We actively monitor every trader's activity and reserve the right to review any account showing signs of insufficient or unsustainable risk management. Each review is conducted on a case-by-case basis."}
              </p>
              <p style={{ color: "#4a5568", fontSize: 14, lineHeight: 1.8, marginTop: 10 }}>
                {isFr
                  ? "De manière générale, risquer systématiquement une part importante de la perte journalière maximale sur une seule idée de trading sera considéré comme non viable. Chez Traders Rewards, nous privilégions les traders qui font preuve de constance, de discipline et d'une vision à long terme. Traitez votre compte comme vous le feriez avec votre propre capital réel."
                  : "In general, consistently risking a significant portion of the maximum daily loss on a single trade idea will be considered unsustainable. At Traders Rewards, we look for traders who demonstrate consistency, discipline, and a long-term vision. Treat your account as you would your own real capital."}
              </p>
            </div>
          </div>
        </div>

        {/* Allowed / Not Allowed */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {groups.map((group, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 16, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 24, color: group.color, textTransform: "uppercase", letterSpacing: "2px" }}>{group.title}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {group.items.map((rule, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: group.color, fontSize: 15, marginTop: 1, flexShrink: 0, fontWeight: 700 }}>{group.icon}</span>
                    <span style={{ color: "#4a5568", fontSize: 14, lineHeight: 1.6 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 60, borderRadius: 20, padding: "56px 40px", textAlign: "center", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 8px 32px rgba(21,101,192,0.1)" }}>
          <h3 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 600, color: "#0D1B3E", marginBottom: 16, letterSpacing: "1px" }}>
            {T.rules.ctaTitle} <em style={{ color: "#0D1B3E", fontStyle: "italic" }}>{T.rules.ctaGold}</em>
          </h3>
          <p style={{ color: "#8a96aa", fontSize: 16, marginBottom: 32 }}>{T.rules.ctaSub}</p>
          <a href="/#pricing" style={{ display: "inline-block", background: "#0D1B3E", color: "#fff", padding: "15px 48px", borderRadius: 6, fontWeight: 800, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background = "#1a3a6b"; }}
            onMouseOut={e => { e.currentTarget.style.background = "#0D1B3E"; }}
          >{T.rules.ctaBtn}</a>
        </div>

      </div>
    </section>
  );
}
