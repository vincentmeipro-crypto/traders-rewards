import Navbar from "@/components/Navbar";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import TopTraders from "@/components/TopTraders";
import TraderMarquee from "@/components/TraderMarquee";
import Rules from "@/components/Rules";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import PromoPopup from "@/components/PromoPopup";
import PromoBanner from "@/components/PromoBanner";

export default function Home() {
  return (
    <main className="page-main" style={{ minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 768px) {
          .page-main { background: linear-gradient(135deg, #e8f4ff 0%, #c5e0ff 30%, #a8d4ff 60%, #c8e8ff 100%); }
          .stats-bg-image { display: none !important; }
          .stats-section { background: #fff !important; }
        }
      `}</style>
      <PromoBanner />
      <Navbar />
      <div style={{ position: "relative", background: "linear-gradient(135deg, #e8f4ff 0%, #c5e0ff 30%, #a8d4ff 60%, #c8e8ff 100%)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/hero-section-bg.png')", backgroundSize: "cover", backgroundPosition: "center", opacity: 1, pointerEvents: "none", zIndex: 0 }} />
        <Hero />
        <Pricing />
      </div>
      <TopTraders />
      <div className="stats-section" style={{ position: "relative" }}>
        <div className="stats-bg-image" style={{ position: "absolute", inset: 0, backgroundImage: "url('/hero-section-bg.png')", backgroundSize: "cover", backgroundPosition: "center", opacity: 1, pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Stats />
          <TraderMarquee />
          <Pricing />
        </div>
      </div>
      <HowItWorks />
      <Rules />
      <FAQ />
      <Footer />
      <DisclaimerBanner />
      <PromoPopup />
    </main>
  );
}
