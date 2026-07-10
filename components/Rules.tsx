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
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  const labels = {
    tabChallenge: L("Règles Compte Challenge","Reglas Cuenta Desafío","Challenge Account Rules"),
    tabFunded:    L("Règles Compte Reward","Reglas Cuenta Reward","Reward Account Rules"),
    phase1: "Phase 1", phase2: "Phase 2",
    oneStep: L("1 Étape","1 Paso","1-Step"),
    twoStep: L("2 Étapes","2 Pasos","2-Step"),
    profitTarget: L("Objectif de Profit","Objetivo de Profit","Profit Target"),
    dailyLoss:    L("Perte Journalière Max","Pérdida Diaria Máx","Max Daily Loss"),
    totalLoss:    L("Perte Totale Max","Pérdida Total Máx","Max Total Loss"),
    tradingDays:  L("Jours de Trading Min","Días de Trading Mín","Min Trading Days"),
    timeLimit:    L("Limite de Temps","Límite de Tiempo","Time Limit"),
    bestDay:      L("Règle Meilleur Jour","Regla Mejor Día","Best Day Rule"),
    none:         L("Aucune","Ninguno","None"),
    days:         L("jours","días","days"),
    profitSplit:  L("Partage des Profits","Reparto de Profits","Profit Split"),
    payout:       L("Fréquence des Récompenses","Frecuencia de Recompensas","Reward Frequency"),
    payoutVal:    L("Tous les 15 jours","Cada 15 días","Every 15 days"),
    feeRefund:    L("Remboursement des Frais","Reembolso de Tasas","Fee Refund"),
    feeRefundVal: L("À la 1ère récompense","En la 1ª recompensa","At 1st reward"),
    scaling:      L("Scaling Possible","Scaling Posible","Scaling"),
    scalingVal:   L("Jusqu'à $200,000","Hasta $200,000","Up to $200,000"),
    noTarget:     L("Aucun objectif","Sin objetivo","No target"),
    keepRules:    L("Maintenues","Mantenidas","Maintained"),
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
    { label: labels.totalLoss,     val: "8% (Trailing EOD)" },
    { label: labels.bestDay,       val: L("≤ 50% du profit total","≤ 50% del profit total","≤ 50% of total profits") },
    { label: labels.tradingDays,   val: `5 ${labels.days}`                  },
    { label: labels.timeLimit,     val: labels.none                         },
  ];

  const fundedRows = [
    { label: labels.profitTarget,                         v2: labels.noTarget,             v1: labels.noTarget,              vi: labels.noTarget              },
    { label: labels.dailyLoss,                            v2: labels.keepRules + " (5%)",  v1: labels.keepRules + " (3%)",   vi: "3% EOD"                     },
    { label: labels.totalLoss,                            v2: labels.keepRules + " (10%)", v1: labels.keepRules + " (8% EOD)",vi: "8% EOD"                    },
    { label: labels.tradingDays,                                  v2: L("15 jours","15 días","15 days"), v1: L("15 jours","15 días","15 days"), vi: L("15 jours","15 días","15 days") },
    { label: L("Risque par trade","Riesgo por trade","Risk per trade"), v2: "—", v1: "—", vi: "≤ 1.5%" },
    { label: "Stop Loss",                                         v2: "—",                  v1: "—",                          vi: L("Obligatoire < 1min","Obligatorio < 1min","Required < 1min") },
    { label: labels.profitSplit,                          v2: "80%",                       v1: "90%",                        vi: "90%"                        },
    { label: labels.payout,                               v2: labels.payoutVal,            v1: labels.payoutVal,             vi: labels.payoutVal             },
  ];

  const groups = [
    { title: T.rules.allowed,    color: "#1565C0", items: T.rules.allowedList,    icon: "✓" },
    { title: T.rules.notAllowed, color: "#ef4444", items: T.rules.notAllowedList, icon: "✕" },
  ];

  return (
    <section id="rules" style={{ padding: "80px 24px", backgroundColor: "#000000", position: "relative", overflow: "hidden" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>

        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#3B82F6", marginBottom: 16 }}>{T.rules.label}</div>
          <h2 style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-1px" }}>
            {T.rules.title} <span style={{ color: "#3B82F6" }}>{T.rules.titleGold}</span>
          </h2>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 36 }}>
          {(["challenge", "funded"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "10px 28px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
              border: tab === t ? "1px solid #3B82F6" : "1px solid rgba(255,255,255,0.12)",
              backgroundColor: tab === t ? "#3B82F6" : "transparent",
              color: tab === t ? "#FFFFFF" : "rgba(255,255,255,0.6)",
              transition: "all 0.2s",
            }}>
              {t === "challenge" ? labels.tabChallenge : labels.tabFunded}
            </button>
          ))}
        </div>

        {/* Challenge Tab */}
        {tab === "challenge" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 32 }}>

            {/* 2-Step table */}
            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#FFFFFF", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)" }}>{labels.twoStep}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                <div style={{ padding: "8px 0", color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{isFr ? "Critère" : "Criteria"}</div>
                <div style={{ padding: "8px 0", color: "#3B82F6", fontSize: 10, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{labels.phase1}</div>
                <div style={{ padding: "8px 0", color: "#3B82F6", fontSize: 10, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{labels.phase2}</div>
                {challengeRows2Step.map((row, i) => (
                  <>
                    <div key={`l${i}`} style={{ padding: "10px 0", color: "rgba(255,255,255,0.6)", fontSize: 13, borderBottom: i < challengeRows2Step.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{row.label}</div>
                    <div key={`p1${i}`} style={{ padding: "10px 0", color: "#FFFFFF", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < challengeRows2Step.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{row.p1}</div>
                    <div key={`p2${i}`} style={{ padding: "10px 0", color: "#FFFFFF", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < challengeRows2Step.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{row.p2}</div>
                  </>
                ))}
              </div>
            </div>

            {/* 1-Step table */}
            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#FFFFFF", fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)" }}>{labels.oneStep} ⚡</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                <div style={{ padding: "8px 0", color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{isFr ? "Critère" : "Criteria"}</div>
                <div style={{ padding: "8px 0", color: "#3B82F6", fontSize: 10, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{isFr ? "Valeur" : "Value"}</div>
                {challengeRows1Step.map((row, i) => (
                  <>
                    <div key={`l${i}`} style={{ padding: "10px 0", color: "rgba(255,255,255,0.6)", fontSize: 13, borderBottom: i < challengeRows1Step.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{row.label}</div>
                    <div key={`v${i}`} style={{ padding: "10px 0", color: "#FFFFFF", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < challengeRows1Step.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{row.val}</div>
                  </>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Funded Tab */}
        {tab === "funded" && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: isMobile ? 16 : 24, overflowX: isMobile ? "auto" : "visible" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "140px 80px 80px 100px" : "2fr 1fr 1fr 1fr", gap: 0, minWidth: isMobile ? 400 : "auto" }}>
                <div style={{ padding: "8px 0", color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{isFr ? "Critère" : "Criteria"}</div>
                <div style={{ padding: "8px 0", color: "#3B82F6", fontSize: 10, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{labels.twoStep}</div>
                <div style={{ padding: "8px 0", color: "#3B82F6", fontSize: 10, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{labels.oneStep} ⚡</div>
                <div style={{ padding: "8px 0", color: "#3B82F6", fontSize: 10, fontWeight: 700, textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>⚡ Instant Reward</div>
                {fundedRows.map((row, i) => (
                  <>
                    <div key={`l${i}`} style={{ padding: "10px 0", color: "rgba(255,255,255,0.6)", fontSize: 13, borderBottom: i < fundedRows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{row.label}</div>
                    <div key={`v2${i}`} style={{ padding: "10px 0", color: row.v2 === "—" ? "rgba(255,255,255,0.2)" : "#FFFFFF", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < fundedRows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{row.v2}</div>
                    <div key={`v1${i}`} style={{ padding: "10px 0", color: row.v1 === "—" ? "rgba(255,255,255,0.2)" : "#FFFFFF", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < fundedRows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{row.v1}</div>
                    <div key={`vi${i}`} style={{ padding: "10px 0", color: row.vi === "—" ? "rgba(255,255,255,0.2)" : "#3B82F6", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: i < fundedRows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{row.vi}</div>
                  </>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Risk Philosophy Block */}
        <div style={{ marginBottom: 24, backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚖️</span>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginBottom: 10, letterSpacing: "-0.3px" }}>
                {L("Notre approche sur la gestion du risque","Nuestro enfoque sobre la gestión del riesgo","Our approach to risk management")}
              </h3>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                {L(
                  "Il n'existe pas de règle fixe sur la taille de vos positions. Nous surveillons activement l'activité de chaque trader et nous nous réservons le droit d'examiner tout compte présentant des signes de gestion du risque insuffisante ou non viable. Cet examen est mené au cas par cas.",
                  "No existe una regla fija sobre el tamaño de las posiciones. Monitoreamos activamente la actividad de cada trader y nos reservamos el derecho de revisar cualquier cuenta que muestre signos de gestión de riesgo insuficiente o insostenible. Cada revisión se realiza caso por caso.",
                  "There is no fixed rule on position sizing. We actively monitor every trader's activity and reserve the right to review any account showing signs of insufficient or unsustainable risk management. Each review is conducted on a case-by-case basis."
                )}
              </p>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.8, marginTop: 10 }}>
                {L(
                  "De manière générale, risquer systématiquement une part importante de la perte journalière maximale sur une seule idée de trading sera considéré comme non viable. Chez Traders Rewards, nous privilégions les traders qui font preuve de constance, de discipline et d'une vision à long terme. Traitez votre compte comme vous le feriez avec votre propre capital réel.",
                  "En general, arriesgar sistemáticamente una parte importante de la pérdida diaria máxima en una sola idea de trading será considerado insostenible. En Traders Rewards, buscamos traders que demuestren consistencia, disciplina y visión a largo plazo. Trata tu cuenta como tratarías tu propio capital real.",
                  "In general, consistently risking a significant portion of the maximum daily loss on a single trade idea will be considered unsustainable. At Traders Rewards, we look for traders who demonstrate consistency, discipline, and a long-term vision. Treat your account as you would your own real capital."
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Allowed / Not Allowed */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {groups.map((group, i) => (
            <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28 }}>
              <h3 style={{ fontSize: 10, fontWeight: 700, marginBottom: 20, color: i === 0 ? "#3B82F6" : "#ef4444", textTransform: "uppercase", letterSpacing: "2px" }}>{group.title}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {group.items.map((rule, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ color: i === 0 ? "#3B82F6" : "#ef4444", fontSize: 14, marginTop: 1, flexShrink: 0, fontWeight: 700 }}>{group.icon}</span>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.6 }}>{rule}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 48, borderRadius: 16, padding: "48px 40px", textAlign: "center", background: "#111111", border: "1px solid rgba(255,255,255,0.1)" }}>
          <h3 style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)", fontWeight: 800, color: "#FFFFFF", marginBottom: 12, letterSpacing: "-0.5px" }}>
            {T.rules.ctaTitle} <span style={{ color: "#3B82F6" }}>{T.rules.ctaGold}</span>
          </h3>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, marginBottom: 28 }}>{T.rules.ctaSub}</p>
          <a href="/#pricing" style={{ display: "inline-block", background: "#3B82F6", color: "#FFFFFF", padding: "14px 44px", borderRadius: 6, fontWeight: 800, fontSize: 12, letterSpacing: "2px", textTransform: "uppercase", textDecoration: "none", transition: "all 0.2s" }}
            onMouseOver={e => { e.currentTarget.style.background = "#b8923a"; }}
            onMouseOut={e => { e.currentTarget.style.background = "#3B82F6"; }}
          >{T.rules.ctaBtn}</a>
        </div>

      </div>
    </section>
  );
}
