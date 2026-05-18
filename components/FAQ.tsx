"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const faqData = {
  en: [
    {
      q: "How do I get started?",
      a: "Choose your challenge (2-Step or 1-Step), select your account size ($10K to $200K), complete payment, and receive your trading account credentials instantly by email.",
    },
    {
      q: "Is there a time limit to pass the challenge?",
      a: "No. There is absolutely no time limit on any of our challenges. Trade at your own pace — take days, weeks, or months. The only requirement is hitting your profit target while respecting the drawdown rules.",
    },
    {
      q: "What are the profit targets?",
      a: "2-Step: Phase 1 requires +10% profit, Phase 2 requires +5% profit. Once funded, there is no profit target. 1-Step: a single phase with a +10% profit target, then you're funded.",
    },
    {
      q: "What are the drawdown rules?",
      a: "2-Step: maximum 5% daily loss and 10% total loss. 1-Step: maximum 3% daily loss and 10% trailing total loss. If either limit is breached, the account is failed.",
    },
    {
      q: "What is the minimum number of trading days?",
      a: "You must trade on at least 4 different calendar days during each phase. A trading day counts when at least one trade is opened and closed.",
    },
    {
      q: "Is my challenge fee refunded?",
      a: "Yes. Your challenge fee is fully refunded with your very first reward from your certified account. You essentially get paid to pass the challenge.",
    },
    {
      q: "What instruments can I trade?",
      a: "You can trade all available instruments: Forex pairs, Gold, Silver, Oil, Stock Indices (S&P 500, NASDAQ, DAX…), Cryptocurrencies, and Commodities.",
    },
    {
      q: "Can I trade during news events?",
      a: "Yes. News trading is fully allowed during the evaluation phases. However, on certified accounts, trading is suspended 5 minutes before and 5 minutes after major news releases to protect account stability.",
    },
    {
      q: "Can I hold positions overnight or over the weekend?",
      a: "Yes. You may hold positions overnight and over weekends with no restrictions. Swing trading is fully permitted.",
    },
    {
      q: "Is there a maximum risk per trade?",
      a: "There is no fixed rule on position sizing. We actively monitor every trader's activity and reserve the right to review any account showing signs of insufficient or unsustainable risk management. Consistently risking a large portion of the daily loss limit on a single trade will be considered unsustainable. We look for serious traders who manage risk responsibly — treat your account as you would your own real capital.",
    },
    {
      q: "Can I use Expert Advisors (EAs) or bots?",
      a: "No. Automated trading robots and Expert Advisors (EAs) are strictly forbidden on all Elysium accounts — both during the challenge and on certified accounts. Only manual trading is permitted.",
    },
    {
      q: "How and when do I get paid?",
      a: "Your first reward is available from day 14 of trading on your certified account (or the day after your first trade, whichever comes later). After that, you can request a reward every 30 calendar days. Rewards are processed within 24-48 hours via crypto (USDT, BTC) or bank transfer.",
    },
    {
      q: "What is the profit split?",
      a: "2-Step certified traders keep 80% of profits. 1-Step certified traders keep 90% of profits. There is no cap on how much you can earn.",
    },
    {
      q: "Can I scale my account?",
      a: "Yes. Through our scaling program, consistent certified traders can grow their capital up to $400,000 in total allocation.",
    },
    {
      q: "What trading platform is used?",
      a: "We use MetaTrader 5 via Blueberry Markets — one of the world's most reputable brokers. You get institutional-grade execution with ultra-low spreads.",
    },
    {
      q: "What happens if I fail a challenge?",
      a: "You can purchase a new challenge at any time. We also offer a discounted retry fee for traders who come close to passing.",
    },
  ],
  fr: [
    {
      q: "Comment commencer ?",
      a: "Choisissez votre challenge (2 étapes ou 1 étape), sélectionnez la taille de votre compte (10K$ à 200K$), effectuez le paiement et recevez immédiatement vos identifiants de compte par email.",
    },
    {
      q: "Y a-t-il une limite de temps ?",
      a: "Non. Il n'y a aucune limite de temps sur nos challenges. Tradez à votre rythme — quelques jours, semaines ou mois. La seule exigence est d'atteindre votre objectif de profit tout en respectant les règles de drawdown.",
    },
    {
      q: "Quels sont les objectifs de profit ?",
      a: "2 étapes : Phase 1 exige +10% de profit, Phase 2 exige +5%. Une fois certifié, il n'y a plus d'objectif. 1 étape : une seule phase avec +10% d'objectif, puis vous êtes certifié.",
    },
    {
      q: "Quelles sont les règles de drawdown ?",
      a: "2 étapes : perte journalière max 5% et perte totale max 10%. 1 étape : perte journalière max 3% et drawdown trailing total max 10%. Si une limite est franchie, le compte échoue.",
    },
    {
      q: "Combien de jours de trading minimum ?",
      a: "Vous devez trader sur au moins 4 jours calendaires différents pendant chaque phase. Un jour de trading est validé dès qu'au moins un trade est ouvert et fermé.",
    },
    {
      q: "Les frais sont-ils remboursés ?",
      a: "Oui. Les frais de votre challenge sont intégralement remboursés lors de votre toute première récompense depuis votre compte certifié.",
    },
    {
      q: "Quels instruments peut-on trader ?",
      a: "Vous pouvez trader tous les instruments disponibles : paires Forex, Or, Argent, Pétrole, Indices boursiers (S&P 500, NASDAQ, DAX…), Cryptomonnaies et Matières premières.",
    },
    {
      q: "Peut-on trader pendant les news ?",
      a: "Oui. Le trading sur les news est entièrement autorisé pendant les phases d'évaluation. En revanche, sur le compte certifié, le trading est interdit 5 minutes avant et 5 minutes après les publications de news majeures.",
    },
    {
      q: "Peut-on garder des positions overnight ou le weekend ?",
      a: "Oui. Vous pouvez conserver des positions ouvertes la nuit et pendant le weekend sans restriction. Le swing trading est totalement autorisé.",
    },
    {
      q: "Y a-t-il un risque maximum par trade ?",
      a: "Il n'existe pas de règle fixe sur la taille des positions. Nous surveillons activement l'activité de chaque trader et nous réservons le droit d'examiner tout compte présentant des signes de gestion du risque non viable. Risquer systématiquement une part importante de la perte journalière maximale sur une seule idée de trading sera considéré comme non viable. Nous recherchons des traders sérieux qui gèrent leur risque de façon responsable — traitez votre compte comme votre propre capital réel.",
    },
    {
      q: "Les EAs et robots de trading sont-ils autorisés ?",
      a: "Non. Les robots de trading automatisés et les Expert Advisors (EAs) sont strictement interdits sur tous les comptes Elysium — pendant le challenge comme sur le compte certifié. Seul le trading manuel est autorisé.",
    },
    {
      q: "Comment et quand est-ce que je suis payé ?",
      a: "Votre première récompense est disponible à partir du 14e jour de trading sur votre compte certifié (ou le lendemain de votre premier trade, selon ce qui arrive en dernier). Ensuite, vous pouvez demander une récompense tous les 30 jours calendaires. Les récompenses sont traitées sous 24-48h par crypto (USDT, BTC) ou virement bancaire.",
    },
    {
      q: "Quel est le partage des profits ?",
      a: "Traders certifiés 2 étapes : 80% des profits. Traders certifiés 1 étape : 90% des profits. Il n'y a aucun plafond sur les gains.",
    },
    {
      q: "Peut-on faire évoluer son compte ?",
      a: "Oui. Via notre programme de scaling, les traders certifiés réguliers peuvent faire croître leur capital jusqu'à 400 000$ d'allocation totale.",
    },
    {
      q: "Quelle plateforme de trading est utilisée ?",
      a: "Nous utilisons MetaTrader 5 via Blueberry Markets — l'un des courtiers les plus réputés au monde. Vous bénéficiez d'une exécution de qualité institutionnelle avec des spreads ultra-bas.",
    },
    {
      q: "Que se passe-t-il si j'échoue ?",
      a: "Vous pouvez acheter un nouveau challenge à tout moment. Nous proposons également un tarif de reprise réduit pour les traders qui sont passés près du succès.",
    },
  ],
};

const fallbackFaq = faqData.en;

export default function FAQ() {
  const { lang } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = (faqData as Record<string, typeof faqData.en>)[lang] || fallbackFaq;

  const title = lang === "fr" ? "Questions" : "Frequently Asked";
  const titleGold = lang === "fr" ? "Fréquentes" : "Questions";
  const label = lang === "fr" ? "Support" : "Support";

  return (
    <section id="faq" style={{ padding: "80px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span style={{ color: "#2D7DD2", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 16 }}>{label}</span>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, letterSpacing: "-1px" }}>
            {title} <span className="gold-gradient">{titleGold}</span>
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item, i) => (
            <div key={i} className="card" style={{ overflow: "hidden", cursor: "pointer" }}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px" }}>
                <span style={{ fontWeight: 600, fontSize: 15, paddingRight: 16 }}>{item.q}</span>
                <ChevronDown size={18} color="#2D7DD2" style={{ flexShrink: 0, transition: "transform 0.2s", transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)" }} />
              </div>
              {openIndex === i && (
                <div style={{ padding: "0 24px 20px", color: "#888", fontSize: 14, lineHeight: 1.7, borderTop: "1px solid #2A2A38" }}>
                  <div style={{ paddingTop: 16 }}>{item.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
