export default function TermsPage() {
  const sections = [
    {
      title: "1. Clients éligibles",
      content: [
        "Vous n'êtes éligible à l'accès aux Services que si vous êtes une personne physique âgée d'au moins dix-huit (18) ans et non soumise à des restrictions liées à votre nationalité ou à votre lieu de résidence, ou si vous êtes une personne morale non établie dans une Juridiction Restreinte.",
        "Vous ne devez pas figurer sur les listes de sanctions de l'Union Européenne, de l'OFAC, des Nations Unies ou de la République d'Estonie. Vous ne devez pas avoir d'antécédents judiciaires liés à la criminalité financière ou au terrorisme, et vous devez satisfaire à nos procédures de vérification d'identité (KYC/KYB).",
        "Vous déclarez qu'au moment de la conclusion de l'Accord, vous satisfaites aux critères d'éligibilité. Si vous cessez de les satisfaire après la conclusion de l'Accord, vous devez nous en informer immédiatement.",
      ]
    },
    {
      title: "2. Les Services ne sont pas des services financiers réglementés",
      content: [
        "Aucun des Services n'est soumis aux lois régissant le secteur financier. Nous ne sommes pas régulés par la Finantsinspektsioon (autorité de surveillance financière estonienne) ni par aucune autorité équivalente. Par conséquent, vous ne bénéficierez d'aucune protection réglementaire associée au secteur financier.",
        "Aucun des Services ne constitue un conseil financier, en investissement, juridique ou fiscal, ni une recommandation d'achat, de vente ou de conservation d'un quelconque produit financier.",
        "Nous ne donnons aucune instruction sur la manière dont vous devez effectuer vos trades simulés, à l'exception des Pratiques de Trading Interdites et des Règles de Gestion du Risque.",
      ]
    },
    {
      title: "3. Commande de Services",
      content: [
        "Vous pouvez passer une Commande après votre inscription, qui crée votre Espace Client sur le Site. Vous êtes responsable de la confidentialité de vos Identifiants de Profil.",
        "Lors de la finalisation d'une Commande, vous sélectionnez la version du Challenge Traders Rewards et le montant du Capital Simulé Initial. Ces options ne peuvent pas être modifiées une fois la Commande soumise.",
        "Les Frais de Challenge sont non remboursables une fois payés, sauf exercice du droit de rétractation dans les conditions définies à l'Article 11.",
        "Les remises et avantages promotionnels ne peuvent pas être cumulés, sauf mention expresse contraire de notre part.",
        "Le Capital Simulé total ne peut pas excéder 200 000 USD par client, tous comptes confondus.",
      ]
    },
    {
      title: "4. Espace Client et Plateforme de Trading",
      content: [
        "L'accès à tous les Services se fait via l'Espace Client. Vous ne pouvez posséder qu'un seul Espace Client. L'adresse e-mail liée à votre profil ne peut pas être modifiée après l'inscription.",
        "Vous êtes responsable de toutes les activités effectuées via votre Espace Client ou votre Plateforme de Trading avec vos identifiants. Vous ne devez en aucun cas partager vos identifiants avec un tiers.",
        "Les Services peuvent être temporairement indisponibles en raison de maintenances ou mises à jour. Nous ne garantissons pas la compatibilité des Services avec un équipement ou logiciel spécifique.",
        "Les opérateurs de logiciels tiers (notamment la Plateforme de Trading MetaTrader 5) sont des entités distinctes de Traders Rewards. Nous déclinons toute responsabilité en lien avec ces logiciels tiers.",
      ]
    },
    {
      title: "5. Nos Services — Challenge Traders Rewards",
      content: [
        "Le Trading Simulé reproduit les conditions des marchés financiers réels. Les données de marché sont utilisées uniquement pour reproduire ces conditions. Aucun ordre réel n'est exécuté sur les marchés financiers.",
        "Vous reconnaissez que le Trading Simulé est entièrement fictif, que le capital affiché n'a aucune valeur monétaire réelle, et que vous ne percevrez aucune rémunération lors de la phase d'Évaluation.",
        "Challenge 2 Étapes — Phase 1 : Objectif +10%, Drawdown journalier max 5%, Drawdown global max 10%, 4 jours de trading minimum. Phase 2 : Objectif +5%, Drawdown journalier max 5%, Drawdown global max 10%, 4 jours de trading minimum.",
        "Challenge 1 Étape : Objectif +8%, Drawdown journalier max 3% (trailing), Drawdown global max 8% (trailing), meilleure journée ≤ 50% du profit total, 5 jours de trading minimum.",
        "Si vous n'activez pas une phase dans les trente (30) jours suivant sa mise à disposition, votre accès sera suspendu. Vous pouvez demander un renouvellement dans les six (6) mois, faute de quoi l'Accord sera résilié sans remboursement.",
      ]
    },
    {
      title: "6. Programme Traders Rewards",
      content: [
        "Si vous réussissez le Processus d'Évaluation, vous pourrez accéder au Programme Traders Rewards, qui vous donne accès à un Compte Trader et vous permet de percevoir une Récompense basée sur les performances générées.",
        "La Récompense applicable est de 80% des profits simulés pour les traders issus du Challenge 2 Étapes, et de 90% des profits simulés pour les traders issus du Challenge 1 Étape.",
        "Le Compte Trader ne comporte aucun objectif de profit, aucun nombre de jours minimum et aucune date d'expiration. Seules les règles de Drawdown restent applicables.",
        "La réussite du Challenge ne garantit pas automatiquement l'accès au Programme Trader. Nous nous réservons le droit d'effectuer des vérifications complémentaires.",
        "Les Récompenses versées ne constituent pas un salaire, une rémunération professionnelle, ni un revenu issu d'opérations sur instruments financiers réels. Vous êtes seul responsable de vos obligations fiscales.",
      ]
    },
    {
      title: "7. Règles du Trading Simulé",
      content: [
        "Les Services sont réservés à votre usage personnel exclusif. Vous ne pouvez pas permettre à un tiers d'accéder à vos comptes, de trader à votre place ou en coordination avec vous.",
        "Vous ne devez pas vous livrer à des Pratiques de Trading Interdites. La liste de ces pratiques est disponible sur le Site et peut être mise à jour à tout moment.",
        "Vous devez respecter les règles de gestion du risque standard, notamment éviter l'ouverture de positions d'une taille significativement différente de vos trades habituels ou des comportements exposant votre compte à un risque cumulatif excessif.",
        "En cas de violation, nous pouvons considérer cela comme un échec du Challenge, annuler certains trades, résilier l'Accord avec effet immédiat, ou prendre toute autre mesure nécessaire, sans obligation d'indemnisation.",
      ]
    },
    {
      title: "8. Utilisation du Site et des Contenus",
      content: [
        "Tous les Contenus sont protégés par les lois relatives à la propriété intellectuelle. Nous vous accordons une licence limitée, non exclusive et révocable d'utilisation pour votre usage personnel.",
        "Vous vous engagez à ne pas utiliser des outils perturbant le Site, contourner des restrictions techniques, copier ou modifier les Services, ni les exploiter à des fins commerciales non autorisées.",
        "Toutes les marques, logos et noms commerciaux affichés sur le Site sont notre propriété. Nous ne vous accordons aucune autorisation de les utiliser.",
      ]
    },
    {
      title: "9. Clause de non-responsabilité",
      content: [
        "Les Services sont fournis « en l'état ». Nous déclinons toute garantie de qualité, d'adéquation à un usage particulier ou d'absence d'erreur.",
        "Nous ne sommes pas responsables des préjudices directs ou indirects résultant de l'utilisation des Services, des interruptions dues à la force majeure, ni des défaillances de la Plateforme de Trading fournie par un tiers.",
        "En cas de responsabilité reconnue par une décision judiciaire, elle sera limitée au montant des Frais de Challenge que vous avez payés dans le cadre du Service concerné.",
      ]
    },
    {
      title: "10. Violation des CGV",
      content: [
        "Nous pouvons, sans préavis, restreindre votre accès aux Services et résilier un ou plusieurs Accords en cas de violation des présentes CGV, de comportement susceptible de nuire à notre réputation, ou de tentative de fraude.",
        "Nous ne sommes tenus à aucune indemnisation dans ces cas.",
      ]
    },
    {
      title: "11. Droit de rétractation",
      content: [
        "Si vous êtes un Consommateur, vous disposez d'un droit de rétractation de quatorze (14) jours calendaires à compter de la conclusion de l'Accord, sans avoir à motiver votre décision.",
        "Vous perdez ce droit dès que vous ouvrez votre premier trade simulé sur la Plateforme de Trading.",
        "Pour exercer ce droit, adressez-nous une notification par e-mail avant l'expiration du délai. Nous vous rembourserons dans les quatorze (14) jours suivant la réception de votre notification.",
      ]
    },
    {
      title: "12. Durée et résiliation de l'Accord",
      content: [
        "L'Accord est conclu pour une durée déterminée, jusqu'à la réussite ou l'échec du Challenge Traders Rewards.",
        "Nous pouvons résilier l'Accord avec effet immédiat en cas de non-paiement, d'inactivité prolongée (aucun trade pendant 30 jours consécutifs), de violation des règles d'usage personnel, de Pratiques de Trading Interdites, ou si nos obligations légales l'exigent.",
        "Chaque partie peut résilier l'Accord sans motif en adressant un préavis écrit de quatorze (14) jours calendaires à l'autre partie. Aucune indemnisation n'est due en cas de résiliation.",
      ]
    },
    {
      title: "13. Réclamations et problèmes techniques",
      content: [
        "Pour tout problème technique, contactez-nous à contact@traders-rewards.eu en indiquant votre identifiant de compte, une description du problème et la date/heure d'occurrence.",
        "Nous traiterons votre réclamation dans les trente (30) jours calendaires suivant sa réception.",
        "Nous nous réservons le droit de refuser la fourniture de tout Service futur si vous contestez les Frais de Challenge auprès de votre banque (chargeback) de manière injustifiée.",
      ]
    },
    {
      title: "14. Modifications des CGV",
      content: [
        "Nous pouvons modifier les présentes CGV. Vous serez informé de toute modification au moins sept (7) jours calendaires avant son entrée en vigueur, via l'Espace Client ou par e-mail.",
        "Votre utilisation continue des Services vaudra acceptation de la modification. Si vous refusez, vous pouvez nous en informer par e-mail avant la date d'entrée en vigueur, ce qui entraînera la résiliation automatique de tous les Accords.",
      ]
    },
    {
      title: "15. Vos données personnelles",
      content: [
        "Dans le cadre de la fourniture des Services, nous traitons vos données personnelles conformément à notre Politique de Confidentialité disponible sur le Site.",
        "Vous consentez à ce que nous utilisions les informations relatives à vos trades simulés de manière anonymisée pour améliorer nos services et analyser les données de trading.",
        "La résiliation de l'Accord n'affecte pas le traitement des données collectées antérieurement.",
      ]
    },
    {
      title: "16. Résolution extrajudiciaire des litiges",
      content: [
        "En tant que Consommateur résidant dans l'Union Européenne, vous pouvez recourir à la plateforme de règlement en ligne des litiges de la Commission Européenne : https://ec.europa.eu/consumers/odr",
        "Ces procédures ne peuvent être engagées qu'après échec d'une résolution directe entre vous et nous, et dans le délai d'un an à compter de votre première réclamation.",
      ]
    },
    {
      title: "17. Droit applicable et juridiction compétente",
      content: [
        "L'Accord et les présentes CGV sont régis par le droit de la République d'Estonie.",
        "Les juridictions de la République d'Estonie sont compétentes pour trancher tout litige né de l'Accord ou en relation avec celui-ci.",
      ]
    },
    {
      title: "18. Communications",
      content: [
        "Nous communiquerons avec vous par voie électronique, via l'Espace Client ou par e-mail à l'adresse enregistrée lors de votre inscription. Cette adresse ne peut pas être modifiée après l'inscription.",
        "Pour toute question relative à l'Accord ou aux Services : contact@traders-rewards.eu",
      ]
    },
    {
      title: "19. Dispositions générales",
      content: [
        "L'Accord constitue l'intégralité de l'accord entre vous et nous et remplace tout accord antérieur.",
        "Si une disposition est jugée nulle ou inapplicable, les autres dispositions restent pleinement en vigueur.",
        "Nous pouvons céder l'Accord à un tiers. Vous ne pouvez pas le transférer sans notre consentement écrit préalable.",
        "Notre manquement à exercer un droit prévu par les présentes CGV ne constitue pas une renonciation à ce droit.",
      ]
    },
    {
      title: "20. Définitions",
      content: [
        "« Accord » : le contrat conclu entre vous et nous lors de la confirmation de votre Commande.",
        "« Capital Simulé Initial » : le montant simulé choisi lors de la Commande, sans valeur monétaire réelle.",
        "« Challenge Traders Rewards » : le service d'évaluation proposé en deux versions (1 Étape et 2 Étapes).",
        "« Compte Trader » : le compte simulé accessible après réussite du Challenge, dans le cadre du Programme Trader.",
        "« Drawdown journalier » : perte maximale autorisée sur une journée de trading, calculée par rapport au solde de début de journée.",
        "« Drawdown global » : perte maximale autorisée sur l'ensemble du Challenge, calculée par rapport au Capital Simulé Initial.",
        "« Frais de Challenge » : les frais associés au Challenge Traders Rewards, non remboursables sauf rétractation valide.",
        "« Juridictions Restreintes » : pays depuis lesquels nous n'acceptons pas de clients (liste disponible sur le Site).",
        "« Plateforme de Trading » : MetaTrader 5 (MT5), interface fournie par un tiers.",
        "« Pratiques de Trading Interdites » : pratiques, stratégies ou comportements strictement interdits, listés sur le Site.",
        "« Programme Traders Rewards » : programme donnant accès à un Compte Trader et aux Récompenses.",
        "« Récompense » : montant versé en proportion des profits simulés sur le Compte Trader (80% ou 90% selon le Challenge).",
        "« Services » : l'ensemble des services fournis par Traders Rewards via le Site traders-rewards.eu.",
        "« Trading Simulé » : activité simulant des opérations sur marchés financiers, sans exécution réelle d'ordres.",
      ]
    },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", color: "#fff", fontFamily: "var(--font-inter), DM Sans, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "80px 24px 120px" }}>

        <a href="/" style={{ color: "#00C2FF", fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 48 }}>
          ← Retour à l&apos;accueil
        </a>

        <div style={{ marginBottom: 56 }}>
          <div style={{ display: "inline-block", background: "rgba(45,125,210,0.1)", border: "1px solid rgba(45,125,210,0.3)", borderRadius: 6, padding: "4px 12px", fontSize: 12, color: "#00C2FF", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 20 }}>
            Légal
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 900, marginBottom: 12, lineHeight: 1.1 }}>
            Conditions Générales<br />de Vente et d&apos;Utilisation
          </h1>
          <p style={{ color: "#555", fontSize: 14 }}>
            Dernière mise à jour : 24 mai 2026 — Traders Rewards OÜ, République d&apos;Estonie
          </p>
        </div>

        {/* Intro */}
        <div style={{ background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 12, padding: "24px 28px", marginBottom: 48 }}>
          <p style={{ color: "#888", lineHeight: 1.8, fontSize: 14, margin: 0 }}>
            Nous sommes <strong style={{ color: "#fff" }}>Traders Rewards OÜ</strong>, société de droit estonien (ci-après « nous » ou « Traders Rewards »). Notre mission est de fournir aux traders un environnement de trading simulé conçu pour évaluer leurs compétences et récompenser leurs résultats via le site <strong style={{ color: "#fff" }}>traders-rewards.eu</strong>.
            <br /><br />
            Les présentes CGV régissent l&apos;accès au Challenge Traders Rewards et à tous nos services. Les comptes de Challenge sont des comptes de <strong style={{ color: "#fff" }}>trading entièrement simulé</strong>. Aucun capital réel n&apos;est investi, aucun ordre n&apos;est exécuté sur les marchés financiers.
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {sections.map((section, i) => (
            <div key={i}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: "#00C2FF", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #1a1a28" }}>
                {section.title}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {section.content.map((para, j) => (
                  <p key={j} style={{ color: "#888", lineHeight: 1.8, fontSize: 14, margin: 0 }}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid #1a1a28", color: "#444", fontSize: 13, lineHeight: 1.7 }}>
          <p>Pour toute question relative aux présentes CGV : <a href="mailto:contact@traders-rewards.eu" style={{ color: "#00C2FF" }}>contact@traders-rewards.eu</a></p>
          <p style={{ marginTop: 8 }}>Traders Rewards OÜ · République d&apos;Estonie · Version 1.0 — 24 mai 2026</p>
        </div>
      </div>
    </div>
  );
}
