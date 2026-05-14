"use client";
import Image from "next/image";
import { useLanguage } from "@/lib/LanguageContext";

export default function Hero() {
  const { T } = useLanguage();
  return (
    <section style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>

      {/* Image de fond */}
      <Image
        src="/IMAGE HERO2.png"
        alt="Elysium Funded"
        fill
        priority
        style={{ objectFit: "contain", objectPosition: "center center" }}
      />

      {/* Gradient overlay pour lisibilité */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(7,7,7,0) 0%, rgba(7,7,7,0) 60%, rgba(7,7,7,0.7) 85%, #070707 100%)"
      }} />

      {/* Contenu : une seule ligne centrée */}
      <div style={{ position: "absolute", bottom: 120, left: "50%", transform: "translateX(-50%)", zIndex: 2, display: "flex", alignItems: "stretch", gap: 0, width: "max-content" }}>

        {/* Boutons */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", paddingRight: 24, marginRight: 0 }}>
          <a href="#pricing" className="btn-primary" style={{ fontSize: 13, padding: "14px 28px", whiteSpace: "nowrap" }}>{T.hero.cta1}</a>
          <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 13, padding: "14px 28px", whiteSpace: "nowrap" }}>{T.hero.cta2}</a>
        </div>

        {/* Séparateur */}
        <div style={{ width: 1, backgroundColor: "rgba(201,168,76,0.3)", margin: "8px 0" }} />

        {/* Stats */}
        {[
          { label: T.hero.maxFunding, value: "$400K" },
          { label: T.hero.profitSplit, value: "Up to 90%" },
          { label: T.hero.feeRefunded, value: "1st Payout" },
        ].map((item, i) => (
          <div key={item.label} style={{ padding: "12px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#C9A84C", whiteSpace: "nowrap" }}>{item.value}</div>
            <div style={{ fontSize: 10, color: "#888", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
