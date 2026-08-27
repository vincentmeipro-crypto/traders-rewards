"use client";
import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const faqTitles: Record<string, string> = {
  en: "Frequently Asked Questions",
  fr: "Questions fréquentes",
  es: "Preguntas frecuentes",
  pt: "Perguntas frequentes",
  de: "Häufig gestellte Fragen",
  tr: "Sık Sorulan Sorular",
  ar: "الأسئلة الشائعة",
};

const faqData = {
  // ── Traders Rewards — 15 questions — FR ───────────────────────
  fr: [
    // 01
    {
      q: "Qu'est-ce que Traders Rewards ?",
      a: "Traders Rewards transforme la performance de votre trading simulé en Rewards. Vous commencez par un Challenge en une seule étape avec un objectif de +6 %. Une fois validé, vous activez votre Compte Reward et entrez dans un parcours progressif composé de 5 niveaux de Rewards, jusqu'au statut Trader Reward.",
    },
    // 02
    {
      q: "Comment fonctionne le Challenge ?",
      a: "Le Challenge se déroule en une seule étape avec un objectif de +6 %. Il n'y a aucun minimum de jours de trading et aucune règle de consistance. Vous devez rester dans votre limite de Trailing Drawdown EOD fixe : 1 000 $ sur le 25K, 2 000 $ sur le 50K, 3 000 $ sur le 100K. Vous disposez de 30 jours calendaires maximum pour valider votre Challenge.",
    },
    // 03
    {
      q: "Qu'est-ce que le Trailing Drawdown EOD ?",
      a: "Le Trailing Drawdown EOD est un plancher de protection recalculé selon la progression de votre compte en fin de journée. Lorsqu'un nouveau plus haut EOD est enregistré, ce plancher remonte avec lui et ne redescend jamais.\n\nSur le Challenge, ce plancher évolue pendant toute la durée du Challenge en fonction de vos plus hauts EOD.\n\nSur le Compte Reward, une fois que le Trailing Drawdown atteint le capital initial du compte, il cesse de monter et reste définitivement fixé à ce niveau.\n\nLa limite est de 4 % sur les comptes 25K et 50K, et de 3 % sur le 100K. Si votre equity passe sous le plancher applicable à votre compte, celui-ci est considéré en échec.",
    },
    // 04 — NOUVELLE
    {
      q: "Y a-t-il une limite de perte journalière ?",
      a: "Non. Traders Rewards n'applique pas de Daily Drawdown séparé. Votre seule limite de perte est le Trailing Drawdown EOD : 4 % sur les comptes 25K et 50K, et 3 % sur le 100K. Cela vous permet de vous concentrer sur une seule limite de risque, claire et facile à suivre.",
    },
    // 05
    {
      q: "Quelles sont toutes les règles du Challenge ?",
      a: "Le Challenge comporte une seule étape avec un objectif de +6 % (1 500 $ sur le 25K / 3 000 $ sur le 50K / 6 000 $ sur le 100K). Il n'y a aucun minimum de jours et aucune règle de consistance. Votre seule limite de risque est le Trailing Drawdown EOD fixe : 1 000 $ sur le 25K, 2 000 $ sur le 50K, 3 000 $ sur le 100K. Vous disposez de 30 jours calendaires maximum.",
    },
    // 06
    {
      q: "Qu'est-ce que le Compte Reward ?",
      a: "Le Compte Reward est votre compte long terme, accessible après avoir validé votre Challenge et réglé les frais d'activation. Vous devez atteindre le seuil Safety Net + cap du niveau demandé (ex. Reward #1 : 26 400 $ sur le 25K / 52 600 $ sur le 50K / 103 850 $ sur le 100K) avec au minimum 5 journées qualifiantes. La règle de consistance exige que votre meilleure journée représente moins de 50 % de votre profit total. Vous disposez d'un temps illimité.",
    },
    // 07
    {
      q: "Comment activer le Compte Reward ?",
      a: "Une fois votre Challenge validé, vous devez régler des frais d'activation uniques : 99 € pour les comptes 25K et 50K, et 149 € pour le compte 100K. Ces frais activent votre Compte Reward et ne sont facturés qu'une seule fois.",
    },
    // 08
    {
      q: "Qu'est-ce qu'une journée qualifiante ?",
      a: "Une journée qualifiante est une journée de trading clôturée avec un profit net minimum correspondant à la taille de votre compte : 100 $ sur le 25K, 250 $ sur le 50K et 300 $ sur le 100K. Vous devez valider au minimum 5 journées qualifiantes pour remplir les conditions de votre Compte Reward. Ces montants correspondent uniquement au profit minimum requis par journée, et non au montant de vos Rewards.",
    },
    // 09
    {
      q: "Comment sont calculées et versées les Rewards ?",
      a: "Pour demander une Reward, votre balance doit atteindre le seuil Safety Net + cap du niveau demandé (ex. 26 400 $ sur le 25K pour Reward #1, 52 600 $ sur le 50K, 103 850 $ sur le 100K).\n\nLe montant versé est le minimum entre :\n— votre nouveau profit depuis la dernière Reward\n— le plafond correspondant à votre niveau\n\nAprès versement, le montant de la Reward est déduit de votre balance. Le plancher de protection reste verrouillé au capital initial — aucun reset automatique. Vous reconstruisez ensuite votre progression vers la Reward suivante.",
    },
    // 10
    {
      q: "Y a-t-il un plafond ou une limite au nombre de Rewards ?",
      a: "Oui. Le parcours Traders Rewards comprend 5 Rewards successives, avec des plafonds qui augmentent à chaque niveau. Ces plafonds représentent le maximum versé — si votre nouveau profit depuis la dernière Reward est inférieur au plafond, c'est ce profit réel qui vous est versé.\n\nCompte 25K :\nReward #1 : 300 $\nReward #2 : 400 $\nReward #3 : 500 $\nReward #4 : 600 $\nReward #5 : 750 $\n\nCompte 50K :\nReward #1 : 500 $\nReward #2 : 650 $\nReward #3 : 800 $\nReward #4 : 1 000 $\nReward #5 : 1 250 $\n\nCompte 100K :\nReward #1 : 750 $\nReward #2 : 1 000 $\nReward #3 : 1 250 $\nReward #4 : 1 500 $\nReward #5 : 1 750 $\n\nLe Reward #5 constitue le niveau final du parcours et vous permet d'atteindre le statut Trader Reward.",
    },
    // 11
    {
      q: "Puis-je avoir plusieurs Challenges simultanément ?",
      a: "Oui. Quelle que soit la taille des comptes, vous pouvez avoir jusqu'à 10 Challenges actifs et jusqu'à 5 Comptes Reward actifs simultanément sur votre profil.",
    },
    // 12
    {
      q: "Quelle plateforme de trading est utilisée ?",
      a: "Traders Rewards utilise MetaTrader 5 (MT5). Après validation de votre paiement, vos identifiants de connexion vous sont envoyés par email et sont également disponibles directement depuis votre dashboard Traders Rewards. Votre compte est ainsi accessible immédiatement. Si vous utilisez déjà MT5, aucun logiciel supplémentaire n'est nécessaire.",
    },
    // 13
    {
      q: "Que se passe-t-il si je dépasse les 30 jours calendaires ?",
      a: "Si votre objectif de +6 % n'est pas atteint à l'issue des 30 jours calendaires, votre Challenge est considéré comme échoué. Le délai commence à courir à partir de la création de votre Challenge, et non à partir de votre premier trade.",
    },
    // 14
    {
      q: "Le capital est-il réel ?",
      a: "Non. L'ensemble du trading effectué sur Traders Rewards est 100 % simulé : aucun capital réel n'est investi sur les marchés et aucun ordre n'est exécuté en conditions réelles. En revanche, les Rewards approuvées sont bien réelles et vous sont versées par Traders Rewards selon les conditions du programme.",
    },
    // 15
    {
      q: "Comment contacter le support ?",
      a: "Vous pouvez contacter notre équipe directement via le chat disponible sur le site ou par email à contact@traders-rewards.eu. Notre support français vous répond généralement dans un délai de 0 à 4 heures.",
    },
  ],

  // ── Traders Rewards — 15 questions — EN ───────────────────────
  en: [
    // 01
    {
      q: "What is Traders Rewards?",
      a: "Traders Rewards turns your simulated trading performance into Rewards. You start with a single-step Challenge targeting +6%. Once validated, you activate your Compte Reward and enter a progressive journey made up of 5 Reward levels, up to the Trader Reward status.",
    },
    // 02
    {
      q: "How does the Challenge work?",
      a: "The Challenge is a single step with a +6% profit target. There is no minimum number of trading days and no consistency rule. You must stay within your Trailing Drawdown EOD limit ($1,000 on the 25K, $2,000 on the 50K, $3,000 on the 100K). You have a maximum of 30 calendar days to validate your Challenge.",
    },
    // 03
    {
      q: "What is the Trailing Drawdown EOD?",
      a: "The Trailing Drawdown EOD is a protection floor recalculated based on your account's progression at end of day. Each time a new EOD high is recorded, the floor rises with it and never comes back down.\n\nDuring the Challenge, this floor evolves throughout the entire Challenge based on your EOD highs.\n\nOn the Compte Reward, once the Trailing Drawdown reaches the account's starting capital, it stops rising and remains permanently fixed at that level.\n\nThe limit is 4% on 25K and 50K accounts, and 3% on the 100K. If your equity falls below the floor applicable to your account, the account is considered failed.",
    },
    // 05
    {
      q: "What are all the Challenge rules?",
      a: "The Challenge is a single step with a +6% profit target ($1,500 on the 25K / $3,000 on the 50K / $6,000 on the 100K). There is no minimum trading days and no consistency rule. Your only risk limit is the Trailing Drawdown EOD ($1,000 / $2,000 / $3,000). You have a maximum of 30 calendar days.",
    },
    // 06
    {
      q: "What is the Compte Reward?",
      a: "The Compte Reward is your long-term account, accessible after validating your Challenge and paying the activation fee. You must accumulate at least 5 qualifying days and reach the Safety Net threshold to access each Reward. The Safety Net is $26,100 (25K) / $52,100 (50K) / $103,100 (100K). The consistency rule requires that your best day represents less than 50% of your total profit. You have unlimited time.",
    },
    // 07
    {
      q: "How do I activate the Compte Reward?",
      a: "Once your Challenge is validated, you pay a one-time activation fee: €99 for 25K and 50K accounts, and €149 for the 100K account. This fee activates your Compte Reward and is charged only once.",
    },
    // 08
    {
      q: "What is a qualifying day?",
      a: "A qualifying day is a trading day closed with a minimum net profit corresponding to your account size: $100 on the 25K, $250 on the 50K, and $300 on the 100K. You must validate at least 5 qualifying days to meet the conditions of your Compte Reward. These amounts represent only the minimum daily profit required to count a qualifying day — not the amount of your Rewards.",
    },
    // 09
    {
      q: "How are Rewards calculated and paid?",
      a: "To request a Reward, your balance must first reach the Reward Request Threshold: Safety Net + cap for that level. For example, on a 25K account, Reward #1 requires a balance of at least $26,400 ($26,100 Safety Net + $300 cap). The exact threshold varies by account size and Reward level.\n\nThe amount paid is whichever is lower:\n— your new profit since the previous Reward\n— the cap for your current level\n\nAfter payment, the Reward amount is deducted from your balance. The protection floor stays locked at your starting capital — no automatic reset. You then rebuild your progress toward the next Reward.",
    },
    // 10
    {
      q: "Is there a cap or a limit on the number of Rewards?",
      a: "Yes. The Traders Rewards journey includes 5 successive Rewards, with caps that increase at each level. These caps are the maximum amount paid — if your new profit since the last Reward is below the cap, you receive the actual profit instead.\n\n25K account:\nReward #1 : $300\nReward #2 : $400\nReward #3 : $500\nReward #4 : $600\nReward #5 : $750\n\n50K account:\nReward #1 : $500\nReward #2 : $650\nReward #3 : $800\nReward #4 : $1,000\nReward #5 : $1,250\n\n100K account:\nReward #1 : $750\nReward #2 : $1,000\nReward #3 : $1,250\nReward #4 : $1,500\nReward #5 : $1,750\n\nReward #5 is the final level and grants you the Trader Reward status.",
    },
    // 11
    {
      q: "Can I have multiple Challenges simultaneously?",
      a: "Yes. Regardless of account size, you can have up to 10 active Challenges and up to 5 active Comptes Reward simultaneously on your profile.",
    },
    // 12
    {
      q: "What trading platform is used?",
      a: "Traders Rewards uses MetaTrader 5 (MT5). After your payment is confirmed, your login credentials are sent by email and are also available directly from your Traders Rewards dashboard. Your account is therefore accessible immediately. If you already use MT5, no additional software is required.",
    },
    // 13
    {
      q: "What happens if I exceed 30 calendar days?",
      a: "If your +6% target has not been reached at the end of the 30 calendar days, your Challenge is considered failed. The countdown starts from the creation of your Challenge, not from your first trade.",
    },
    // 14
    {
      q: "Is the capital real?",
      a: "No. All trading on Traders Rewards is 100% simulated: no real capital is invested in the markets and no orders are executed in real conditions. However, approved Rewards are real and are paid to you by Traders Rewards according to the program's terms.",
    },
    // 15
    {
      q: "How do I contact support?",
      a: "You can contact our team directly via the chat on the website or by email at contact@traders-rewards.eu. Our support team generally responds within 0 to 4 hours.",
    },
  ],

  // ── Traders Rewards — 15 questions — ES ───────────────────────
  es: [
    // 01
    {
      q: "¿Qué es Traders Rewards?",
      a: "Traders Rewards convierte el rendimiento de tu trading simulado en Rewards. Comienzas con un Challenge de una sola etapa con un objetivo de +6 %. Una vez validado, activas tu Compte Reward y entras en un recorrido progresivo compuesto de 5 niveles de Rewards, hasta alcanzar el estatus Trader Reward.",
    },
    // 02
    {
      q: "¿Cómo funciona el Challenge?",
      a: "El Challenge se desarrolla en una sola etapa con un objetivo de +6 % de beneficio. No hay mínimo de días ni regla de consistencia en el Challenge. Debes mantenerte dentro de tu límite de Trailing Drawdown EOD fijo: 1 000 $ en el 25K, 2 000 $ en el 50K, 3 000 $ en el 100K. Dispones de un máximo de 30 días calendario para validar tu Challenge.",
    },
    // 03
    {
      q: "¿Qué es el Trailing Drawdown EOD?",
      a: "El Trailing Drawdown EOD es un suelo de protección recalculado según la progresión de tu cuenta al cierre del día. Cada vez que se registra un nuevo máximo EOD, este suelo sube con él y nunca retrocede.\n\nEn el Challenge, este suelo evoluciona durante toda la duración del Challenge en función de tus máximos EOD.\n\nEn el Compte Reward, una vez que el Trailing Drawdown alcanza el capital inicial de la cuenta, deja de subir y queda fijado definitivamente en ese nivel.\n\nEl límite es del 4 % en las cuentas 25K y 50K, y del 3 % en el 100K. Si tu equity cae por debajo del suelo aplicable a tu cuenta, ésta se considera fallida.",
    },
    // 04 — NUEVA
    {
      q: "¿Existe un límite de pérdida diaria?",
      a: "No. Traders Rewards no aplica un Daily Drawdown separado. Tu único límite de pérdida es el Trailing Drawdown EOD: 4 % en las cuentas 25K y 50K, y 3 % en el 100K. Esto te permite concentrarte en un único límite de riesgo, claro y fácil de seguir.",
    },
    // 05
    {
      q: "¿Cuáles son todas las reglas del Challenge?",
      a: "El Challenge consta de una sola etapa con un objetivo de +6 % de beneficio (1 500 $ en el 25K / 3 000 $ en el 50K / 6 000 $ en el 100K). No hay mínimo de días ni regla de consistencia. Tu único límite de riesgo es el Trailing Drawdown EOD fijo: 1 000 $ en el 25K, 2 000 $ en el 50K, 3 000 $ en el 100K. Dispones de un máximo de 30 días calendario.",
    },
    // 06
    {
      q: "¿Qué es el Compte Reward?",
      a: "El Compte Reward es tu cuenta a largo plazo, accesible tras validar tu Challenge y abonar los gastos de activación. Debes alcanzar el umbral Safety Net + tope del nivel (ej. Reward #1: 26 400 $ en el 25K / 52 600 $ en el 50K / 103 850 $ en el 100K) con un mínimo de 5 días calificados. La consistencia máxima es del 50 % y dispones de tiempo ilimitado.",
    },
    // 07
    {
      q: "¿Cómo se activa el Compte Reward?",
      a: "Una vez validado tu Challenge, debes abonar una cuota de activación única: 99 € para las cuentas 25K y 50K, y 149 € para la cuenta 100K. Esta cuota activa tu Compte Reward y solo se cobra una vez.",
    },
    // 08
    {
      q: "¿Qué es un día calificado?",
      a: "Un día calificado es un día de trading cerrado con un beneficio neto mínimo correspondiente al tamaño de tu cuenta: 100 $ en el 25K, 250 $ en el 50K y 300 $ en el 100K. Debes validar un mínimo de 5 días calificados para cumplir las condiciones de tu Compte Reward. Estos importes corresponden únicamente al beneficio mínimo exigido por día, y no al importe de tus Rewards.",
    },
    // 09
    {
      q: "¿Cómo se calculan y pagan las Rewards?",
      a: "El importe de tu Reward depende del beneficio disponible en tu Compte Reward, dentro del límite máximo correspondiente al tamaño de tu cuenta y a tu nivel de Reward. Estos límites aumentan progresivamente del Reward #1 al Reward #5. Una vez validada tu solicitud, el importe aprobado te es abonado y continúas tu recorrido hacia el siguiente nivel.",
    },
    // 10
    {
      q: "¿Existe un límite en el número de Rewards?",
      a: "Sí. El recorrido Traders Rewards comprende 5 Rewards sucesivas, con límites máximos que aumentan en cada nivel según el tamaño de tu cuenta.\n\nCuenta 25K :\nReward #1 : 300 $\nReward #2 : 400 $\nReward #3 : 500 $\nReward #4 : 600 $\nReward #5 : 750 $\n\nCuenta 50K :\nReward #1 : 500 $\nReward #2 : 650 $\nReward #3 : 800 $\nReward #4 : 1.000 $\nReward #5 : 1.250 $\n\nCuenta 100K :\nReward #1 : 750 $\nReward #2 : 1.000 $\nReward #3 : 1.250 $\nReward #4 : 1.500 $\nReward #5 : 1.750 $\n\nEl Reward #5 es el nivel final del recorrido y te permite alcanzar el estatus Trader Reward.",
    },
    // 11
    {
      q: "¿Puedo tener varios Challenges simultáneamente?",
      a: "Sí. Independientemente del tamaño de las cuentas, puedes tener hasta 10 Challenges activos y hasta 5 Comptes Reward activos simultáneamente.",
    },
    // 12
    {
      q: "¿Qué plataforma de trading se utiliza?",
      a: "Traders Rewards utiliza MetaTrader 5 (MT5). Tras la confirmación de tu pago, tus credenciales de acceso te son enviadas por email y también están disponibles directamente desde tu dashboard Traders Rewards. Tu cuenta es así accesible de inmediato. Si ya utilizas MT5, no se necesita ningún software adicional.",
    },
    // 13
    {
      q: "¿Qué ocurre si supero los 30 días calendario?",
      a: "Si tu objetivo de +6 % no se ha alcanzado al término de los 30 días calendario, tu Challenge se considera fallido. El plazo comienza a contar desde la creación de tu Challenge, y no desde tu primer trade.",
    },
    // 14
    {
      q: "¿El capital es real?",
      a: "No. Todo el trading realizado en Traders Rewards es 100 % simulado: ningún capital real se invierte en los mercados y ninguna orden se ejecuta en condiciones reales. Sin embargo, las Rewards aprobadas son reales y te son abonadas por Traders Rewards según las condiciones del programa.",
    },
    // 15
    {
      q: "¿Cómo contactar con el soporte?",
      a: "Puedes contactar a nuestro equipo directamente a través del chat disponible en el sitio web o por email a contact@traders-rewards.eu. Nuestro equipo de soporte responde habitualmente en un plazo de 0 a 4 horas.",
    },
  ],

  // ── Traders Rewards — 15 questions — PT ───────────────────────
  pt: [
    { q: "O que é Traders Rewards?", a: "Traders Rewards transforma a performance do seu trading simulado em Rewards. Começa com um Challenge de uma etapa com um objetivo de +6 %. Uma vez validado, ativa o seu Compte Reward e entra num percurso progressivo de 5 níveis de Rewards, até ao estatuto Trader Reward." },
    { q: "Como funciona o Challenge?", a: "O Challenge é de uma única etapa: alcance +6 % de lucro. Sem mínimo de dias nem regra de consistência. Trailing Drawdown EOD fixo: 1 000 $ na conta 25K, 2 000 $ na conta 50K, 3 000 $ na conta 100K. Duração máxima: 30 dias calendário." },
    { q: "O que é o Trailing Drawdown EOD?", a: "O Trailing Drawdown EOD é um piso de proteção recalculado com base na progressão da conta no final de cada dia. Sempre que é registado um novo máximo EOD, o piso sobe com ele e nunca desce.\n\nNo Challenge, este piso evolui durante toda a duração do Challenge em função dos máximos EOD.\n\nNo Compte Reward, quando o Trailing Drawdown atinge o capital inicial da conta, deixa de subir e fica definitivamente fixado nesse nível.\n\nO limite é 4 % nas contas 25K e 50K, e 3 % na conta 100K. Se o equity cair abaixo do piso aplicável à sua conta, esta é considerada falhada." },
    { q: "Existe um limite de perda diária?", a: "Não. Traders Rewards não aplica um Daily Drawdown separado. O único limite de perda é o Trailing Drawdown EOD: 4 % nas contas 25K e 50K, e 3 % na conta 100K." },
    { q: "Quais são todas as regras do Challenge?", a: "Objetivo: +6 % (1 500 $ no 25K / 3 000 $ no 50K / 6 000 $ no 100K). Sem mínimo de dias, sem regra de consistência. Trailing Drawdown EOD fixo: 1 000 $ (25K), 2 000 $ (50K), 3 000 $ (100K). Máximo 30 dias calendário." },
    { q: "O que é a Compte Reward?", a: "A Compte Reward é a conta a longo prazo, acessível após validar o Challenge e pagar a taxa de ativação. Deve atingir o limiar Safety Net + tope do nível (ex. Reward #1: 26 400 $ no 25K / 52 600 $ no 50K / 103 850 $ no 100K) com pelo menos 5 dias qualificados. Consistência máxima: 50 %. Tempo ilimitado." },
    { q: "Como ativar a Compte Reward?", a: "Taxa de ativação única: 99 € para as contas 25K e 50K, 149 € para a conta 100K. Esta taxa ativa a Compte Reward e é cobrada apenas uma vez." },
    { q: "O que é um dia qualificado?", a: "Um dia qualificado é um dia de trading fechado com um lucro líquido mínimo: 100 $ na conta 25K, 250 $ na conta 50K e 300 $ na conta 100K. São necessários pelo menos 5 dias qualificados para cumprir as condições da Compte Reward. Estes valores são apenas o mínimo de lucro diário exigido — não o valor das Rewards." },
    { q: "Como são calculados e pagos os Rewards?", a: "O valor da Reward depende do lucro disponível na Compte Reward, dentro do limite máximo correspondente ao nível e tamanho de conta. Estes limites aumentam progressivamente do Reward #1 ao Reward #5. Após validação do pedido, o valor aprovado é pago e o percurso continua para o nível seguinte." },
    { q: "Existe um limite no número de Rewards?", a: "Sim. O percurso Traders Rewards inclui 5 Rewards sucessivas, com limites que aumentam a cada nível.\n\nConta 25K :\nReward #1 : 300 $\nReward #2 : 400 $\nReward #3 : 500 $\nReward #4 : 600 $\nReward #5 : 750 $\n\nConta 50K :\nReward #1 : 500 $\nReward #2 : 650 $\nReward #3 : 800 $\nReward #4 : 1.000 $\nReward #5 : 1.250 $\n\nConta 100K :\nReward #1 : 750 $\nReward #2 : 1.000 $\nReward #3 : 1.250 $\nReward #4 : 1.500 $\nReward #5 : 1.750 $\n\nO Reward #5 é o nível final e concede o estatuto Trader Reward." },
    { q: "Posso ter vários Challenges simultaneamente?", a: "Sim. Independentemente do tamanho das contas, pode ter até 10 Challenges ativos e até 5 Comptes Reward ativas em simultâneo." },
    { q: "Que plataforma de trading é utilizada?", a: "Traders Rewards utiliza MetaTrader 5 (MT5). Após confirmação do pagamento, as credenciais são enviadas por email e ficam também disponíveis no dashboard. Se já utiliza o MT5, não é necessário nenhum software adicional." },
    { q: "O que acontece se ultrapassar 30 dias?", a: "Se o objetivo de +6 % não for atingido ao fim dos 30 dias calendário, o Challenge é considerado falhado. O prazo começa a contar da criação do Challenge, não do primeiro trade." },
    { q: "O capital é real?", a: "Não. Todo o trading é 100 % simulado. As Rewards aprovadas são reais e pagas pela Traders Rewards segundo as condições do programa." },
    { q: "Como contactar o suporte?", a: "Via chat no site ou por email: contact@traders-rewards.eu. A nossa equipa responde geralmente em 0 a 4 horas." },
  ],

  // ── Traders Rewards — 15 questions — DE ───────────────────────
  de: [
    { q: "Was ist Traders Rewards?", a: "Traders Rewards verwandelt Ihre simulierte Trading-Performance in Rewards. Sie beginnen mit einer einstufigen Challenge mit einem Ziel von +6 %. Nach der Validierung aktivieren Sie Ihr Compte Reward und durchlaufen einen progressiven Weg mit 5 Reward-Stufen bis zum Trader Reward Status." },
    { q: "Wie funktioniert die Challenge?", a: "Die Challenge besteht aus einer einzigen Stufe mit +6 % Gewinnziel. Kein Mindesttagehandel, keine Konsistenzregel. Sie müssen innerhalb Ihres fixen Trailing Drawdown EOD bleiben: 1 000 $ für das 25K-Konto, 2 000 $ für 50K, 3 000 $ für 100K. Maximum: 30 Kalendertage." },
    { q: "Was ist der Trailing Drawdown EOD?", a: "Der Trailing Drawdown EOD ist ein Schutz-Floor, der basierend auf der Kontoentwicklung am Tagesende neu berechnet wird. Jedes Mal, wenn ein neues EOD-Hoch erreicht wird, steigt der Floor mit und sinkt nie wieder.\n\nBei der Challenge entwickelt sich dieser Floor während der gesamten Challenge basierend auf den EOD-Hochs.\n\nBeim Compte Reward hört der Trailing Drawdown auf zu steigen, sobald er das Startkapital des Kontos erreicht, und bleibt dauerhaft auf diesem Niveau fixiert.\n\nDas Limit beträgt 4 % für 25K- und 50K-Konten und 3 % für das 100K-Konto. Fällt das Equity unter den für das Konto geltenden Floor, gilt das Konto als gescheitert." },
    { q: "Gibt es ein tägliches Verlustlimit?", a: "Nein. Traders Rewards wendet keinen separaten Daily Drawdown an. Ihr einziges Verlustlimit ist der Trailing Drawdown EOD: 4 % für 25K- und 50K-Konten, 3 % für das 100K-Konto." },
    { q: "Was sind alle Challenge-Regeln?", a: "Gewinnziel: +6 % (1 500 $ beim 25K / 3 000 $ beim 50K / 6 000 $ beim 100K). Kein Mindesttagehandel, keine Konsistenzregel. Einziges Risikolimit: fixer Trailing Drawdown EOD (1 000 $ / 2 000 $ / 3 000 $). Maximum 30 Kalendertage." },
    { q: "Was ist das Compte Reward?", a: "Das Compte Reward ist Ihr Langzeitkonto nach bestandener Challenge. Ziel: Safety Net + Cap des Levels (Reward #1: 26 400 $ beim 25K / 52 600 $ beim 50K / 103 850 $ beim 100K) mit mindestens 5 qualifizierenden Tagen. Maximale Konsistenz: 50 %. Unbegrenzte Zeit." },
    { q: "Wie aktiviere ich das Compte Reward?", a: "Einmalige Aktivierungsgebühr: 99 € für 25K- und 50K-Konten, 149 € für das 100K-Konto. Diese Gebühr wird nur einmal berechnet." },
    { q: "Was ist ein qualifizierender Tag?", a: "Ein qualifizierender Tag ist ein Handelstag mit einem Mindest-Nettogewinn: 100 $ (25K), 250 $ (50K), 300 $ (100K). Sie benötigen mindestens 5 qualifizierende Tage. Diese Beträge sind nur der Mindesttagesgewinn — nicht der Reward-Betrag." },
    { q: "Wie werden Rewards berechnet und ausgezahlt?", a: "Der Reward-Betrag hängt vom verfügbaren Gewinn im Compte Reward ab, begrenzt durch den Cap Ihres Kontoniveaus. Diese Caps steigen progressiv von Reward #1 bis Reward #5. Nach Validierung wird der Betrag ausgezahlt und Sie setzen die Journey zur nächsten Stufe fort." },
    { q: "Gibt es eine Begrenzung der Rewards?", a: "Ja. Die Traders Rewards Journey umfasst 5 aufeinanderfolgende Rewards, mit steigenden Caps je Stufe.\n\n25K-Konto :\nReward #1 : 300 $\nReward #2 : 400 $\nReward #3 : 500 $\nReward #4 : 600 $\nReward #5 : 750 $\n\n50K-Konto :\nReward #1 : 500 $\nReward #2 : 650 $\nReward #3 : 800 $\nReward #4 : 1.000 $\nReward #5 : 1.250 $\n\n100K-Konto :\nReward #1 : 750 $\nReward #2 : 1.000 $\nReward #3 : 1.250 $\nReward #4 : 1.500 $\nReward #5 : 1.750 $\n\nReward #5 ist die finale Stufe und verleiht den Trader Reward Status." },
    { q: "Kann ich mehrere Challenges gleichzeitig haben?", a: "Ja. Unabhängig von der Kontogröße können Sie gleichzeitig bis zu 10 aktive Challenges und bis zu 5 aktive Comptes Reward haben." },
    { q: "Welche Trading-Plattform wird genutzt?", a: "Traders Rewards verwendet MetaTrader 5 (MT5). Nach Zahlungsbestätigung werden Ihre Zugangsdaten per E-Mail gesendet und sind im Dashboard verfügbar. Kein zusätzlicher Download erforderlich, wenn Sie MT5 bereits nutzen." },
    { q: "Was passiert nach 30 Kalendertagen?", a: "Ist das +6 %-Ziel nach 30 Kalendertagen nicht erreicht, gilt die Challenge als gescheitert. Die Frist beginnt mit der Erstellung der Challenge, nicht mit dem ersten Trade." },
    { q: "Ist das Kapital real?", a: "Nein. Das gesamte Trading ist 100 % simuliert. Die genehmigten Rewards sind real und werden von Traders Rewards gemäß den Programmbedingungen ausgezahlt." },
    { q: "Wie kontaktiere ich den Support?", a: "Per Chat auf der Website oder per E-Mail: contact@traders-rewards.eu. Unser Team antwortet in der Regel innerhalb von 0 bis 4 Stunden." },
  ],

  // ── Traders Rewards — 15 questions — TR ───────────────────────
  tr: [
    { q: "Traders Rewards nedir?", a: "Traders Rewards, simüle trading performansınızı Rewards'a dönüştürür. +6 % hedefli tek aşamalı bir Challenge ile başlarsınız. Tamamlandığında Compte Reward'unuzu aktive eder ve Trader Reward statüsüne kadar 5 seviyeli bir yolculuğa girersiniz." },
    { q: "Challenge nasıl çalışır?", a: "Challenge tek bir aşamadan oluşur: +6 % kâr hedefi. Minimum işlem günü ve tutarlılık kuralı yoktur. Sabit Trailing Drawdown EOD limitiniz içinde kalmanız yeterli: 25K için 1 000 $, 50K için 2 000 $, 100K için 3 000 $. Maksimum süre: 30 takvim günü." },
    { q: "Trailing Drawdown EOD nedir?", a: "Trailing Drawdown EOD, hesabın gün sonu performansına göre yeniden hesaplanan bir koruma tabanıdır. Yeni bir EOD zirvesi kaydedildiğinde bu taban onunla birlikte yükselir ve asla düşmez.\n\nChallenge süresince bu taban, EOD zirvelerinize göre Challenge boyunca gelişmeye devam eder.\n\nCompte Reward'ta ise Trailing Drawdown hesabın başlangıç sermayesine ulaştığında yükselmeyi durdurur ve kalıcı olarak bu seviyede sabitlenir.\n\nLimit 25K ve 50K hesaplar için %4, 100K hesap için %3'tür. Equity, hesabınıza uygulanan tabanın altına düşerse hesap başarısız sayılır." },
    { q: "Günlük kayıp limiti var mı?", a: "Hayır. Traders Rewards ayrı bir Daily Drawdown uygulamaz. Tek kayıp limitiniz Trailing Drawdown EOD'dur: 25K ve 50K hesaplar için %4, 100K için %3." },
    { q: "Challenge'ın tüm kuralları nelerdir?", a: "Hedef: +6 % (25K: 1 500 $ / 50K: 3 000 $ / 100K: 6 000 $). Minimum işlem günü yok, tutarlılık kuralı yok. Tek risk limiti: sabit Trailing Drawdown EOD (1 000 $ / 2 000 $ / 3 000 $). Maksimum 30 takvim günü." },
    { q: "Compte Reward nedir?", a: "Compte Reward, Challenge'ı geçtikten ve aktivasyon ücretini ödedikten sonra erişilen uzun vadeli hesaptır. İlk Reward için Safety Net + seviye tavan eşiğine (Reward #1: 25K: 26 400 $, 50K: 52 600 $, 100K: 103 850 $) minimum 5 nitelikli gün ile ulaşmanız gerekir. Maksimum tutarlılık: %50. Süre sınırsızdır." },
    { q: "Compte Reward nasıl aktive edilir?", a: "Challenge başarıyla tamamlandıktan sonra tek seferlik aktivasyon ücreti ödenir: 25K ve 50K hesaplar için 99 €, 100K hesap için 149 €. Bu ücret yalnızca bir kez alınır." },
    { q: "Nitelikli gün nedir?", a: "Nitelikli gün, hesap büyüklüğüne göre minimum net kâr eşiğini aşan bir işlem günüdür: 25K için 100 $, 50K için 250 $, 100K için 300 $. Compte Reward koşullarını karşılamak için en az 5 nitelikli gün gereklidir. Bu tutarlar yalnızca günlük minimum kâr eşiğidir — Reward miktarı değildir." },
    { q: "Rewards nasıl hesaplanır ve ödenir?", a: "Reward miktarı, Compte Reward'taki mevcut kâra bağlıdır; hesap büyüklüğüne ve seviyeye göre belirlenen tavan ile sınırlıdır. Bu tavanlar Reward #1'den Reward #5'e kadar artar. Onaylandıktan sonra tutar ödenir ve bir sonraki seviyeye devam edilir." },
    { q: "Rewards sayısında sınır var mı?", a: "Evet. Traders Rewards yolculuğu, her seviyede artan tavanlarla 5 ardışık Reward içerir.\n\n25K hesap :\nReward #1 : 300 $\nReward #2 : 400 $\nReward #3 : 500 $\nReward #4 : 600 $\nReward #5 : 750 $\n\n50K hesap :\nReward #1 : 500 $\nReward #2 : 650 $\nReward #3 : 800 $\nReward #4 : 1.000 $\nReward #5 : 1.250 $\n\n100K hesap :\nReward #1 : 750 $\nReward #2 : 1.000 $\nReward #3 : 1.250 $\nReward #4 : 1.500 $\nReward #5 : 1.750 $\n\nReward #5 son seviyedir ve Trader Reward statüsünü verir." },
    { q: "Birden fazla Challenge'ım olabilir mi?", a: "Evet. Hesap büyüklüğünden bağımsız olarak aynı anda en fazla 10 aktif Challenge ve 5 aktif Compte Reward sahibi olabilirsiniz." },
    { q: "Hangi platform kullanılıyor?", a: "Traders Rewards MetaTrader 5 (MT5) kullanır. Ödeme onaylandıktan sonra giriş bilgileri e-posta ile gönderilir ve dashboard'dan da erişilebilir. MT5 zaten yüklüyse ek indirmeye gerek yoktur." },
    { q: "30 günü aşarsam ne olur?", a: "+6 % hedefi 30 takvim günü sonunda ulaşılamamışsa Challenge başarısız sayılır. Süre, Challenge oluşturulduğu andan itibaren başlar, ilk trade'den değil." },
    { q: "Sermaye gerçek mi?", a: "Hayır. Traders Rewards'daki tüm trading %100 simülasyondur. Onaylanan Rewards ise gerçektir ve Traders Rewards tarafından program koşullarına göre ödenir." },
    { q: "Destek ile nasıl iletişim kurabilirim?", a: "Site içindeki chat veya e-posta ile: contact@traders-rewards.eu. Ekibimiz genellikle 0 ile 4 saat içinde yanıt verir." },
  ],

  // ── Traders Rewards — 15 questions — AR ───────────────────────
  ar: [
    { q: "ما هو Traders Rewards؟", a: "Traders Rewards يحوّل أداء تداولك المحاكى إلى Rewards. تبدأ بـ Challenge من خطوة واحدة بهدف +6 %. بعد التحقق، تُفعّل Compte Reward وتدخل مساراً تدريجياً من 5 مستويات Rewards حتى تصل إلى مستوى Trader Reward." },
    { q: "كيف يعمل Challenge؟", a: "Challenge خطوة واحدة بهدف +6 %. لا حد أدنى لأيام التداول ولا قاعدة اتساق. Trailing Drawdown EOD ثابت: 1 000 $ لحساب 25K، 2 000 $ لحساب 50K، 3 000 $ لحساب 100K. المدة القصوى: 30 يوماً تقويمياً." },
    { q: "ما هو Trailing Drawdown EOD؟", a: "Trailing Drawdown EOD هو سقف حماية يُعاد حسابه بناءً على تقدم حسابك في نهاية كل يوم. في كل مرة يُسجَّل فيها قمة EOD جديدة، يرتفع هذا السقف معها ولا ينخفض أبداً.\n\nفي Challenge، يتطور هذا السقف طوال مدة Challenge بناءً على قمم EOD الخاصة بك.\n\nفي Compte Reward، بمجرد أن يصل Trailing Drawdown إلى رأس المال الأولي للحساب، يتوقف عن الارتفاع ويظل ثابتاً نهائياً عند ذلك المستوى.\n\nالحد هو 4 % لحسابات 25K و50K، و3 % لحساب 100K. إذا انخفض الرصيد تحت السقف المطبّق على حسابك، يُعدّ الحساب فاشلاً." },
    { q: "هل يوجد حدّ للخسارة اليومية؟", a: "لا. Traders Rewards لا يطبق Daily Drawdown منفصلاً. حدّ الخسارة الوحيد هو Trailing Drawdown EOD: 4 % لحسابات 25K و50K، و3 % لحساب 100K." },
    { q: "ما هي جميع قواعد Challenge؟", a: "الهدف: +6 % (25K: 1 500 $ / 50K: 3 000 $ / 100K: 6 000 $). لا حد أدنى لأيام التداول ولا قاعدة اتساق. حد الخسارة الوحيد: Trailing Drawdown EOD ثابت (1 000 $ / 2 000 $ / 3 000 $). حد أقصى 30 يوماً تقويمياً." },
    { q: "ما هو Compte Reward؟", a: "Compte Reward هو حسابك طويل الأمد، متاح بعد إتمام Challenge ودفع رسوم التفعيل. يجب الوصول إلى عتبة Safety Net + تابع المستوى (Reward #1: 26 400 $ للـ25K / 52 600 $ للـ50K / 103 850 $ للـ100K) مع 5 أيام مؤهلة على الأقل. الاتساق الأقصى 50 %. الوقت غير محدود." },
    { q: "كيف يتم تفعيل Compte Reward؟", a: "رسوم تفعيل لمرة واحدة: 99 € لحسابات 25K و50K، و149 € لحساب 100K. تُحصّل هذه الرسوم مرة واحدة فقط." },
    { q: "ما هو اليوم المؤهل؟", a: "اليوم المؤهل هو يوم تداول تحقق فيه ربحاً صافياً لا يقل عن: 100 $ (25K)، 250 $ (50K)، 300 $ (100K). تحتاج 5 أيام مؤهلة على الأقل. هذه المبالغ هي الحد الأدنى للربح اليومي، وليست قيمة Rewards." },
    { q: "كيف تُحسب وتُدفع Rewards؟", a: "يعتمد مبلغ Reward على الربح المتاح في Compte Reward، بحدود أقصى تزداد تدريجياً من Reward #1 إلى Reward #5. بعد التحقق من الطلب يُصرف المبلغ، ثم تستمر في المستوى التالي." },
    { q: "هل هناك حدٌّ لعدد Rewards؟", a: "نعم. يتضمن مسار Traders Rewards 5 Rewards متتالية، بحدود قصوى تزداد في كل مستوى.\n\nحساب 25K :\nReward #1 : 300 $\nReward #2 : 400 $\nReward #3 : 500 $\nReward #4 : 600 $\nReward #5 : 750 $\n\nحساب 50K :\nReward #1 : 500 $\nReward #2 : 650 $\nReward #3 : 800 $\nReward #4 : 1.000 $\nReward #5 : 1.250 $\n\nحساب 100K :\nReward #1 : 750 $\nReward #2 : 1.000 $\nReward #3 : 1.250 $\nReward #4 : 1.500 $\nReward #5 : 1.750 $\n\nReward #5 هو المستوى النهائي ويمنح وضع Trader Reward." },
    { q: "هل يمكنني الحصول على عدة Challenges في وقت واحد؟", a: "نعم. بغض النظر عن حجم الحساب، يمكنك امتلاك ما يصل إلى 10 Challenges نشطة و5 Comptes Reward نشطة في الوقت نفسه." },
    { q: "ما منصة التداول المستخدمة؟", a: "Traders Rewards يستخدم MetaTrader 5 (MT5). بعد تأكيد الدفع، تُرسل بيانات الدخول عبر البريد الإلكتروني وتكون متاحة من لوحة التحكم. لا حاجة لتنزيل إضافي إن كنت تستخدم MT5 بالفعل." },
    { q: "ماذا يحدث إذا تجاوزت 30 يوماً؟", a: "إذا لم يتحقق هدف +6 % خلال 30 يوماً تقويمياً، يُعدّ Challenge فاشلاً. يبدأ العد من تاريخ إنشاء Challenge، وليس من أول صفقة." },
    { q: "هل رأس المال حقيقي؟", a: "لا. جميع التداولات على Traders Rewards محاكاة 100 %. أما Rewards المعتمدة فهي حقيقية وتُدفع من قِبل Traders Rewards وفق شروط البرنامج." },
    { q: "كيف أتواصل مع الدعم؟", a: "عبر الدردشة على الموقع أو بالبريد الإلكتروني: contact@traders-rewards.eu. يرد فريقنا عادةً خلال 0 إلى 4 ساعات." },
  ],
};

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { lang } = useLanguage();
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const items = faqData[lang as keyof typeof faqData] || faqData.en;
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? items : items.slice(0, 8);
  const moreLabel = lang === "fr" ? "VOIR TOUTES LES QUESTIONS" : lang === "es" ? "VER TODAS LAS PREGUNTAS" : "VIEW ALL QUESTIONS";
  const lessLabel = lang === "fr" ? "RÉDUIRE LA LISTE" : lang === "es" ? "REDUCIR LA LISTA" : "SHOW FEWER QUESTIONS";

  return (
    <section id="faq" className="home-faq" style={{ padding: isMobile ? "48px 16px" : "64px 24px", backgroundColor: "#000000" }}>
      <div className="home-faq-shell" style={{ maxWidth: 780, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#9CCFEA", marginBottom: 16 }}>FAQ</div>
          <h2 style={{ fontSize: isMobile ? "clamp(1.8rem, 7vw, 2.6rem)" : "clamp(2rem, 2.6vw, 3.4rem)", fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.5px", lineHeight: 1.05, textTransform: "uppercase" }}>
            {faqTitles[lang] || faqTitles.en}
          </h2>
        </div>

        <div className="faq-list" style={{ display: "flex", flexDirection: "column" }}>
          {visibleItems.map((item, i) => (
            <div key={i} className={`faq-item${open === i ? " is-open" : ""}`} style={{
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="faq-trigger"
                aria-expanded={open === i}
                style={{
                  width: "100%", textAlign: "left",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "22px 0",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF", lineHeight: 1.4 }}>{item.q}</span>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: open === i ? "#9CCFEA" : "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>
                  <ChevronDown size={14} color={open === i ? "#000" : "rgba(255,255,255,0.6)"}
                    style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }} />
                </div>
              </button>
              {open === i && (
                <div className="faq-answer" style={{ paddingBottom: 22, paddingRight: 44 }}>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.75, margin: 0, whiteSpace: "pre-line" }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        {items.length > 8 && <div style={{ textAlign: "center", marginTop: 26 }}>
          <button type="button" onClick={() => setShowAll(v => !v)} style={{
            minWidth: 250, padding: "14px 22px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,.3)", color: "#fff",
            background: "linear-gradient(145deg, #181818, #080808)",
            fontSize: 11, fontWeight: 850, letterSpacing: 1.5, cursor: "pointer",
          }}>{showAll ? lessLabel : moreLabel}</button>
        </div>}

      </div>
    </section>
  );
}
