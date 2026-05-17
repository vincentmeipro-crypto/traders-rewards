"use client";
import { useLanguage } from "@/lib/LanguageContext";

export default function Footer() {
  const { T } = useLanguage();
  const sections = [
    { title: T.footer.challenges, links: T.footer.challengeLinks },
    { title: T.footer.company,    links: T.footer.companyLinks },
    { title: T.footer.support,    links: T.footer.supportLinks },
  ];

  return (
    <footer style={{ borderTop: "1px solid #2A2A38", padding: "60px 24px 40px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 48, marginBottom: 60 }}>

          <div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: "2px", textTransform: "uppercase" }}>
                Elysium
              </span>
            </div>
            <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, maxWidth: 260 }}>{T.footer.tagline}</p>
          </div>

          {sections.map((sec, i) => (
            <div key={i}>
              <h4 style={{ color: "#888", fontSize: 12, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 20 }}>{sec.title}</h4>
              {sec.links.map(item => (
                <a key={item} href="#" style={{ display: "block", color: "#555", fontSize: 14, marginBottom: 12, textDecoration: "none", transition: "color 0.2s" }}
                  onMouseOver={e => (e.currentTarget.style.color = "#2D7DD2")}
                  onMouseOut={e => (e.currentTarget.style.color = "#555")}>
                  {item}
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
                onMouseOver={e => (e.currentTarget.style.color = "#2D7DD2")}
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
