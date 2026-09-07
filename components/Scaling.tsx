"use client";
import { useLanguage } from "@/lib/LanguageContext";

// Fixed round-number ladder from $200K to $1M
const SCALE_LADDER = [200000, 250000, 300000, 400000, 500000, 600000, 750000, 1000000];

function fmt(n: number) {
  if (n >= 1000000) return "$1,000,000";
  if (n >= 1000) return "$" + (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K";
  return "$" + n;
}

function getSteps(start: number) {
  const startIdx = SCALE_LADDER.indexOf(start);
  const steps: { size: number; daily: number; total: number; target: number; next: number }[] = [];
  for (let i = startIdx; i < SCALE_LADDER.length; i++) {
    const cur = SCALE_LADDER[i];
    const next = i < SCALE_LADDER.length - 1 ? SCALE_LADDER[i + 1] : 1_000_000;
    steps.push({
      size: cur,
      daily: Math.round(cur * 0.05),
      total: Math.round(cur * 0.10),
      target: Math.round(cur * 0.10),
      next,
    });
  }
  return steps;
}

export default function Scaling() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const S = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  const steps = getSteps(200000);

  const labels = {
    badge:   S("PROGRAMME D'ÉLÉVATION", "PROGRAMA DE ELEVACIÓN", "ELEVATION PROGRAM"),
    title:   S("Progressez jusqu'à", "Progresa hasta", "Grow Your Account Up to"),
    gold:    "$1,000,000",
    sub:     S(
      "Chaque trimestre de performance, votre capital funded évolue vers le palier suivant. Atteignez le million sans changer de stratégie.",
      "Cada trimestre de rendimiento, tu capital funded avanza al siguiente nivel. Alcanza el millón sin cambiar de estrategia.",
      "Every performance quarter, your funded account moves to the next level. Reach seven figures without changing your strategy.",
    ),
    session: "Session",
    balance: S("Solde du compte", "Saldo de la cuenta", "Account Balance"),
    daily:   S("Perte journalière max", "Pérdida diaria máx.", "Max Daily Loss"),
    totalL:  S("Perte totale max", "Pérdida total máx.", "Max Total Loss"),
    scaleAt: S("Objectif d'élévation", "Objetivo de elevación", "Elevation Target"),
    nextBal: S("Prochain palier", "Siguiente nivel", "Next Level"),
    cap:     S("Plafond atteint", "Techo alcanzado", "Cap Reached"),
    condTitle: S("Conditions pour évoluer", "Condiciones para avanzar", "Conditions to Level Up"),
    conds: isFr ? [
      "Réaliser au moins 10% de profit sur le solde du compte funded",
      "Sur une session trimestrielle (3 mois)",
      "Avoir reçu au moins 2 récompenses pendant la session",
      "Aucune violation des règles de trading",
      "Solde du compte positif en permanence",
      "Traders Rewards se réserve le droit de restreindre l'accès au programme d'Élévation à l'issue d'une étude approfondie du profil et de l'historique de trading du trader",
    ] : isEs ? [
      "Lograr al menos un 10% de beneficio sobre el saldo de la cuenta funded",
      "Durante una sesión trimestral (3 meses)",
      "Haber recibido al menos 2 recompensas durante la sesión",
      "Ninguna violación de las reglas de trading",
      "Saldo de cuenta positivo en todo momento",
      "Traders Rewards se reserva el derecho de restringir el acceso al programa de Elevación tras un análisis exhaustivo del perfil e historial de trading del trader",
    ] : [
      "Achieve at least 10% profit on your funded account balance",
      "Over a quarterly session (3 months)",
      "Have received at least 2 rewards during the session",
      "Zero trading rule violations",
      "Positive account balance maintained throughout",
      "Traders Rewards reserves the right to restrict access to the Elevation program following a thorough review of the trader's profile and trading history",
    ],
    note: S(
      "L'élévation est automatiquement appliquée dès que toutes les conditions sont validées. Votre stratégie, vos règles et votre partage des profits restent inchangés.",
      "La elevación se aplica automáticamente una vez validadas todas las condiciones. Tu estrategia, reglas y reparto de beneficios no cambian.",
      "Elevation is automatically applied once all conditions are met. Your strategy, rules, and profit split remain unchanged.",
    ),
    profitNote: S(
      "Le compteur de profit est cumulatif sur les 3 mois. Si vous faites un retrait en cours de session, votre capital de base revient à son niveau initial — mais le profit déjà généré reste comptabilisé. Exemple : vous atteignez +5%, retirez, puis faites encore +5% → total cumulé = 10% → élévation déclenchée.",
      "El contador de beneficio es acumulativo durante los 3 meses. Si realizas un retiro durante la sesión, tu capital base vuelve a su nivel inicial — pero el beneficio ya generado sigue contabilizándose. Ejemplo: alcanzas +5%, retiras, luego generas otro +5% → total acumulado = 10% → elevación activada.",
      "The profit counter is cumulative over 3 months. If you withdraw during the session, your base capital returns to its initial level — but the profit already generated still counts. Example: you reach +5%, withdraw, then generate another +5% → cumulative total = 10% → elevation triggered.",
    ),
  };

  return (
    <section id="elevation" style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span style={{ color: "#00C2FF", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 16 }}>
            {labels.badge}
          </span>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-1px", marginBottom: 16 }}>
            {labels.title} <span className="gold-gradient">{labels.gold}</span>
          </h2>
          <p style={{ color: "#555", fontSize: 16, maxWidth: 600, margin: "0 auto" }}>{labels.sub}</p>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 32 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "#1a1a24", borderBottom: "1px solid #2A2A38" }}>
                  {[labels.session, labels.balance, labels.daily, labels.totalL, labels.scaleAt, labels.nextBal].map((h, i) => (
                    <th key={i} style={{ padding: "14px 16px", color: "#00C2FF", fontWeight: 700, textAlign: i === 0 ? "center" : "right", letterSpacing: "0.5px", textTransform: "uppercase", fontSize: 11, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {steps.map((row, i) => {
                  const isCap = row.size === 1_000_000;
                  return (
                    <tr key={i} style={{ borderBottom: i < steps.length - 1 ? "1px solid #111" : "none", backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                      <td style={{ padding: "13px 16px", textAlign: "center", color: "#555", fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: "13px 16px", textAlign: "right", color: "#fff", fontWeight: 800 }}>{fmt(row.size)}</td>
                      <td style={{ padding: "13px 16px", textAlign: "right", color: "#ef4444", fontWeight: 600 }}>{fmt(row.daily)}</td>
                      <td style={{ padding: "13px 16px", textAlign: "right", color: "#ef4444", fontWeight: 600 }}>{fmt(row.total)}</td>
                      <td style={{ padding: "13px 16px", textAlign: "right", color: "#1565C0", fontWeight: 700 }}>+{fmt(row.target).replace("$", "")} <span style={{ color: "#555", fontSize: 11 }}>(+10%)</span></td>
                      <td style={{ padding: "13px 16px", textAlign: "right" }}>
                        {isCap ? (
                          <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#60A5FA", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(201,168,76,0.3)" }}>
                            {labels.cap} 🏆
                          </span>
                        ) : (
                          <span style={{ color: "#00C2FF", fontWeight: 800 }}>{fmt(row.next)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Profit note */}
        <div style={{ marginBottom: 24, backgroundColor: "rgba(21,101,192,0.06)", border: "1px solid rgba(21,101,192,0.2)", borderRadius: 16, padding: "20px 28px", display: "flex", gap: 16, alignItems: "flex-start" }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.8, margin: 0 }}>
            <span style={{ color: "#1565C0", fontWeight: 700 }}>{S("Profit cumulatif", "Beneficio acumulativo", "Cumulative profit")} — </span>
            {labels.profitNote}
          </p>
        </div>

        {/* Conditions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>

          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#00C2FF", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 20 }}>
              {labels.condTitle}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {labels.conds.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ color: "#1565C0", fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ color: "#888", fontSize: 14, lineHeight: 1.5 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ backgroundColor: "rgba(45,125,210,0.06)", border: "1px solid rgba(45,125,210,0.2)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📈</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.3px" }}>
              $200K → $1,000,000
            </h3>
            <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7 }}>{labels.note}</p>
            <div style={{ marginTop: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#00C2FF", fontSize: 22, fontWeight: 900 }}>{steps.length}</div>
                <div style={{ color: "#444", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{"Sessions"}</div>
              </div>
              <div>
                <div style={{ color: "#1565C0", fontSize: 22, fontWeight: 900 }}>3 {S("mois", "meses", "months")}</div>
                <div style={{ color: "#444", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{S("Par session", "Por sesión", "Per session")}</div>
              </div>
              <div>
                <div style={{ color: "#60A5FA", fontSize: 22, fontWeight: 900 }}>$1M</div>
                <div style={{ color: "#444", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{S("Plafond", "Techo", "Cap")}</div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
