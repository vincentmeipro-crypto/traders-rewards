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
        style={{ objectFit: "cover", objectPosition: "center top" }}
      />

      {/* Gradient overlay pour lisibilité */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(7,7,7,0.1) 0%, rgba(7,7,7,0.2) 40%, rgba(7,7,7,0.75) 65%, rgba(7,7,7,0.97) 85%, #070707 100%)"
      }} />

      {/* Contenu */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", padding: "0 48px 80px" }}>

        {/* Titre */}
        <h1 style={{ fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-3px", marginBottom: 36, textShadow: "0 2px 20px rgba(0,0,0,0.8)", textAlign: "left" }}>
          {T.hero.headline1}<br />
          <span className="gold-gradient">{T.hero.headline2}</span>
        </h1>

        {/* Ligne 1 : description + boutons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, marginBottom: 20, flexWrap: "wrap" }}>
          <p style={{ color: "#C8C8C8", fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)", lineHeight: 1.7, maxWidth: 520, textShadow: "0 1px 10px rgba(0,0,0,0.9)", margin: 0 }}
            dangerouslySetInnerHTML={{ __html: T.hero.sub
              .replace("$400,000", '<span style="color:#C9A84C;font-weight:600">$400,000</span>')
              .replace("400.000$", '<span style="color:#C9A84C;font-weight:600">400.000$</span>')
              .replace("400 000$", '<span style="color:#C9A84C;font-weight:600">400 000$</span>')
              .replace("90%", '<span style="color:#C9A84C;font-weight:600">90%</span>')
              .replace("%90", '<span style="color:#C9A84C;font-weight:600">%90</span>')
            }}
          />
          <div style={{ display: "flex", gap: 16, flexShrink: 0, flexWrap: "wrap" }}>
            <a href="#pricing" className="btn-primary" style={{ fontSize: 14, padding: "16px 40px" }}>{T.hero.cta1}</a>
            <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 14, padding: "16px 40px" }}>{T.hero.cta2}</a>
          </div>
        </div>

        {/* Ligne 2 : trust + stats sur toute la largeur */}
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, width: "100%", borderTop: "1px solid rgba(201,168,76,0.15)", paddingTop: 20 }}>
          <p style={{ color: "#777", fontSize: 13, textShadow: "0 1px 6px rgba(0,0,0,0.8)", margin: 0, flex: 1, display: "flex", alignItems: "center" }}>
            {T.hero.trust.split("·").map((part, i) => (
              <span key={i}>{i > 0 && " · "}<span style={i === 0 ? { color: "#C9A84C" } : {}}>{part.trim()}</span></span>
            ))}
          </p>
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
              padding: "14px 36px", textAlign: "center", flex: 1,
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#C9A84C" }}>{item.value}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
