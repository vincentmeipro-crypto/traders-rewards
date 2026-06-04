import Navbar from "@/components/Navbar";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import TopTraders from "@/components/TopTraders";
import Rules from "@/components/Rules";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh" }}>
<Navbar />
      <div style={{ position: "relative", background: "linear-gradient(135deg, #e8f4ff 0%, #c5e0ff 30%, #a8d4ff 60%, #c8e8ff 100%)" }}>
        <div className="hero-bg-image" style={{ position: "absolute", inset: 0, backgroundImage: "url('/FEMME-TRADER2.png')", backgroundSize: "cover", backgroundPosition: "right center", opacity: 0.55, pointerEvents: "none", zIndex: 0 }} />
        <style>{`@media (max-width: 768px) { .hero-bg-image { transform: scaleX(-1) !important; background-position: left center !important; opacity: 0.3 !important; } }`}</style>
        <Hero />
        <Pricing />
      </div>
      <TopTraders />
      <Stats />
      <Pricing />
      <HowItWorks />
      <Rules />
      <FAQ />
      <Footer />
      <DisclaimerBanner />
    </main>
  );
}
