"use client";

import { useEffect, useState } from "react";
import { BarChart3, ShieldCheck, Target, Trophy } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function DashboardShowcase() {
  const { lang } = useLanguage();
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const L = (fr: string, es: string, en: string) => lang === "fr" ? fr : lang === "es" ? es : en;

  const cards = [
    { icon: <Target size={17}/>, label: L("OBJECTIF", "OBJETIVO", "TARGET"), value: "+6%", sub: L("Progression en direct", "Progreso en directo", "Live progress") },
    { icon: <ShieldCheck size={17}/>, label: "TRAILING DD EOD", value: "4%", sub: L("Plancher clairement affiché", "Suelo claramente visible", "Clear protection floor") },
    { icon: <BarChart3 size={17}/>, label: "DD EOD", value: "$2,000", sub: L("Trailing 50K", "Trailing 50K", "Trailing 50K") },
    { icon: <Trophy size={17}/>, label: "REWARD", value: "#1", sub: L("Votre prochaine étape", "Tu próximo nivel", "Your next milestone") },
  ];

  return <section id="dashboard-preview" style={{ padding: mobile ? "48px 16px" : "64px 24px", background: "#000" }}>
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: mobile ? 30 : 44 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 3, color: "#D8A39D", marginBottom: 12 }}>COCKPIT TRADER</div>
        <h2 style={{ margin: "0 0 14px", color: "#fff", fontSize: mobile ? "clamp(1.8rem, 7vw, 2.6rem)" : "clamp(2rem, 2.6vw, 3.4rem)", lineHeight: 1.05, fontWeight: 900, textTransform: "uppercase" }}>
          {L("PILOTEZ VOTRE", "CONTROLA TU", "CONTROL YOUR")} <span style={{ color: "#D8A39D" }}>{L("PROGRESSION", "PROGRESO", "PROGRESS")}</span>
        </h2>
        <p style={{ maxWidth: 620, margin: "0 auto", color: "rgba(255,255,255,.46)", fontSize: 14, lineHeight: 1.7 }}>
          {L("Retrouvez vos résultats, vos règles et votre prochain objectif dans une interface unique.", "Consulta tus resultados, reglas y próximo objetivo en una sola interfaz.", "Track your results, rules and next objective in one clear interface.")}
        </p>
      </div>

      <div style={{ border: "1px solid rgba(255,255,255,.22)", borderRadius: 22, padding: mobile ? 16 : 24, background: "linear-gradient(145deg, #151719, #080909 70%)", boxShadow: "0 30px 90px rgba(0,0,0,.7), inset 0 1px rgba(255,255,255,.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div><div style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>CHALLENGER · 50K</div><div style={{ color: "#fff", fontSize: mobile ? 20 : 25, fontWeight: 850, marginTop: 5 }}>{L("VUE D’ENSEMBLE", "RESUMEN", "OVERVIEW")}</div></div>
          <div style={{ border: "1px solid rgba(183,110,121,.35)", color: "#D8A39D", borderRadius: 999, padding: "8px 13px", fontSize: 10, fontWeight: 800, letterSpacing: 1.3 }}>{L("EN COURS", "EN CURSO", "IN PROGRESS")}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12 }}>
          {cards.map(card => <div key={card.label} style={{ minHeight: 130, border: "1px solid rgba(255,255,255,.11)", borderRadius: 15, padding: mobile ? 14 : 18, background: "rgba(255,255,255,.025)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#D8A39D", fontSize: 9, fontWeight: 800, letterSpacing: 1.4 }}>{card.icon}{card.label}</div>
            <div style={{ color: "#fff", fontSize: mobile ? 27 : 34, fontWeight: 900, margin: "16px 0 4px" }}>{card.value}</div>
            <div style={{ color: "rgba(255,255,255,.38)", fontSize: 11 }}>{card.sub}</div>
          </div>)}
        </div>
        <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.08)", marginTop: 20, overflow: "hidden" }}><div style={{ width: "68%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #777, #fff 45%, #D8A39D)" }}/></div>
      </div>
    </div>
  </section>;
}
