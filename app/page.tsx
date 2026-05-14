import Navbar from "@/components/Navbar";
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
    <main style={{ backgroundColor: "#070707", minHeight: "100vh" }}>
      <Navbar />
      <Hero />
      <Stats />
      <HowItWorks />
      <Pricing />
      <TopTraders />
      <Rules />
      <FAQ />
      <Footer />
    </main>
  );
}
