"use client";
import { useLanguage } from "@/lib/LanguageContext";
import { useState, useEffect } from "react";

export default function Footer() {
  const { T, lang } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const L = (fr: string, es: string, en: string) => lang === "fr" ? fr : lang === "es" ? es : en;
  const sections = [
    {
      title: L("CHALLENGES", "CHALLENGES", "CHALLENGES"),
      links: [
        { label: L("Challenge 25K", "Challenge 25K", "25K Challenge"), href: "/#pricing" },
        { label: L("Challenge 50K", "Challenge 50K", "50K Challenge"), href: "/#pricing" },
        { label: L("Challenge 100K", "Challenge 100K", "100K Challenge"), href: "/#pricing" },
      ],
    },
    {
      title: L("PARCOURS", "RECORRIDO", "JOURNEY"),
      links: [
        { label: L("De Challenger à Trader Reward", "De Challenger a Trader Reward", "From Challenger to Trader Reward"), href: "/#parcours-3-niveaux" },
        { label: L("Les règles", "Las reglas", "Rules"), href: "/#faq" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
    {
      title: T.footer.support,
      links: [
        { label: T.footer.supportLinks[3], href: "mailto:contact@traders-rewards.eu" },
      ],
    },
  ];

  return (
    <footer className="home-footer" style={{ backgroundColor: "#050505", padding: "64px 24px 40px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="home-footer-shell" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ maxWidth: 860, margin: "0 auto 48px", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: "3.5px", color: "#FFFFFF", textTransform: "uppercase", marginBottom: 16 }}>TRADERS REWARDS</div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: isMobile ? 12 : 14, lineHeight: 1.75, margin: 0 }}>
            {L(
              "Traders Rewards est un programme éducatif de trading entièrement simulé, conçu pour apprendre, progresser et être récompensé dans un environnement démonstratif. Aucun argent n’est investi sur les marchés financiers réels.",
              "Traders Rewards es un programa educativo de trading totalmente simulado, diseñado para aprender, progresar y recibir recompensas en un entorno demostrativo. No se invierte dinero en los mercados financieros reales.",
              "Traders Rewards is a fully simulated educational trading program designed to help people learn, progress and earn rewards in a demonstration environment. No money is invested in real financial markets."
            )}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: isMobile ? 30 : 64, marginBottom: 48, alignItems: "start", textAlign: isMobile ? "center" : "left" }}>
          {sections.map((sec, i) => (
            <div key={i}>
              <h4 style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 20, marginTop: 0 }}>{sec.title}</h4>
              {sec.links.map(item => (
                <a key={item.label} href={item.href}
                  style={{ display: "block", color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 12, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseOver={e => (e.currentTarget.style.color = "#FFFFFF")}
                  onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}>
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 28 }} />

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 16, marginBottom: 20 }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>{T.footer.copyright}</p>
          <div style={{ display: "flex", gap: isMobile ? 16 : 24, flexWrap: "wrap" }}>
            {[
              { label: T.footer.privacy, href: "/legal/privacy" },
              { label: T.footer.terms,   href: "/legal/terms" },
              { label: T.footer.risk,    href: "/legal/risk" },
            ].map(item => (
              <a key={item.label} href={item.href}
                style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textDecoration: "none", transition: "color 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, lineHeight: 1.6 }}>{T.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
