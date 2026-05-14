"use client";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

export default function Rules() {
  const { T, lang } = useLanguage();
  const [tab, setTab] = useState<"challenge" | "funded">("challenge");

  const isFr = lang === "fr";

  const labels = {
    tabChallenge: isFr ? "Règles du Challenge" : "Challenge Rules",
    tabFunded: isFr ? "Règles Funded" : "Funded Rules",
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
    payout: isFr ? "Fréquence des Retraits" : "Payout Frequency",
    payoutVal: isFr ? "À tout moment (24-48h)" : "Anytime (24-48h)",
    feeRefund: isFr ? "Remboursement des Frais" : "Fee Refund",
    feeRefundVal: isFr ? "Au 1er retrait" : "At 1st payout",
    scaling: isFr ? "Scaling Possible" : "Scaling",
    scalingVal: isFr ? "Jusqu'à $400,000" : "Up to $400,000",
    noTarget: isFr ? "Aucun objectif" : "No target",
    keepRules: isFr ? "Maintenues" : "Maintained",
  };

  const challengeRows2Step = [
    { label: labels.profitTarget,  p1: "+10%",       p2: "+5%"        },
    { label: labels.dailyLoss,     p1: "5%",         p2: "5%"         },
    { label: labels.totalLoss,     p1: "10%",        p2: "10%"        },
    { label: labels.tradingDays,   p1: `4 ${labels.days}`, p2: `4 ${labels.days}` },
    { label: labels.timeLimit,     p1: labels.none,  p2: labels.none  },
  ];

  const challengeRows1Step = [
    { label: labels.profitTarget,  val: "+10%"                              },
    { label: labels.dailyLoss,     val: "3%"                                },
    { label: labels.totalLoss,     val: isFr ? "10% (Trailing)" : "10% (Trailing)" },
    { label: labels.bestDay,       val: isFr ? "≤ 50% du profit total" : "≤ 50% of total profits" },
    { label: labels.tradingDays,   val: `4 ${labels.days}`                  },
    { label: labels.timeLimit,     val: labels.none                         },
  ];

  const fundedRows = [
    { label: labels.profitTarget, v2: labels.noTarget,           v1: labels.noTarget           },
    { label: labels.dailyLoss,    v2: labels.keepRules + " (5%)", v1: labels.keepRules + " (3%)" },
    { label: labels.totalLoss,    v2: labels.keepRules + " (10%)", v1: labels.keepRules + " (10%)" },
    { label: labels.profitSplit,  v2: "80%",                      v1: "90%"                     },
    { label: labels.payout,       v2: labels.payoutVal,           v1: labels.payoutVal          },
    { label: labels.feeRefund,    v2: labels.feeRefundVal,        v1: labels.feeRefundVal       },
    { label: labels.scaling,      v2: labels.scalingVal,          v1: labels.scalingVal         },
  ];

  const groups = [
    { title: T.rules.allowed,    color: "#22c55e", items: T.rules.allowedList,    icon: "✓" },
    { title: T.rules.notAllowed, color: "#ef4444", items: T.rules.notAllowedList, icon: "✕" },
  ];

  return (
    <section id="rules" style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 16 }}>{T.rules.label}</span>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-1px" }}>
            {T.rules.title} <span className="gold-gradient">{T.rules.titleGold}</span>
          </h2>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40 }}>
          {(["challenge", "funded"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 28px", borderRadius: 100, fontWeight: 700, fontSize: 14, cursor: "pointer",
              border: tab === t ? "1px solid #C9A84C" : "1px solid #222",
              backgroundColor: tab === t ? "rgba(201,168,76,0.12)" : "transparent",
              color: tab === t ? "#C9A84C" : "#555",
              transition: "all 0.2s",
            }}>
              {t === "challenge" ? labels.tabChallenge : labels.tabFunded}
            </button>
          ))}
        </div>

        {/* Challenge Tab */}
        {tab === "challenge" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 40 }}>

            {/* 2-Step table */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }}>{labels.twoStep}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                <div style={{ padding: "10px 0", color: "#444", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #1a1a1a" }}>{isFr ? "Critère" : "Criteria"}</div>
                <div style={{ padding: "10px 0", color: "#C9A84C", fontSize: 12, fontWeight: 700, textAlign: "center", borderBottom: "1px solid #1a1a1a" }}>{labels.phase1}</div>
                <div style={{ padding: "10px 0", color: "#C9A84C", fontSize: 12, fontWeight: 700, textAlign: "center", borderBottom: "1px solid #1a1a1a" }}>{labels.phase2}</div>
                {challengeRows2Step.map((row, i) => (
                  <>
                    <div key={`l${i}`} style={{ padding: "12px 0", color: "#666", fontSize: 13, borderBottom: i < challengeRows2Step.length - 1 ? "1px solid #111" : "none" }}>{row.label}</div>
                    <div key={`p1${i}`} style={{ padding: "12px 0", color: "#fff", fontSize: 13, fontWeight: 600, textAlign: "center", borderBottom: i < challengeRows2Step.length - 1 ? "1px solid #111" : "none" }}>{row.p1}</div>
                    <div key={`p2${i}`} style={{ padding: "12px 0", color: "#fff", fontSize: 13, fontWeight: 600, textAlign: "center", borderBottom: i < challengeRows2Step.length - 1 ? "1px solid #111" : "none" }}>{row.p2}</div>
                  </>
                ))}
              </div>
            </div>

            {/* 1-Step table */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100 }}>{labels.oneStep} ⚡</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                <div style={{ padding: "10px 0", color: "#444", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #1a1a1a" }}>{isFr ? "Critère" : "Criteria"}</div>
                <div style={{ padding: "10px 0", color: "#C9A84C", fontSize: 12, fontWeight: 700, textAlign: "center", borderBottom: "1px solid #1a1a1a" }}>{isFr ? "Valeur" : "Value"}</div>
                {challengeRows1Step.map((row, i) => (
                  <>
                    <div key={`l${i}`} style={{ padding: "12px 0", color: "#666", fontSize: 13, borderBottom: i < challengeRows1Step.length - 1 ? "1px solid #111" : "none" }}>{row.label}</div>
                    <div key={`v${i}`} style={{ padding: "12px 0", color: "#fff", fontSize: 13, fontWeight: 600, textAlign: "center", borderBottom: i < challengeRows1Step.length - 1 ? "1px solid #111" : "none" }}>{row.val}</div>
                  </>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Funded Tab */}
        {tab === "funded" && (
          <div style={{ marginBottom: 40 }}>
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 0 }}>
                <div style={{ padding: "10px 0", color: "#444", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #1a1a1a" }}>{isFr ? "Critère" : "Criteria"}</div>
                <div style={{ padding: "10px 0", color: "#C9A84C", fontSize: 12, fontWeight: 700, textAlign: "center", borderBottom: "1px solid #1a1a1a" }}>{labels.twoStep}</div>
                <div style={{ padding: "10px 0", color: "#C9A84C", fontSize: 12, fontWeight: 700, textAlign: "center", borderBottom: "1px solid #1a1a1a" }}>{labels.oneStep} ⚡</div>
                {fundedRows.map((row, i) => (
                  <>
                    <div key={`l${i}`} style={{ padding: "14px 0", color: "#666", fontSize: 13, borderBottom: i < fundedRows.length - 1 ? "1px solid #111" : "none" }}>{row.label}</div>
                    <div key={`v2${i}`} style={{ padding: "14px 0", color: "#fff", fontSize: 13, fontWeight: 600, textAlign: "center", borderBottom: i < fundedRows.length - 1 ? "1px solid #111" : "none" }}>{row.v2}</div>
                    <div key={`v1${i}`} style={{ padding: "14px 0", color: "#fff", fontSize: 13, fontWeight: 600, textAlign: "center", borderBottom: i < fundedRows.length - 1 ? "1px solid #111" : "none" }}>{row.v1}</div>
                  </>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Allowed / Not Allowed */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
          {groups.map((group, i) => (
            <div key={i} className="card" style={{ padding: "32px" }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 24, color: group.color, textTransform: "uppercase", letterSpacing: "1.5px" }}>{group.title}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {group.items.map((rule, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: group.color, fontSize: 16, marginTop: 1, flexShrink: 0 }}>{group.icon}</span>
                    <span style={{ color: "#888", fontSize: 14, lineHeight: 1.5 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 60, backgroundColor: "#111", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 20, padding: "48px 40px", textAlign: "center", background: "linear-gradient(145deg, #0f0f0f, #141208)" }}>
          <h3 style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: 16, letterSpacing: "-1px" }}>
            {T.rules.ctaTitle} <span className="gold-gradient">{T.rules.ctaGold}</span>
          </h3>
          <p style={{ color: "#666", fontSize: 16, marginBottom: 32 }}>{T.rules.ctaSub}</p>
          <a href="/#pricing" className="btn-primary" style={{ fontSize: 15, padding: "16px 48px" }}>{T.rules.ctaBtn}</a>
        </div>

      </div>
    </section>
  );
}
