"use client";
import Image from "next/image";
import { useLanguage } from "@/lib/LanguageContext";

export default function Hero() {
  const { T } = useLanguage();
  return (
    <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "80px 24px 60px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%, -50%)", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 800, position: "relative", zIndex: 1, marginTop: 20 }}>

        {/* Logo + slogan centrés */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 36 }}>
          <span style={{ fontSize: "clamp(1.1rem, 3vw, 1.5rem)", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#C9A84C" }}>
            La Prop Firm Élite
          </span>
          <Image
            src="/logo.jpg"
            alt="Elysium Funded"
            width={90}
            height={90}
            priority
            style={{ objectFit: "contain", mixBlendMode: "screen", filter: "contrast(2) brightness(1.3)" }}
          />
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 100, padding: "8px 20px", marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#C9A84C", display: "inline-block" }} />
          <span style={{ color: "#C9A84C", fontSize: 13, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>{T.hero.badge}</span>
        </div>

        <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5.2rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2px", marginBottom: 24 }}>
          {T.hero.headline1}<br />
          <span className="gold-gradient">{T.hero.headline2}</span>
        </h1>

        <p style={{ color: "#A0A0A0", fontSize: "clamp(1rem, 2.5vw, 1.2rem)", lineHeight: 1.7, maxWidth: 600, margin: "0 auto 40px" }}
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

        <p style={{ marginTop: 32, color: "#555", fontSize: 13 }}>
          {T.hero.trust.split("·").map((part, i) => (
            <span key={i}>{i > 0 && " · "}<span style={i === 0 ? { color: "#C9A84C" } : {}}>{part.trim()}</span></span>
          ))}
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 48, flexWrap: "wrap" }}>
          {[
            { label: T.hero.maxFunding, value: "$400K" },
            { label: T.hero.profitSplit, value: "Up to 90%" },
            { label: T.hero.feeRefunded, value: "1st Payout" },
          ].map(item => (
            <div key={item.label} style={{ backgroundColor: "#141414", border: "1px solid #222", borderRadius: 12, padding: "16px 28px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#C9A84C" }}>{item.value}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
