import Navbar from "@/components/Navbar";
import PromoBanner from "@/components/PromoBanner";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import TopTraders from "@/components/TopTraders";
import Rules from "@/components/Rules";
import Scaling from "@/components/Scaling";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh" }}>
      <PromoBanner />
      <Navbar />
      <Hero />
      <Stats />
      <TopTraders />
      <HowItWorks />
      <Pricing />
      <Rules />
      <Scaling />
      <FAQ />
      <Footer />
      <DisclaimerBanner />
    </main>
  );
}
