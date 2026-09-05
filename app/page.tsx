import Navbar            from "@/components/Navbar";
import DisclaimerBanner  from "@/components/DisclaimerBanner";
import Hero              from "@/components/Hero";
import HeroBenefits      from "@/components/HeroBenefits";
import PricingV1         from "@/components/PricingV1";
import JourneyRulesSection from "@/components/JourneyRulesSection";
import RewardLevels      from "@/components/RewardLevels";
import DashboardShowcase  from "@/components/DashboardShowcase";
import FAQ               from "@/components/FAQ";
import Footer            from "@/components/Footer";

export default function Home() {
  return (
    <main className="page-main" style={{ minHeight: "100vh", background: "#000000" }}>
      <Navbar />

      {/* ── Accroche V1 ── */}
      <Hero />

      {/* ── Principaux avantages — bandeau directement sous le Hero ── */}
      <HeroBenefits />

      {/* ── Offre principale — 3 challenges V1 ── */}
      <PricingV1 />

      {/* ── Parcours + Règles — sélecteur 25K/50K/100K synchronisé ── */}
      <JourneyRulesSection />

      {/* ── Les 5 niveaux de Rewards ── */}
      <RewardLevels />

      {/* ── Titre de transition : Environnement Trader ── */}
      <div style={{ backgroundColor: "#000000", padding: "clamp(48px, 5vw, 64px) 24px", textAlign: "center" }}>
        <div style={{
          fontSize: 10, fontWeight: 800, color: "#D8A39D",
          letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12,
        }}>
          ENVIRONNEMENT TRADER
        </div>
        <h2 style={{
          fontSize: "clamp(2.1rem, 3.5vw, 3.5rem)",
          fontWeight: 900, color: "#FFFFFF",
          textTransform: "uppercase",
          letterSpacing: "0.5px", lineHeight: 1.05, margin: "0 0 12px",
          textWrap: "balance",
        } as React.CSSProperties}>
          Votre environnement de{" "}
          <span style={{ color: "#FFFFFF" }}>trading</span>
        </h2>
      </div>

      {/* ── Plateforme de trading : MetaTrader 5 ── */}
      <section
        id="metatrader5"
        style={{ width: "100%", padding: "0 24px 64px", backgroundColor: "#000000", overflow: "hidden" }}
      >
        <div style={{
          width: "100%", maxWidth: 1500, maxHeight: 650, margin: "0 auto",
          border: "1px solid rgba(255,255,255,0.22)", borderRadius: 22,
          overflow: "hidden", lineHeight: 0,
          background: "#000000",
          boxShadow: "0 28px 80px rgba(0,0,0,.65), inset 0 1px rgba(255,255,255,.08)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/NEW-MT5-SEUL.png"
            alt="MetaTrader 5 — plateforme de trading simulé Traders Rewards"
            style={{ width: "100%", height: "auto", maxHeight: 650, objectFit: "contain", display: "block", backgroundColor: "#000000" }}
          />
        </div>
      </section>

      {/* ── Aperçu du cockpit trader ── */}
      <DashboardShowcase />

      {/* ── Pricing répété (conversion) ── */}
      <PricingV1 />

      {/* ── FAQ V1 — 14 questions ── */}
      <FAQ />

      <Footer />
      <DisclaimerBanner />
    </main>
  );
}
