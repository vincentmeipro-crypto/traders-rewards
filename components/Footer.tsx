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
        { label: L("Les règles", "Las reglas", "Rules"), href: "/#rules" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
    {
      title: T.footer.support,
      links: [
        { label: T.footer.supportLinks[3], href: "/support" },
      ],
    },
  ];

  return (
    <footer className="home-footer" style={{ backgroundColor: "#000000", padding: "0 24px 40px", position: "relative" }}>
      {/* Trait doré champagne supérieur */}
      <div style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, #B88746 15%, #E8C98A 50%, #B88746 85%, transparent 100%)", opacity: 0.38, marginBottom: 64 }} />
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

        <section id="informations-importantes" aria-labelledby="footer-information-title" style={{ borderTop: "1px solid rgba(212,168,67,0.25)", padding: "32px 0", marginBottom: 8 }}>
          <h2 id="footer-information-title" style={{ color: "#D4A843", fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 24px", fontWeight: 700 }}>{L("Informations importantes", "Información importante", "Important information")}</h2>
          <div style={{ color: "#a8a8a8", fontSize: 13, lineHeight: 1.85 }}>
            <h3 style={{ color: "#e5e5e5", fontSize: 13, letterSpacing: "0.6px", margin: "0 0 10px" }}>{L("UN PROGRAMME EXCLUSIVEMENT SIMULÉ", "UN PROGRAMA EXCLUSIVAMENTE SIMULADO", "AN EXCLUSIVELY SIMULATED PROGRAM")}</h3>
            <p style={{ margin: "0 0 12px" }}>{L(
              "Traders Rewards propose un programme d’évaluation et de performance en trading exclusivement simulé. Les trois niveaux — CHALLENGER, COMPTE REWARD et TRADER REWARD — fonctionnent avec des capitaux virtuels. Aucune position n’est exécutée sur les marchés réels, à aucun niveau du programme.",
              "Traders Rewards ofrece un programa de evaluación y rendimiento de trading exclusivamente simulado. Los tres niveles — CHALLENGER, CUENTA REWARD y TRADER REWARD — utilizan capital virtual. No se ejecuta ninguna posición en los mercados reales, en ningún nivel del programa.",
              "Traders Rewards offers an exclusively simulated trading evaluation and performance program. All three levels — CHALLENGER, REWARD ACCOUNT and TRADER REWARD — use virtual capital. No positions are executed in real markets at any level of the program."
            )}</p>
            <p style={{ margin: "0 0 26px" }}>{L(
              "Les montants de 25 000 $, 50 000 $ et 100 000 $ représentent des soldes simulés. Ils ne constituent ni un dépôt du participant ni des fonds disponibles au retrait.",
              "Los importes de 25 000 $, 50 000 $ y 100 000 $ representan saldos simulados. No constituyen depósitos del participante ni fondos disponibles para retirar.",
              "The amounts of $25,000, $50,000 and $100,000 represent simulated balances. They are neither participant deposits nor funds available for withdrawal."
            )}</p>
            <h3 style={{ color: "#e5e5e5", fontSize: 13, letterSpacing: "0.6px", margin: "0 0 10px" }}>{L("DES REWARDS MONÉTAIRES SOUMIS À CONDITIONS", "REWARDS MONETARIOS SUJETOS A CONDICIONES", "MONETARY REWARDS SUBJECT TO CONDITIONS")}</h3>
            <p style={{ margin: "0 0 12px" }}>{L(
              "Les Rewards versés aux participants sont des paiements réels, distincts des capitaux virtuels utilisés dans le programme. Leur obtention dépend du respect des conditions applicables : règles de trading, jours qualifiants, consistance, vérification d’identité, plancher et plafond du Reward concerné.",
              "Los Rewards abonados a los participantes son pagos reales, distintos del capital virtual utilizado en el programa. Su obtención está sujeta al cumplimiento de las condiciones aplicables: reglas de trading, días válidos, consistencia, verificación de identidad, saldo mínimo que debe conservarse y límite del Reward correspondiente.",
              "Rewards paid to participants are real monetary payments, separate from the virtual capital used in the program. Eligibility depends on meeting the applicable conditions: trading rules, qualifying days, consistency, identity verification, the required account floor and the relevant Reward cap."
            )}</p>
            <p style={{ margin: 0 }}>{L(
              "L’achat d’un Challenge ne garantit ni sa validation ni l’obtention d’un Reward. Les frais du programme sont présentés avant l’achat. Les performances simulées et les témoignages ne garantissent aucun résultat futur.",
              "La compra de un Challenge no garantiza su superación ni la obtención de un Reward. Las tarifas del programa se presentan antes de la compra. Los resultados simulados y los testimonios no garantizan resultados futuros.",
              "Purchasing a Challenge does not guarantee passing it or receiving a Reward. Program fees are disclosed before purchase. Simulated performance and testimonials do not guarantee future results."
            )}</p>
          </div>
        </section>

        <div style={{ height: 1, background: "linear-gradient(90deg, transparent 0%, #B88746 15%, #E8C98A 50%, #B88746 85%, transparent 100%)", opacity: 0.28, marginBottom: 28 }} />

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

      </div>
    </footer>
  );
}
