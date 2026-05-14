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
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", maxWidth: 820, padding: "0 24px 80px", width: "100%" }}>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 100, padding: "8px 20px", marginBottom: 28 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#C9A84C", display: "inline-block" }} />
          <span style={{ color: "#C9A84C", fontSize: 13, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>{T.hero.badge}</span>
        </div>

        <h1 style={{ fontSize: "clamp(2.6rem, 6.5vw, 5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", marginBottom: 20, textShadow: "0 2px 20px rgba(0,0,0,0.8)" }}>
          {T.hero.headline1}<br />
          <span className="gold-gradient">{T.hero.headline2}</span>
        </h1>

        <p style={{ color: "#C8C8C8", fontSize: "clamp(1rem, 2.2vw, 1.15rem)", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 36px", textShadow: "0 1px 10px rgba(0,0,0,0.9)" }}
          dangerouslySetInnerHTML={{ __html: T.hero.sub
            .replace("$400,000", '<span style="color:#C9A84C;font-weight:600">$400,000</span>')
            .replace("400.000$", '<span style="color:#C9A84C;font-weight:600">400.000$</span>')
            .replace("400 000$", '<span style="color:#C9A84C;font-weight:600">400 000$</span>')
            .replace("90%", '<span style="color:#C9A84C;font-weight:600">90%</span>')
            .replace("%90", '<span style="color:#C9A84C;font-weight:600">%90</span>')
          }}
        />

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#pricing" className="btn-primary" style={{ fontSize: 14, padding: "16px 40px" }}>{T.hero.cta1}</a>
          <a href="#how-it-works" className="btn-secondary" style={{ fontSize: 14, padding: "16px 40px" }}>{T.hero.cta2}</a>
        </div>

        <p style={{ marginTop: 28, color: "#777", fontSize: 13, textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
          {T.hero.trust.split("·").map((part, i) => (
            <span key={i}>{i > 0 && " · "}<span style={i === 0 ? { color: "#C9A84C" } : {}}>{part.trim()}</span></span>
          ))}
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
          {[
            { label: T.hero.maxFunding, value: "$400K" },
            { label: T.hero.profitSplit, value: "Up to 90%" },
            { label: T.hero.feeRefunded, value: "1st Payout" },
          ].map(item => (
            <div key={item.label} style={{
              backgroundColor: "rgba(201,168,76,0.06)",
              border: "1px solid rgba(201,168,76,0.25)",
              backdropFilter: "blur(12px)",
              borderRadius: 12, padding: "16px 28px", textAlign: "center"
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#C9A84C" }}>{item.value}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
