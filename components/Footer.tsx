"use client";
import { useLanguage } from "@/lib/LanguageContext";

export default function Footer() {
  const { T } = useLanguage();

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
        { label: T.footer.supportLinks[3], href: "mailto:support@elysium-rewards.com" },
      ],
    },
  ];

  return (
    <footer style={{ borderTop: "1px solid #2A2A38", padding: "60px 24px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Logo seul en haut */}
        <div style={{ marginBottom: 32 }}>
          <img src="/logo-elysium-rewards.png" alt="Elysium Rewards" style={{ height: 80, width: "auto", objectFit: "contain" }} />
        </div>

        {/* Tagline + colonnes alignés sur la même ligne */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 60, alignItems: "start" }}>

          <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, maxWidth: 280, margin: 0 }}>{T.footer.tagline}</p>

          {sections.map((sec, i) => (
            <div key={i}>
              <h4 style={{ color: "#888", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 20, marginTop: 0 }}>{sec.title}</h4>
              {sec.links.map(item => (
                <a key={item.label} href={item.href} target={(item as any).target} rel={(item as any).target === "_blank" ? "noopener noreferrer" : undefined}
                  style={{ display: "block", color: "#555", fontSize: 14, marginBottom: 12, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseOver={e => (e.currentTarget.style.color = "#00C2FF")}
                  onMouseOut={e => (e.currentTarget.style.color = "#555")}>
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="divider-gold" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 32, flexWrap: "wrap", gap: 16 }}>
          <p style={{ color: "#444", fontSize: 13 }}>{T.footer.copyright}</p>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { label: T.footer.privacy, href: "/legal/privacy" },
              { label: T.footer.terms,   href: "/legal/terms" },
              { label: T.footer.risk,    href: "/legal/risk" },
            ].map(item => (
              <a key={item.label} href={item.href} style={{ color: "#444", fontSize: 13, textDecoration: "none" }}
                onMouseOver={e => (e.currentTarget.style.color = "#00C2FF")}
                onMouseOut={e => (e.currentTarget.style.color = "#444")}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <p style={{ color: "#333", fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>{T.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
