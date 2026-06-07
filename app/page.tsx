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
        <div className="hero-bg-image" style={{ position: "absolute", inset: 0, backgroundImage: "url('/hero-pc.png')", backgroundSize: "cover", backgroundPosition: "center", opacity: 1, pointerEvents: "none", zIndex: 0 }} />
        <style>{`@media (max-width: 768px) { .hero-bg-image { display: none !important; } }`}</style>
        <Hero />
        <Pricing />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 160, background: "linear-gradient(to bottom, transparent, #c8e8ff)", pointerEvents: "none", zIndex: 2 }} />
      </div>
      <TopTraders />
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url('/hero-section-bg.png')", backgroundSize: "cover", backgroundPosition: "center", opacity: 1, pointerEvents: "none", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Stats />
          <Pricing />
        </div>
      </div>
      <HowItWorks />
      <Rules />
      <FAQ />
      <Footer />
      <DisclaimerBanner />
    </main>
  );
}
