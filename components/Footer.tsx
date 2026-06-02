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
    <footer style={{ backgroundColor: "#0D1B3E", padding: "72px 24px 40px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 48, marginBottom: 64, alignItems: "start" }}>

          {/* Logo + tagline */}
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "4px", color: "#fff", textTransform: "uppercase" }}>ELYSIUM</div>
                <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: "3px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>— REWARDS —</div>
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{T.footer.tagline}</p>
          </div>

          {/* Colonnes */}
          {sections.map((sec, i) => (
            <div key={i}>
              <h4 style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 20, marginTop: 0 }}>{sec.title}</h4>
              {sec.links.map(item => (
                <a key={item.label} href={item.href}
                  style={{ display: "block", color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 12, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseOver={e => (e.currentTarget.style.color = "#fff")}
                  onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}>
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 32 }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>{T.footer.copyright}</p>
          <div style={{ display: "flex", gap: 24 }}>
            {[
              { label: T.footer.privacy, href: "/legal/privacy" },
              { label: T.footer.terms,   href: "/legal/terms" },
              { label: T.footer.risk,    href: "/legal/risk" },
            ].map(item => (
              <a key={item.label} href={item.href}
                style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textDecoration: "none", transition: "color 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, lineHeight: 1.6 }}>{T.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
