"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import styles from "./PricingRuleEducation.module.css";

export type PricingRuleKey =
  | "profitTarget"
  | "phaseTwoTarget"
  | "dailyLoss"
  | "totalLoss"
  | "bestDay"
  | "minimumDays"
  | "timeLimit"
  | "profitSplit"
  | "maxAllocation";

type Props = {
  active: { key: PricingRuleKey; value: string } | null;
  model: "1step" | "2step";
  lang: string;
  onDismiss: () => void;
};

type Copy = {
  eyebrow: string;
  title: string;
  short: string;
  detail: string;
  callout: string;
  visual: "up" | "down" | "shield" | "bars" | "days" | "infinity" | "split" | "stack";
  tone: "blue" | "green" | "red";
};

function Visual({ type, value, tone }: { type: Copy["visual"]; value: string; tone: Copy["tone"] }) {
  const accent = tone === "red" ? "#ff5364" : tone === "green" ? "#47dc88" : "#9CCFEA";
  const glow = tone === "red" ? "rgba(255,83,100,.34)" : tone === "green" ? "rgba(71,220,136,.3)" : "rgba(156,207,234,.34)";
  const numericValue = Math.max(0, Math.min(100, Number.parseFloat(value) || 0));

  if (type === "infinity") {
    return <div className={styles.infinityVisual}><span>∞</span><strong>{value}</strong></div>;
  }

  if (type === "split") {
    return (
      <div className={styles.splitVisual}>
        <div className={styles.donut} style={{ "--split-accent": accent, "--split-value": `${numericValue}%` } as React.CSSProperties}><strong>{value}</strong></div>
        <div><span>TRADER</span><strong>{value} des profits</strong><small>Votre discipline est récompensée.</small></div>
      </div>
    );
  }

  if (type === "stack") {
    return (
      <div className={styles.stackVisual}>
        <div className={styles.stackCard}>10K</div><div className={styles.stackCard}>50K</div><div className={styles.stackCard}>200K</div>
        <strong>{value}</strong>
      </div>
    );
  }

  if (type === "days") {
    return (
      <div className={styles.daysVisual}>
        {[1, 2, 3, 4, 5].map(day => <span key={day}><i>0{day}</i><b /></span>)}
        <strong>{value}</strong>
      </div>
    );
  }

  if (type === "bars") {
    return (
      <div className={styles.barsVisual}>
        {[42, 68, 50, 83, 61].map((height, index) => <i key={index} style={{ height: `${height * 1.75}px`, background: index === 3 ? accent : "rgba(255,255,255,.12)" }} />)}
        <span style={{ borderColor: accent, color: accent }}>≤ {value}</span>
      </div>
    );
  }

  if (type === "shield") {
    return (
      <div className={styles.shieldVisual}>
        <svg viewBox="0 0 260 170" aria-hidden="true">
          <defs><filter id="shieldGlow"><feGaussianBlur stdDeviation="7" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <path d="M130 18 211 46v48c0 43-30 68-81 83-51-15-81-40-81-83V46z" fill="none" stroke={accent} strokeWidth="4" filter="url(#shieldGlow)" />
          <path d="M80 107h100" stroke="rgba(255,255,255,.22)" strokeDasharray="7 8" />
          <text x="130" y="96" textAnchor="middle" fill="#fff" fontSize="30" fontWeight="800">{value}</text>
          <text x="130" y="124" textAnchor="middle" fill="rgba(255,255,255,.45)" fontSize="12" letterSpacing="2">CAPITAL PROTÉGÉ</text>
        </svg>
      </div>
    );
  }

  const falling = type === "down";
  const points = falling ? "16,45 76,75 112,55 165,105 220,88 284,132" : "16,132 72,96 110,116 166,68 210,91 284,38";
  const arrow = falling ? "276,119 294,137 271,140" : "271,30 295,30 288,53";
  return (
    <div className={styles.chartVisual} style={{ "--chart-accent": accent, "--chart-glow": glow } as React.CSSProperties}>
      <svg viewBox="0 0 310 170" role="img" aria-label={falling ? "Courbe de perte et limite" : "Courbe de progression vers l'objectif"}>
        {[32, 82, 132].map(y => <line key={y} x1="12" x2="298" y1={y} y2={y} stroke="rgba(255,255,255,.12)" strokeDasharray={y === 82 ? "0" : "6 8"} />)}
        <polyline points={points} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points={arrow} fill={accent} />
        <g transform={falling ? "translate(210 118)" : "translate(208 23)"}>
          <rect width="82" height="42" rx="10" fill={glow} stroke={accent} />
          <text x="41" y="28" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">{value}</text>
        </g>
      </svg>
    </div>
  );
}

