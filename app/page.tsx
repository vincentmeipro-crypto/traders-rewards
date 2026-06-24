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
import InstallPWA from "@/components/InstallPWA";
import Footer from "@/components/Footer";
import PromoPopup from "@/components/PromoPopup";
import PromoBanner from "@/components/PromoBanner";

export default function Home() {
  return (
    <main className="page-main" style={{ minHeight: "100vh" }}>
      <PromoBanner />
      <Navbar />
      <Hero />
      <Pricing />
      <TopTraders />
      <Stats />
      <TraderMarquee />
      <section style={{ width: "100%", lineHeight: 0, position: "relative", backgroundColor: "#0A0A0A" }}>
        <img src="/image-section-mt5.png" alt="MT5" className="mt5-section-img" />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #0A0A0A 0%, transparent 12%, transparent 88%, #0A0A0A 100%)", pointerEvents: "none" }} />
      </section>
      <Pricing />
      <HowItWorks />
      <Rules />
      <FAQ />
      <InstallPWA />
      <Footer />
      <DisclaimerBanner />
      <PromoPopup />
    </main>
  );
}
