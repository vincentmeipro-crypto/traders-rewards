"use client";
import { useLanguage } from "@/lib/LanguageContext";
import { useState, useEffect } from "react";
import Image from "next/image";

export default function Footer() {
  const { T } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sections = [
    {
      title: T.footer.challenges,
      links: [
        { label: T.footer.challengeLinks[0], href: "/#pricing" },
        { label: T.footer.challengeLinks[1], href: "/#pricing" },
        { label: T.footer.challengeLinks[2], href: "/#pricing" },
      ],
    },
    {
      title: T.footer.company,
      links: [
        { label: T.footer.companyLinks[0], href: "/#how-it-works" },
        { label: T.footer.companyLinks[1], href: "/#rules" },
        { label: T.footer.companyLinks[2], href: "/#faq" },
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
    <footer style={{ backgroundColor: "#f0f7ff", padding: "72px 24px 40px", borderTop: "1px solid rgba(21,101,192,0.12)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1.6fr 1fr 1fr 1fr", gap: isMobile ? 32 : 48, marginBottom: 64, alignItems: "start" }}>

          {/* Logo + tagline */}
          <div style={{ gridColumn: isMobile ? "1 / -1" : "auto" }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "4px", color: "#1565C0", textTransform: "uppercase" }}>TRADERS REWARDS</div>
              </div>
            </div>
            <p style={{ color: "rgba(21,101,192,0.55)", fontSize: 14, lineHeight: 1.7, margin: "0 0 20px 0" }}>{T.footer.tagline}</p>
          </div>

          {/* Colonnes */}
          {sections.map((sec, i) => (
            <div key={i}>
              <h4 style={{ color: "rgba(21,101,192,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 20, marginTop: 0 }}>{sec.title}</h4>
              {sec.links.map(item => (
                <a key={item.label} href={item.href}
                  style={{ display: "block", color: "rgba(21,101,192,0.7)", fontSize: 14, marginBottom: 12, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseOver={e => (e.currentTarget.style.color = "#1565C0")}
                  onMouseOut={e => (e.currentTarget.style.color = "rgba(21,101,192,0.7)")}>
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(21,101,192,0.12)", marginBottom: 32 }} />

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: 16, marginBottom: 20 }}>
          <p style={{ color: "rgba(21,101,192,0.4)", fontSize: 13 }}>{T.footer.copyright}</p>
          <div style={{ display: "flex", gap: isMobile ? 16 : 24, flexWrap: "wrap" }}>
            {[
              { label: T.footer.privacy, href: "/legal/privacy" },
              { label: T.footer.terms,   href: "/legal/terms" },
              { label: T.footer.risk,    href: "/legal/risk" },
            ].map(item => (
              <a key={item.label} href={item.href}
                style={{ color: "rgba(21,101,192,0.4)", fontSize: 13, textDecoration: "none", transition: "color 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#1565C0")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(21,101,192,0.4)")}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <p style={{ color: "rgba(21,101,192,0.3)", fontSize: 12, lineHeight: 1.6 }}>{T.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
