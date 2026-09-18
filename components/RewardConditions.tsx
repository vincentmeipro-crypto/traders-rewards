"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { REWARD_AMOUNTS, QUAL_DAY_USD } from "@/lib/rewardsData";
import styles from "./RewardConditions.module.css";

export default function RewardConditions({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { lang } = useLanguage();
  const L = (fr: string, es: string, en: string) => lang === "fr" ? fr : lang === "es" ? es : en;
  const money = (amount: number) => new Intl.NumberFormat(lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  const gross = REWARD_AMOUNTS[1][0];
  const net = gross * .9;
  const after = 51250 - net;

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="reward-conditions-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div><p className={styles.eyebrow}>{L("LES RÉCOMPENSES", "LAS RECOMPENSAS", "REWARDS")}</p><h2 id="reward-conditions-title">{L("Comment ça fonctionne ?", "¿Cómo funciona?", "How does it work?")}</h2></div>
          <button autoFocus type="button" onClick={onClose} aria-label={L("Fermer", "Cerrar", "Close")}>×</button>
        </header>
        <p>{L("Les montants du tableau sont des plafonds bruts, avant le partage : vous recevez 90 % du montant approuvé.", "Los importes de la tabla son límites brutos, antes del reparto: recibes el 90 % del importe aprobado.", "Table amounts are gross caps before the split: you receive 90% of the approved amount.")}</p>
        <ul className={styles.essentials}>
          <li><strong>{L("100 $ minimum", "Mínimo 100 $", "$100 minimum")}</strong><span>{L("par demande, avant partage (90 $ après partage).", "por solicitud, antes del reparto (90 $ después).", "per request, before the split ($90 after the split).")}</span></li>
          <li><strong>{L("5 jours qualifiants", "5 días calificados", "5 qualifying days")}</strong><span>{L("à réaliser pour chaque récompense.", "para cada recompensa.", "required for each reward.")}</span></li>
          <li><strong>{L("Consistance ≤ 50 %", "Consistencia ≤ 50 %", "Consistency ≤ 50%")}</strong><span>{L("votre meilleure journée ne doit pas dépasser la moitié du profit total du cycle.", "tu mejor día no debe superar la mitad del beneficio total del ciclo.", "your best day must not exceed half of the cycle’s total profit.")}</span></li>
          <li><strong>{L("Jusqu’à 5 paiements", "Hasta 5 pagos", "Up to 5 payments")}</strong><span>{L("le parcours du compte se termine après le cinquième.", "el recorrido de la cuenta termina tras el quinto.", "the account journey ends after the fifth.")}</span></li>
        </ul>
        <p className={styles.note}>{L("La demande reste soumise à un compte actif, à l’identité vérifiée, aux règles de trading et au montant disponible. Une seule demande peut être en cours par compte.", "La solicitud requiere una cuenta activa, identidad verificada, cumplimiento de las reglas y saldo disponible. Solo puede haber una solicitud pendiente por cuenta.", "Requests require an active account, verified identity, compliance with trading rules and an available amount. Only one request may be pending per account.")}</p>
        <section className={styles.example} aria-labelledby="reward-example-title">
          <h3 id="reward-example-title">{L("Exemple : première récompense sur un compte 50K", "Ejemplo: primera recompensa en una cuenta 50K", "Example: first reward on a 50K account")}</h3>
          <p>{L("Après 5 journées à +250 $, sans autre gain ni perte et sans position ouverte, le solde est de 51 250 $. Les autres conditions sont remplies.", "Tras 5 días de +250 $, sin otras ganancias, pérdidas ni posiciones abiertas, el saldo es de 51 250 $. Se cumplen las demás condiciones.", "After 5 days of +$250, with no other gains, losses or open positions, the balance is $51,250. All other conditions are met.")}</p>
          <dl>
            {[
              [L("Demande brute (plafond du niveau 1)", "Solicitud bruta (límite del nivel 1)", "Gross request (level 1 cap)"), money(gross)],
              [L("Votre part : 90 %", "Tu parte: 90 %", "Your share: 90%"), money(net)],
              [L("Solde après déduction du paiement", "Saldo tras deducir el pago", "Balance after payment deduction"), money(after)],
              [L("Marge au-dessus du plancher de 50 000 $", "Margen sobre el piso de 50 000 $", "Buffer above the $50,000 floor"), money(after - 50000)],
            ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <p className={styles.note}>{L("Montants exprimés en USD, avant une éventuelle conversion de devise.", "Importes en USD, antes de una posible conversión de divisa.", "Amounts in USD, before any currency conversion.")}</p>
        </section>
        <div className={styles.details}>
          <details><summary>{L("Qu’est-ce qu’une journée qualifiante ?", "¿Qué es un día calificado?", "What is a qualifying day?")}</summary>
            <p>{L("Une journée dont le profit atteint au moins le seuil de votre compte :", "Un día cuyo beneficio alcanza al menos el umbral de tu cuenta:", "A day whose profit reaches at least your account’s threshold:")}</p>
            <div className={styles.thresholds}>{["25K", "50K", "100K"].map((size, index) => <div key={size}><strong>{size}</strong><span>{money(QUAL_DAY_USD[index])}</span></div>)}</div>
            <p>{L("La consistance se calcule sur tout le cycle, pertes comprises. Exemple : pour 1 000 $ de profit total, la meilleure journée ne doit pas dépasser 500 $. Après chaque paiement, un nouveau cycle de 5 jours qualifiants commence.", "La consistencia se calcula sobre todo el ciclo, incluidas las pérdidas. Con 1 000 $ de beneficio total, el mejor día no debe superar 500 $. Cada pago inicia un nuevo ciclo de 5 días calificados.", "Consistency uses the whole cycle, including losses. With $1,000 total profit, the best day must not exceed $500. Each payment starts a new 5-qualifying-day cycle.")}</p>
          </details>
          <details><summary>{L("Combien puis-je demander ?", "¿Cuánto puedo solicitar?", "How much can I request?")}</summary>
            <p>{L("Le maximum est le plus petit de ces deux montants : le plafond de votre niveau ou le montant disponible au-dessus du capital initial. Le disponible utilise le plus bas entre le solde et la valeur du compte incluant les positions ouvertes.", "El máximo es el menor entre el límite de tu nivel y el importe disponible por encima del capital inicial. Se usa el menor entre el saldo y el valor de la cuenta incluidas las posiciones abiertas.", "The maximum is the lower of your level’s cap and the amount available above the initial balance. Availability uses the lower of balance and equity, including open positions.")}</p>
            <p>{L("Sur un compte 50K au niveau 1 : 320 $ disponibles permettent de demander au maximum 320 $ ; 700 $ disponibles permettent de demander au maximum 500 $. Vous recevez ensuite 90 % du montant approuvé.", "En una cuenta 50K de nivel 1: con 320 $ disponibles puedes solicitar hasta 320 $; con 700 $, hasta 500 $. Recibes el 90 % del importe aprobado.", "For a 50K level 1 account: $320 available allows a request of up to $320; $700 available allows up to $500. You then receive 90% of the approved amount.")}</p>
          </details>
          <details><summary>{L("Si je retire moins que le plafond ?", "¿Y si retiro menos que el límite?", "What if I request less than the cap?")}</summary>
            <p>{L("Même un paiement partiel compte comme une récompense. Une fois payé, vous passez au niveau suivant : le plafond non utilisé ne s’ajoute pas au plafond suivant. Les fonds non déduits restent sur le compte, mais 5 nouveaux jours qualifiants sont nécessaires.", "Un pago parcial también cuenta como una recompensa. Tras el pago pasas al siguiente nivel: el límite no utilizado no se añade al siguiente. Los fondos no deducidos siguen en la cuenta, pero se requieren 5 nuevos días calificados.", "A partial payment still counts as one reward. Once paid, you move to the next level: unused cap does not increase the next cap. Funds not deducted remain in the account, but 5 new qualifying days are required.")}</p>
            <p>{L("Exemple 50K : après une première demande de 100 $ (90 $ versés), le plafond brut du niveau 2 est de", "Ejemplo 50K: tras una primera solicitud de 100 $ (90 $ pagados), el límite bruto del nivel 2 es", "50K example: after a first request of $100 ($90 paid), the level 2 gross cap is")} <strong>{money(REWARD_AMOUNTS[1][1])}</strong>.</p>
          </details>
          <details><summary>{L("Que devient mon plancher de perte ?", "¿Qué ocurre con mi piso de pérdida?", "What happens to my loss floor?")}</summary>
            <p>{L("Le plancher est la limite sous laquelle la valeur de votre compte ne doit pas descendre. Avant le premier paiement, il suit les plus hauts de fin de journée, puis se fixe au capital initial dès qu’il l’atteint. Le premier paiement le fixe également à ce capital, même si ce seuil n’avait pas encore été atteint.", "El piso es el límite por debajo del cual no debe caer el valor de tu cuenta. Antes del primer pago sigue los máximos al cierre del día y se fija en el capital inicial al alcanzarlo. El primer pago también lo fija en ese capital, aunque aún no se hubiera alcanzado.", "The floor is the limit below which account equity must not fall. Before the first payment, it follows end-of-day highs and locks at the initial balance once reached. The first payment also locks it there, even if it had not reached that level.")}</p>
            <p>{L("Plancher fixe : 25 000 $ pour un compte 25K, 50 000 $ pour un 50K et 100 000 $ pour un 100K. Sur un 50K, 52 000 $ désigne le plus haut de fin de journée qui déclenche le verrouillage, pas le plancher.", "Piso fijo: 25 000 $, 50 000 $ y 100 000 $ respectivamente. En una cuenta 50K, 52 000 $ es el máximo al cierre que activa el bloqueo, no el piso.", "Fixed floors: $25,000, $50,000 and $100,000 respectively. On a 50K account, $52,000 is the end-of-day high that triggers locking, not the floor.")}</p>
            <p>{L("Les fonds conservés au-dessus du plancher constituent votre marge de sécurité. Un paiement la réduit. La limite est contrôlée sur la valeur du compte, y compris les positions ouvertes.", "Los fondos por encima del piso son tu margen de seguridad. Un pago lo reduce. El límite se controla sobre el valor de la cuenta, incluidas las posiciones abiertas.", "Funds above the floor are your safety buffer. A payment reduces it. The limit is checked against equity, including open positions.")}</p>
          </details>
        </div>
      </div>
    </dialog>
  );
}
