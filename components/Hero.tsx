"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";

export default function Hero() {
  const { T } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  if (isMobile) {
    return (
      <section style={{ height: "100svh", width: "100%", position: "relative", overflow: "hidden" }}>

        {/* Image plein écran */}
        <Image
          src="/hero-mobile-new.png"
          alt="Elysium Funded"
          fill
          priority
          style={{ objectFit: "cover", objectPosition: "center top" }}
        />

        {/* Gradient sombre en bas pour lisibilité */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(7,7,7,0) 40%, rgba(7,7,7,0.7) 70%, rgba(7,7,7,0.95) 100%)"
        }} />

        {/* CTA collé tout en bas */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2,
          padding: "0 16px 28px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <a href="#pricing" className="btn-primary btn-primary-animated"
            style={{ display: "block", textAlign: "center", fontSize: 16, padding: "18px", letterSpacing: "1px", borderRadius: 12 }}>
            {T.hero.cta1}
          </a>
          <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(201,168,76,0.2)", backgroundColor: "rgba(7,7,7,0.5)" }}>
            {[
              { label: T.hero.maxFunding, value: "$400K" },
              { label: T.hero.profitSplit, value: "90%" },
              { label: T.hero.feeRefunded, value: "1st Payout" },
            ].map((item, i) => (
              <div key={item.label} style={{
                flex: 1, textAlign: "center", padding: "10px 0",
                borderRight: i < 2 ? "1px solid rgba(201,168,76,0.2)" : "none",
              }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#C9A84C" }}>{item.value}</div>
                <div style={{ fontSize: 9, color: "#888", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>

      {/* Image de fond */}
      <Image
        src="/hero-pc2.png"
        alt="Elysium Funded"
        fill
        priority
        style={{ objectFit: "contain", objectPosition: "center 60px" }}
      />

      {/* Gradient overlay pour lisibilité */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(7,7,7,0) 0%, rgba(7,7,7,0) 60%, rgba(7,7,7,0.7) 85%, #070707 100%)"
      }} />

      {/* Contenu bas desktop */}
      <div style={{ position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)", zIndex: 2, display: "flex", alignItems: "stretch", gap: 0, width: "max-content" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", paddingRight: 24 }}>
          <a href="#pricing" className="btn-primary btn-primary-animated" style={{ fontSize: 13, padding: "14px 28px", whiteSpace: "nowrap" }}>{T.hero.cta1}</a>
          <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 13, padding: "14px 28px", whiteSpace: "nowrap" }}>{T.hero.cta2}</a>
        </div>
        <div style={{ width: 1, backgroundColor: "rgba(201,168,76,0.3)", margin: "8px 0" }} />
        {[
          { label: T.hero.maxFunding, value: "$400K" },
          { label: T.hero.profitSplit, value: "Up to 90%" },
          { label: T.hero.feeRefunded, value: "1st Payout" },
        ].map((item) => (
          <div key={item.label} style={{ padding: "12px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#C9A84C", whiteSpace: "nowrap" }}>{item.value}</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