function getCopy(key: PricingRuleKey, model: Props["model"], lang: string): Copy {
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const tr = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
  const daily = model === "1step" ? "3%" : "5%";
  const split = model === "1step" ? "90%" : "80%";

  const copies: Record<PricingRuleKey, Copy> = {
    profitTarget: {
      eyebrow: tr("Progression", "Progresión", "Progress"), title: tr("Objectif de profit", "Objetivo de beneficio", "Profit target"),
      short: tr("Le niveau de performance à atteindre pour valider cette étape.", "El nivel de rendimiento necesario para validar esta etapa.", "The performance level required to complete this stage."),
      detail: tr("L’objectif est calculé à partir du capital initial. Seuls les résultats des positions clôturées valident la progression. Lorsque l’objectif et le nombre minimum de jours sont atteints, toutes les positions doivent être fermées pour passer à l’étape suivante.", "El objetivo se calcula sobre el capital inicial. Solo las posiciones cerradas validan el progreso. Cuando se alcanzan el objetivo y los días mínimos, todas las posiciones deben estar cerradas.", "The target is calculated from the initial capital. Only closed positions validate progress. Once the target and minimum days are complete, all positions must be closed to advance."),
      callout: tr("Capital initial × objectif = profit requis", "Capital inicial × objetivo = beneficio requerido", "Initial capital × target = required profit"), visual: "up", tone: "green",
    },
    phaseTwoTarget: {
      eyebrow: tr("Confirmation", "Confirmación", "Confirmation"), title: tr("Objectif de la Phase 2", "Objetivo de la Fase 2", "Phase 2 target"),
      short: tr("Une seconde validation, avec un objectif réduit à 5%.", "Una segunda validación con un objetivo reducido al 5%.", "A second validation with a reduced 5% target."),
      detail: tr("La Phase 2 confirme que la performance de la première étape est reproductible. Les règles de perte restent actives et l’objectif est ramené à 5% du capital initial du nouveau compte de Phase 2.", "La Fase 2 confirma que el rendimiento es reproducible. Las reglas de pérdida siguen activas y el objetivo baja al 5%.", "Phase 2 confirms that the first-stage performance is repeatable. Loss rules remain active and the target is reduced to 5% of the new Phase 2 account's initial capital."),
      callout: tr("Même discipline, objectif de confirmation à 5%", "Misma disciplina, objetivo de confirmación del 5%", "Same discipline, 5% confirmation target"), visual: "up", tone: "blue",
    },
    dailyLoss: {
      eyebrow: tr("Protection quotidienne", "Protección diaria", "Daily protection"), title: tr("Perte journalière maximale", "Pérdida diaria máxima", "Maximum daily loss"),
      short: tr(`Votre equity ne doit jamais atteindre le plancher journalier de ${daily}.`, `Su equity nunca debe alcanzar el límite diario del ${daily}.`, `Your equity must never reach the ${daily} daily floor.`),
      detail: tr("La référence quotidienne est enregistrée au début de la journée de trading. Les pertes clôturées et le résultat flottant des positions ouvertes sont pris en compte en temps réel. Toucher le plancher, même brièvement, entraîne l’arrêt du challenge.", "La referencia diaria se registra al inicio del día de trading. Se tienen en cuenta en tiempo real las pérdidas cerradas y el resultado flotante. Tocar el límite detiene el challenge.", "The daily reference is recorded at the start of the trading day. Closed losses and floating P&L are monitored in real time. Touching the floor, even briefly, ends the challenge."),
      callout: tr("Equity = solde + résultat flottant", "Equity = saldo + resultado flotante", "Equity = balance + floating P&L"), visual: "down", tone: "red",
    },
    totalLoss: {
      eyebrow: tr("Protection du capital", "Protección del capital", "Capital protection"), title: tr("Perte totale maximale", "Pérdida total máxima", "Maximum total loss"),
      short: tr("La limite absolue qui protège le capital du compte.", "El límite absoluto que protege el capital de la cuenta.", "The absolute limit protecting the account capital."),
      detail: tr("Cette limite encadre la perte cumulée du compte pendant toute sa durée. L’equity est surveillée avec les positions ouvertes : le seuil ne doit jamais être touché ou franchi. Le niveau applicable est visible en permanence dans votre dashboard.", "Este límite controla la pérdida acumulada durante toda la cuenta. La equity se supervisa con las posiciones abiertas y nunca debe tocar el umbral.", "This rule caps the account's cumulative loss for its entire lifetime. Equity is monitored with open positions and must never touch or cross the applicable floor shown in your dashboard."),
      callout: tr("Surveillance continue de l’equity, positions ouvertes incluses", "Supervisión continua de la equity, incluidas posiciones abiertas", "Continuous equity monitoring, including open positions"), visual: "shield", tone: "red",
    },
    bestDay: {
      eyebrow: tr("Régularité", "Regularidad", "Consistency"), title: tr("Règle du meilleur jour", "Regla del mejor día", "Best day rule"),
      short: tr("Votre meilleure journée ne peut représenter plus de 50% du profit de validation.", "Su mejor día no puede representar más del 50% del beneficio de validación.", "Your best day cannot represent more than 50% of the validation profit."),
      detail: tr("Cette règle valorise une performance régulière plutôt qu’un gain isolé. Elle ne fait pas échouer le compte : si votre meilleure journée pèse trop lourd, l’objectif de profit augmente automatiquement jusqu’à ce que le ratio redevienne conforme.", "Esta regla premia la regularidad. No hace fallar la cuenta: si el mejor día pesa demasiado, el objetivo aumenta automáticamente.", "This rule rewards consistency rather than one exceptional result. It does not fail the account: if the best day weighs too heavily, the profit target automatically increases until the ratio is compliant."),
      callout: tr("Profit total requis ≥ 2 × meilleure journée", "Beneficio total requerido ≥ 2 × mejor día", "Required total profit ≥ 2 × best day"), visual: "bars", tone: "blue",
    },
    minimumDays: {
      eyebrow: tr("Discipline", "Disciplina", "Discipline"), title: tr("Jours minimum de trading", "Días mínimos de trading", "Minimum trading days"),
      short: tr("Au moins cinq journées avec une activité de trading réelle.", "Al menos cinco días con actividad real de trading.", "At least five days with genuine trading activity."),
      detail: tr("Une journée est comptabilisée lorsqu’une activité de trading est détectée pendant la journée broker. Cette condition évite qu’une performance très courte suffise à valider le challenge et permet d’observer votre gestion du risque dans le temps.", "Un día cuenta cuando se detecta actividad durante el día del broker. Esta condición permite evaluar la gestión del riesgo a lo largo del tiempo.", "A day counts when trading activity is detected during the broker day. This prevents an ultra-short performance from validating the challenge and lets risk management be observed over time."),
      callout: tr("5 journées distinctes minimum", "Mínimo 5 días distintos", "Minimum 5 distinct trading days"), visual: "days", tone: "blue",
    },
    timeLimit: {
      eyebrow: tr("À votre rythme", "A su ritmo", "At your pace"), title: tr("Aucune limite de temps", "Sin límite de tiempo", "No time limit"),
      short: tr("Aucune course contre la montre : privilégiez la qualité.", "Sin carrera contra el reloj: priorice la calidad.", "No race against the clock: prioritize quality."),
      detail: tr("Votre challenge n’expire pas tant que vous respectez les règles et les conditions d’activité applicables. Prenez le temps de sélectionner vos opportunités plutôt que de forcer des positions pour atteindre rapidement l’objectif.", "Su challenge no caduca mientras respete las reglas. Tómese el tiempo de seleccionar buenas oportunidades.", "Your challenge does not expire while you comply with the applicable rules. Take time to select quality opportunities instead of forcing trades to reach the target quickly."),
      callout: tr("La patience fait partie de la performance", "La paciencia forma parte del rendimiento", "Patience is part of performance"), visual: "infinity", tone: "blue",
    },
    profitSplit: {
      eyebrow: tr("Compte Reward", "Cuenta Reward", "Reward account"), title: tr("Partage des profits", "Reparto de beneficios", "Profit split"),
      short: tr(`Vous recevez ${split} des profits éligibles sur votre compte Reward.`, `Recibe el ${split} de los beneficios elegibles en su cuenta Reward.`, `You receive ${split} of eligible profits on your Reward account.`),
      detail: tr("Après avoir réussi le processus d’évaluation, vous accédez au compte Reward correspondant. Les profits éligibles sont partagés selon votre modèle de challenge, sous réserve du respect des règles et de la validation de votre demande.", "Tras completar la evaluación, accede a la cuenta Reward. Los beneficios elegibles se reparten según el modelo elegido.", "After completing the evaluation, you access the matching Reward account. Eligible profits are shared according to your challenge model, subject to the rules and reward-request validation."),
      callout: tr(`${split} pour vous · traitement sous 24 à 48h`, `${split} para usted · procesamiento en 24–48 h`, `${split} for you · processed within 24–48h`), visual: "split", tone: "green",
    },
    maxAllocation: {
      eyebrow: tr("Évolution", "Evolución", "Growth"), title: tr("Allocation maximale cumulée", "Asignación máxima acumulada", "Maximum combined allocation"),
      short: tr("Gérez jusqu’à 200K de capital simulé cumulé.", "Gestione hasta 200K de capital simulado combinado.", "Manage up to 200K in combined simulated capital."),
      detail: tr("Vous pouvez détenir plusieurs comptes dans la limite de l’allocation maximale autorisée. Cette limite porte sur la somme des capitaux simulés actifs et permet une progression structurée.", "Puede tener varias cuentas dentro de la asignación máxima autorizada.", "You may hold multiple accounts within the maximum allowed combined allocation. The limit applies to the sum of active simulated capital."),
      callout: tr("Somme des comptes actifs ≤ 200K", "Suma de cuentas activas ≤ 200K", "Active accounts combined ≤ 200K"), visual: "stack", tone: "blue",
    },
  };
  return copies[key];
}

