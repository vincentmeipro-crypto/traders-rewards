"use client";

import { useLanguage } from "@/lib/LanguageContext";

const ACCENT = "#9CCFEA";

export default function RulesV1() {
  const { lang } = useLanguage();
  const L = (fr: string, es: string, en: string) => lang === "fr" ? fr : lang === "es" ? es : en;

  const cards = [
    {
      level: L("NIVEAU 01", "NIVEL 01", "LEVEL 01"),
      title: "CHALLENGE",
      subtitle: L("Validez votre Challenge", "Valide su Challenge", "Complete your Challenge"),
      rules: [
        L("Objectif unique : +6 %", "Objetivo único: +6 %", "Single target: +6%"),
        L("DD EOD : 1 000 $ / 2 000 $ / 3 000 $", "DD EOD: 1 000 $ / 2 000 $ / 3 000 $", "EOD DD: $1,000 / $2,000 / $3,000"),
        L("Consistance : 50 %", "Consistencia: 50 %", "Consistency: 50%"),
        L("2 jours minimum · 30 jours maximum", "2 días mínimo · 30 días máximo", "2 days minimum · 30 days maximum"),
      ],
    },
    {
      level: L("NIVEAU 02", "NIVEL 02", "LEVEL 02"),
      title: "COMPTE REWARD",
      subtitle: L("Débloquez votre première récompense", "Desbloquee su primera recompensa", "Unlock your first reward"),
      rules: [
        L("5 jours qualifiants au seuil du compte", "5 días calificados al umbral de la cuenta", "5 qualifying days at the account threshold"),
        L("DD EOD jusqu’au plancher de sécurité", "DD EOD hasta el suelo de seguridad", "EOD DD until the safety floor"),
        L("Au plancher, le DD devient fixe", "Al llegar al suelo, el DD queda fijo", "At the floor, DD becomes fixed"),
        L("Consistance 50 % · Temps illimité", "Consistencia 50 % · Tiempo ilimitado", "50% consistency · Unlimited time"),
      ],
    },
    {
      level: L("NIVEAU 03", "NIVEL 03", "LEVEL 03"),
      title: "TRADER REWARD",
      subtitle: L("Progressez jusqu’au Payout #5", "Progrese hasta el Payout #5", "Progress to Payout #5"),
      rules: [
        L("DD fixe dès le départ", "DD fijo desde el inicio", "Fixed DD from the start"),
        L("Le plancher de sécurité ne remonte plus", "El suelo de seguridad ya no sube", "The safety floor no longer rises"),
        L("Consistance : 50 %", "Consistencia: 50 %", "Consistency: 50%"),
        L("Reward payé automatiquement sous 48 h", "Reward pagado automáticamente en 48 h", "Reward paid automatically within 48h"),
      ],
    },
  ];

  return (
    <section id="rules" style={{ scrollMarginTop: 92, padding: "clamp(72px, 8vw, 112px) 24px", background: "#050709" }}>
      <div style={{ maxWidth: 1500, margin: "0 auto" }}>
        <header style={{ maxWidth: 900, marginBottom: "clamp(38px, 5vw, 62px)" }}>
          <div style={{ color: ACCENT, fontSize: 11, fontWeight: 900, letterSpacing: "2.4px", marginBottom: 14 }}>{L("LES RÈGLES", "LAS REGLAS", "THE RULES")}</div>
          <h2 style={{ color: "#fff", fontSize: "clamp(2.25rem, 4.2vw, 4.6rem)", lineHeight: .98, letterSpacing: "-.045em", margin: 0, fontWeight: 900 }}>
            {L("Trois niveaux. Des règles sans ambiguïté.", "Tres niveles. Reglas sin ambigüedad.", "Three levels. No ambiguous rules.")}
          </h2>
          <p style={{ color: "rgba(255,255,255,.58)", fontSize: "clamp(1rem, 1.25vw, 1.22rem)", lineHeight: 1.55, margin: "22px 0 0" }}>
            {L("Le drawdown évolue avec votre parcours : EOD pendant le Challenge, EOD jusqu’au plancher sur le Compte Reward, puis fixe sur le Trader Reward.", "El drawdown evoluciona con su recorrido: EOD durante el Challenge, EOD hasta el suelo en la Cuenta Reward y después fijo.", "Drawdown evolves with your journey: EOD during the Challenge, EOD until the floor on the Reward Account, then fixed.")}
          </p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 310px), 1fr))", gap: 18 }}>
          {cards.map((card, index) => (
            <article key={card.title} style={{ minHeight: 370, padding: "clamp(26px, 3vw, 38px)", borderRadius: 22, background: index === 1 ? "linear-gradient(145deg, #101820, #090c0f)" : "#0b0e11", border: `1px solid ${index === 1 ? "rgba(156,207,234,.48)" : "rgba(255,255,255,.12)"}`, boxShadow: index === 1 ? "0 18px 60px rgba(73,150,196,.11)" : "none" }}>
              <div style={{ color: ACCENT, fontSize: 10, fontWeight: 900, letterSpacing: "2.2px" }}>{card.level}</div>
              <h3 style={{ color: "#fff", fontSize: "clamp(1.55rem, 2.2vw, 2.35rem)", margin: "14px 0 7px", fontWeight: 900 }}>{card.title}</h3>
              <p style={{ color: "rgba(255,255,255,.52)", fontSize: 14, margin: "0 0 30px" }}>{card.subtitle}</p>
              <div style={{ height: 1, background: "rgba(255,255,255,.1)", marginBottom: 10 }} />
              {card.rules.map(rule => (
                <div key={rule} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10, alignItems: "start", padding: "12px 0", color: "rgba(255,255,255,.86)", fontSize: 15, lineHeight: 1.4 }}>
                  <span style={{ color: ACCENT, fontWeight: 900 }}>✓</span><span>{rule}</span>
                </div>
              ))}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
