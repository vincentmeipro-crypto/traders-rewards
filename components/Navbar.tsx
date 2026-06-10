"use client";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { languages, Lang } from "@/lib/translations";

const FLAG_CODES: Record<string, string> = {
  en: "gb", fr: "fr", ar: "sa", es: "es", pt: "br", de: "de", tr: "tr",
};
const FlagImg = ({ code }: { code: string }) => (
  <img src={`https://flagcdn.com/20x15/${FLAG_CODES[code] ?? code}.png`}
    width={20} height={15} alt={code}
    style={{ borderRadius: 2, objectFit: "cover", display: "inline-block" }} />
);

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { lang, setLang, T } = useLanguage();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const current = languages.find(l => l.code === lang)!;

  const navLinks: [string, string][] = [
    [T.nav.challenges, "/#pricing"],
    [T.nav.howItWorks, "/#how-it-works"],
    [T.nav.rules, "/#rules"],
    [T.nav.faq, "/#faq"],
    ["Support", "/support"],
  ];

  return (
    <>
      <style>{`
        @keyframes flagFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        .flag-float-1 { animation: flagFloat 2.4s ease-in-out infinite; }
        .flag-float-2 { animation: flagFloat 2.4s ease-in-out 0.4s infinite; }
        .nav-link {
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          padding: 8px 18px;
          border-radius: 100px;
          color: #1a3a6b;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(100,160,255,0.25);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: all 0.18s;
          display: inline-block;
          box-shadow: 0 1px 4px rgba(21,101,192,0.08);
        }
        .nav-link:hover {
          background: rgba(255,255,255,0.95);
          color: #1565C0;
          border-color: rgba(21,101,192,0.35);
          box-shadow: 0 4px 16px rgba(21,101,192,0.15);
          transform: translateY(-1px);
        }
        .nav-cta {
          background: #0D1B3E;
          color: #fff !important;
          padding: 10px 24px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          text-decoration: none;
          box-shadow: 0 4px 18px rgba(27,111,255,0.35);
          transition: all 0.2s;
          display: inline-block;
        }
        .nav-cta:hover { background: #1a3a6b; transform: translateY(-1px); box-shadow: 0 6px 24px rgba(13,27,62,0.4); }
      `}</style>

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: scrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.6)",
        borderBottom: "1px solid rgba(100,160,255,0.18)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: scrolled ? "0 2px 20px rgba(21,101,192,0.12)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ width: "100%", padding: isMobile ? "0 16px" : "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: isMobile ? 80 : 72, position: "relative" }}>

          {/* GAUCHE */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: isMobile ? "0 0 auto" : undefined }}>
            {isMobile ? (
              /* Mobile gauche : logo + drapeaux + PropFirm en dessous */
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                  <img src="/traders-rewards-logo.png" alt="Traders Rewards" style={{ height: 110, width: "auto", objectFit: "contain", marginLeft: -8 }} />
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: 5, paddingLeft: 2 }}>
                  <img src="https://flagcdn.com/40x30/fr.png" alt="FR" className="flag-float-1" style={{ width: 16, height: 12, borderRadius: 2, objectFit: "cover" }} />
                  <img src="https://flagcdn.com/40x30/eu.png" alt="EU" className="flag-float-2" style={{ width: 16, height: 12, borderRadius: 2, objectFit: "cover" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#0D1B3E", letterSpacing: "0.6px", whiteSpace: "nowrap" }}>PropFirm Française</span>
                </div>
              </div>
            ) : (
              /* Desktop gauche : logo + drapeaux */
              <>
                <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                  <img src="/traders-rewards-logo.png" alt="Traders Rewards" style={{ height: 198, width: "auto", objectFit: "contain", marginLeft: -20 }} />
                </a>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <img src="https://flagcdn.com/40x30/fr.png" alt="FR" className="flag-float-1" style={{ width: 18, height: 14, borderRadius: 2, objectFit: "cover" }} />
                    <img src="https://flagcdn.com/40x30/eu.png" alt="EU" className="flag-float-2" style={{ width: 18, height: 14, borderRadius: 2, objectFit: "cover" }} />
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#0D1B3E", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>PropFirm Française</div>
                </div>
              </>
            )}
          </div>

          {/* Desktop Nav */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {navLinks.map(([label, href]) => (
                <a key={href} href={href} className="nav-link">{label}</a>
              ))}
            </div>
          )}

          {/* DROITE desktop */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <button onClick={() => setLangOpen(!langOpen)} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 6, padding: "6px 10px", cursor: "pointer",
                  color: "#4a5568", fontSize: 12, fontWeight: 600,
                }}>
                  <FlagImg code={current.code} />
                  <span>{current.code.toUpperCase()}</span>
                  <ChevronDown size={11} />
                </button>
                {langOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    backgroundColor: "#fff", border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 10, overflow: "hidden", minWidth: 160, zIndex: 200,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
                  }}>
                    {languages.map(l => (
                      <button key={l.code} onClick={() => { setLang(l.code as Lang); setLangOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          width: "100%", padding: "11px 16px", background: "none",
                          border: "none", cursor: "pointer", textAlign: "left",
                          backgroundColor: lang === l.code ? "#f0f4ff" : "transparent",
                          borderLeft: lang === l.code ? "2px solid #1B4FD8" : "2px solid transparent",
                        }}>
                        <FlagImg code={l.code} />
                        <span style={{ color: lang === l.code ? "#1B4FD8" : "#4a5568", fontSize: 13, fontWeight: 500 }}>{l.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <a href="/login" style={{ color: "#1565C0", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.3px" }}>
                {T.nav.logIn}
              </a>
              <a href="/#pricing" className="nav-cta">{T.nav.startChallenge}</a>
            </div>
          )}

          {/* DROITE mobile : menu burger seulement */}
          {isMobile && (
            <div style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
              <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "#1565C0", cursor: "pointer" }}>
                {open ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {open && (
          <div style={{ backgroundColor: "#fff", borderTop: "1px solid rgba(0,0,0,0.08)", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}
                style={{ color: "#1a2744", fontSize: 15, fontWeight: 500, textDecoration: "none" }}>{label}</a>
            ))}
            <hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "4px 0" }} />
            <a href="/login" onClick={() => setOpen(false)}
              style={{ color: "#1565C0", fontSize: 15, fontWeight: 700, textDecoration: "none" }}>{T.nav.logIn}</a>
            <hr style={{ borderColor: "rgba(0,0,0,0.08)", margin: "4px 0" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {languages.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code as Lang); setOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: lang === l.code ? "#f0f4ff" : "#f8f9fa", border: `1px solid ${lang === l.code ? "#1B4FD8" : "transparent"}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                  <FlagImg code={l.code} />
                  <span style={{ color: lang === l.code ? "#1B4FD8" : "#666", fontSize: 13 }}>{l.label}</span>
                </button>
              ))}
            </div>
            <a href="/#pricing" className="nav-cta" style={{ textAlign: "center" }} onClick={() => setOpen(false)}>{T.nav.startChallenge}</a>
          </div>
        )}
      </nav>
    </>
  );
}