export default function PricingRuleEducation({ active, model, lang, onDismiss }: Props) {
  const [expanded, setExpanded] = useState(false);
  const copy = active ? getCopy(active.key, model, lang) : null;
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const t = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  useEffect(() => { setExpanded(false); }, [active?.key, model]);
  useEffect(() => {
    if (!expanded) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = before; window.removeEventListener("keydown", close); };
  }, [expanded]);

  if (!active || !copy) return null;

  return (
    <>
      <aside className={styles.preview} aria-live="polite">
        <button className={styles.previewClose} onClick={onDismiss} aria-label={t("Fermer", "Cerrar", "Close")}><X size={15} /></button>
        <span className={styles.eyebrow}>{copy.eyebrow}</span>
        <div className={styles.previewTitle}><strong>{copy.title}</strong><span>{active.value}</span></div>
        <p>{copy.short}</p>
        <button className={styles.moreButton} onClick={() => setExpanded(true)}>{t("Comprendre la règle", "Entender la regla", "Understand the rule")}<ArrowUpRight size={16} /></button>
      </aside>

      {expanded && (
        <div className={styles.overlay} role="presentation" onMouseDown={event => event.target === event.currentTarget && setExpanded(false)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="pricing-rule-title">
            <button className={styles.modalClose} onClick={() => setExpanded(false)} aria-label={t("Fermer", "Cerrar", "Close")}><X size={20} /></button>
            <header><span>{copy.eyebrow}</span><h3 id="pricing-rule-title">{copy.title}</h3><p>{copy.short}</p></header>
            <Visual type={copy.visual} value={active.value} tone={copy.tone} />
            <div className={styles.modalCopy}><p>{copy.detail}</p><div className={styles.callout}><i /><span>{copy.callout}</span></div></div>
            <button className={styles.understood} onClick={() => setExpanded(false)}>{t("J’ai compris", "Entendido", "Got it")}</button>
          </section>
        </div>
      )}
    </>
  );
}
