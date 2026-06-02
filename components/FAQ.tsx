"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const faqData = {
  en: [
    { q: "How do I get started?", a: "Choose your challenge (2-Step or 1-Step), select your account size ($10K to $100K), complete payment, and receive your trading account credentials instantly by email." },
    { q: "Is there a time limit to pass the challenge?", a: "No. There is absolutely no time limit on any of our challenges. Trade at your own pace — take days, weeks, or months." },
    { q: "What are the profit targets?", a: "2-Step: Phase 1 requires +10% profit, Phase 2 requires +5% profit. 1-Step: a single phase with a +10% profit target, then you're certified." },
    { q: "What are the drawdown rules?", a: "2-Step: maximum 5% daily loss and 10% total loss. 1-Step: maximum 3% daily loss and 10% trailing total loss." },
    { q: "What is the minimum number of trading days?", a: "You must trade on at least 4 different calendar days during each phase." },
    { q: "Is my challenge fee refunded?", a: "Yes. Your challenge fee is fully refunded with your very first reward from your certified account." },
    { q: "What instruments can I trade?", a: "All available instruments: Forex pairs, Gold, Silver, Oil, Stock Indices, Cryptocurrencies, and Commodities." },
    { q: "Can I trade during news events?", a: "Yes during evaluation. On certified accounts, trading is suspended 5 minutes before and after major news releases." },
    { q: "Can I hold positions overnight or over the weekend?", a: "Yes. Swing trading is fully permitted with no restrictions." },
    { q: "How and when do I get paid?", a: "First reward available from day 14. After that, every 30 days. Processed within 24-48h via crypto or bank transfer." },
    { q: "What is the profit split?", a: "2-Step certified traders keep 80% of profits. 1-Step certified traders keep 90% of profits." },
  ],
  fr: [
    { q: "Comment démarrer ?", a: "Choisissez votre challenge (2-Step ou 1-Step), sélectionnez la taille de votre compte ($10K à $100K), effectuez le paiement et recevez vos identifiants instantanément par email." },
    { q: "Y a-t-il une limite de temps ?", a: "Non. Il n'y a absolument aucune limite de temps sur nos challenges. Tradez à votre rythme." },
    { q: "Quels sont les objectifs de profit ?", a: "2-Step : Phase 1 = +10%, Phase 2 = +5%. 1-Step : une seule phase à +10%, puis vous êtes certifié." },
    { q: "Quelles sont les règles de drawdown ?", a: "2-Step : 5% perte journalière max et 10% total. 1-Step : 3% journalier et 10% trailing total." },
    { q: "Combien de jours de trading minimum ?", a: "Au moins 4 jours calendaires différents par phase." },
    { q: "Les frais de challenge sont-ils remboursés ?", a: "Oui. Vos frais sont intégralement remboursés avec votre première récompense depuis votre compte certifié." },
    { q: "Quels instruments puis-je trader ?", a: "Tous les instruments : Forex, Or, Argent, Pétrole, Indices boursiers, Cryptomonnaies et Matières premières." },
    { q: "Peut-on trader sur les news ?", a: "Oui pendant l'évaluation. Sur les comptes certifiés, le trading est suspendu 5 minutes avant et après les publications majeures." },
    { q: "Puis-je garder des positions overnight ?", a: "Oui. Le swing trading est entièrement autorisé sans restriction." },
    { q: "Comment et quand suis-je payé ?", a: "Première récompense disponible dès le jour 14. Ensuite tous les 30 jours. Traitement sous 24-48h via crypto ou virement." },
    { q: "Quel est le partage des profits ?", a: "2-Step : 80% pour le trader. 1-Step : 90% pour le trader. Aucun plafond de gains." },
  ],
};

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const { T, lang } = useLanguage();
  const items = faqData[lang as "en" | "fr"] || faqData.en;

  return (
    <section id="faq" style={{ padding: "100px 24px", backgroundColor: "#FAFBFD" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <span className="section-label" style={{ display: "block", marginBottom: 16 }}>FAQ</span>
          <h2 style={{ fontFamily: "var(--font-cormorant)", fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 600, color: "#0D1B3E", letterSpacing: "1px" }}>
            {lang === "fr" ? "Questions fréquentes" : "Frequently Asked Questions"}
          </h2>
        </div>

        {/* Items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {items.map((item, i) => (
            <div key={i} style={{
              borderBottom: "1px solid rgba(0,0,0,0.07)",
              overflow: "hidden",
            }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: "100%", textAlign: "left",
                  background: "none", border: "none", cursor: "pointer",
                  padding: "24px 0",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  gap: 16,
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 600, color: "#0D1B3E", lineHeight: 1.4 }}>{item.q}</span>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  background: open === i ? "#0D1B3E" : "rgba(0,0,0,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
                }}>
                  <ChevronDown size={14} color={open === i ? "#fff" : "#4a5568"}
                    style={{ transform: open === i ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }} />
                </div>
              </button>
              {open === i && (
                <div style={{ paddingBottom: 24, paddingRight: 44 }}>
                  <p style={{ color: "#4a5568", fontSize: 15, lineHeight: 1.75, margin: 0 }}>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
