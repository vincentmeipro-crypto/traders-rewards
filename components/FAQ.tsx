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
      a: "Yes. Your challenge fee is fully refunded with your very first payout from your funded account. You essentially get paid to pass the challenge.",
    },
    {
      q: "What instruments can I trade?",
      a: "You can trade all available instruments: Forex pairs, Gold, Silver, Oil, Stock Indices (S&P 500, NASDAQ, DAX…), Cryptocurrencies, and Commodities.",
    },
    {
      q: "Can I trade during news events?",
      a: "Yes. News trading is fully allowed during the evaluation phases. There are no restrictions on when you can trade.",
    },
    {
      q: "Can I hold positions overnight or over the weekend?",
      a: "Yes. You may hold positions overnight and over weekends with no restrictions. Swing trading is fully permitted.",
    },
    {
      q: "Can I use Expert Advisors (EAs) or bots?",
      a: "Yes. Algorithmic trading and EAs are allowed. However, strategies must reflect legitimate trading and be replicable in real market conditions. Using the same EA across multiple accounts simultaneously may trigger a review.",
    },
    {
      q: "How and when do I get paid?",
      a: "Once funded, you can request a payout anytime from your dashboard. Payouts are processed within 24-48 hours via crypto (USDT, BTC) or bank transfer.",
    },
    {
      q: "What is the profit split?",
      a: "2-Step funded traders keep 80% of profits. 1-Step funded traders keep 90% of profits. There is no cap on how much you can earn.",
    },
    {
      q: "Can I scale my account?",
      a: "Yes. Through our scaling program, consistent funded traders can grow their capital up to $400,000 in total funding.",
    },
    {
      q: "What trading platform is used?",
      a: "We use cTrader via IC Markets — one of the world's most reputable brokers. You get institutional-grade execution with ultra-low spreads.",
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
      a: "2 étapes : Phase 1 exige +10% de profit, Phase 2 exige +5%. Une fois financé, il n'y a plus d'objectif. 1 étape : une seule phase avec +10% d'objectif, puis vous êtes financé.",
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
      a: "Oui. Les frais de votre challenge sont intégralement remboursés lors de votre tout premier retrait depuis votre compte financé.",
    },
    {
      q: "Quels instruments peut-on trader ?",
      a: "Vous pouvez trader tous les instruments disponibles : paires Forex, Or, Argent, Pétrole, Indices boursiers (S&P 500, NASDAQ, DAX…), Cryptomonnaies et Matières premières.",
    },
    {
      q: "Peut-on trader pendant les news ?",
      a: "Oui. Le trading sur les news est entièrement autorisé pendant les phases d'évaluation. Il n'y a aucune restriction sur les horaires de trading.",
    },
    {
      q: "Peut-on garder des positions overnight ou le weekend ?",
      a: "Oui. Vous pouvez conserver des positions ouvertes la nuit et pendant le weekend sans restriction. Le swing trading est totalement autorisé.",
    },
    {
      q: "Les EAs et robots de trading sont-ils autorisés ?",
      a: "Oui. Le trading algorithmique et les EAs sont autorisés. Les stratégies doivent refléter un trading légitime et être reproductibles dans des conditions de marché réelles.",
    },
    {
      q: "Comment et quand est-ce que je suis payé ?",
      a: "Une fois financé, vous pouvez demander un retrait à tout moment depuis votre tableau de bord. Les retraits sont traités sous 24-48h par crypto (USDT, BTC) ou virement bancaire.",
    },
    {
      q: "Quel est le partage des profits ?",
      a: "Traders financés 2 étapes : 80% des profits. Traders 1 étape : 90% des profits. Il n'y a aucun plafond sur les gains.",
    },
    {
      q: "Peut-on faire évoluer son compte ?",
      a: "Oui. Via notre programme de scaling, les traders financés réguliers peuvent faire croître leur capital jusqu'à 400 000$ de financement total.",
    },
    {
      q: "Quelle plateforme de trading est utilisée ?",
      a: "Nous utilisons cTrader via IC Markets — l'un des courtiers les plus réputés au monde. Vous bénéficiez d'une exécution de qualité institutionnelle avec des spreads ultra-bas.",
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
          <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", display: "block", marginBottom: 16 }}>{label}</span>
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
                <ChevronDown size={18} color="#C9A84C" style={{ flexShrink: 0, transition: "transform 0.2s", transform: openIndex === i ? "rotate(180deg)" : "rotate(0deg)" }} />
              </div>
              {openIndex === i && (
                <div style={{ padding: "0 24px 20px", color: "#888", fontSize: 14, lineHeight: 1.7, borderTop: "1px solid #1a1a1a" }}>
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
