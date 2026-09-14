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

      {/* ── Réduction du gap uniquement avant les Règles sur mobile ── */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-rules-up { margin-top: -30mm; }
        }
      `}</style>

      {/* ── Source de vérité unique : 50mm entre CHAQUE GRANDE SECTION COMPLÈTE ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "50mm" }}>

        {/* ── SECTION 1 : Hero complet — accroche + bandeau 6 avantages (interne au Hero) ── */}
        <div>
          <Hero />
          <HeroBenefits />
        </div>

        {/* ── SECTION 2 : Règles ── */}
        <div className="mobile-rules-up">
          <JourneyRulesSection />
        </div>

        {/* ── SECTION 3 : Challenges (1er placement) ── */}
        <PricingV1 />

        {/* ── SECTION 4 : Les 5 niveaux de Rewards ── */}
        <RewardLevels />

        {/* ── SECTION 5 : Environnement Trader — titre + image MT5 (une seule section) ── */}
        <div>
          <div style={{ backgroundColor: "#000000", padding: "0 24px clamp(48px, 5vw, 64px)", textAlign: "center" }}>
            <div style={{
              fontSize: 10, fontWeight: 800, color: "#D4A843",
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
              <span style={{
                background: "linear-gradient(110deg, #B88746 0%, #D6AD63 25%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>trading</span>
            </h2>
          </div>
          <section
            id="metatrader5"
            style={{ width: "100%", padding: 0, backgroundColor: "#000000", overflow: "hidden" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mt5-premium.png"
              alt="MetaTrader 5 — plateforme de trading simulé Traders Rewards"
              style={{ display: "block", width: "100%", height: "auto", objectFit: "contain" }}
            />
          </section>
        </div>

        {/* ── SECTION 6 : Cockpit Trader ── */}
        <DashboardShowcase />

        {/* ── SECTION 7 : Challenges (2e placement — conversion) ── */}
        <PricingV1 />

        {/* ── SECTION 8 : FAQ ── */}
        <FAQ />

      </div>

      <Footer />
      <DisclaimerBanner />
    </main>
  );
}
