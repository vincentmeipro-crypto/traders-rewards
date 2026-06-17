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
      <div style={{ background: "#ffffff" }}>
        <Hero />
        <Pricing />
      </div>
      <TopTraders />
      <div style={{ background: "#ffffff" }}>
        <Stats />
        <TraderMarquee />
        <Pricing />
      </div>
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
