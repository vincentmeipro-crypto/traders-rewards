"use client";
import Image from "next/image";
import { useLanguage } from "@/lib/LanguageContext";

export default function Hero() {
  const { T } = useLanguage();
  return (
    <section style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>

      {/* Image de fond */}
      <Image
        src="/IMAGE HERO.png"
        alt="Elysium Funded"
        fill
        priority
        style={{ objectFit: "cover", objectPosition: "35% top" }}
      />

      {/* Gradient overlay pour lisibilité */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(7,7,7,0.1) 0%, rgba(7,7,7,0.2) 40%, rgba(7,7,7,0.75) 65%, rgba(7,7,7,0.97) 85%, #070707 100%)"
      }} />

      {/* Contenu centré sous le logo de l'image */}
      <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "max-content" }}>

        {/* Boutons */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <a href="#pricing" className="btn-primary" style={{ fontSize: 14, padding: "16px 40px" }}>{T.hero.cta1}</a>
          <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 14, padding: "16px 40px" }}>{T.hero.cta2}</a>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 0, borderTop: "1px solid rgba(201,168,76,0.15)", paddingTop: 16 }}>
          {[
            { label: T.hero.maxFunding, value: "$400K" },
            { label: T.hero.profitSplit, value: "Up to 90%" },
            { label: T.hero.feeRefunded, value: "1st Payout" },
          ].map((item, i) => (
            <div key={item.label} style={{
              backgroundColor: "rgba(201,168,76,0.06)",
              border: "1px solid rgba(201,168,76,0.2)",
              borderLeft: i === 0 ? "1px solid rgba(201,168,76,0.2)" : "none",
              backdropFilter: "blur(12px)",
              padding: "12px 40px", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#C9A84C" }}>{item.value}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
