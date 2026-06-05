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
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          padding: 7px 16px;
          border-radius: 100px;
          background: linear-gradient(160deg, rgba(100,160,255,0.25) 0%, rgba(21,101,192,0.35) 50%, rgba(10,60,140,0.4) 100%);
          box-shadow: 0 2px 12px rgba(21,101,192,0.15), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,50,0.1);
          border: 1px solid rgba(255,255,255,0.45);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #0D1B3E;
          position: relative;
          overflow: hidden;
          transition: transform 0.18s, box-shadow 0.18s;
          display: inline-block;
        }
        .nav-link::before {
          content: "";
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 45%;
          background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
          border-radius: 0 0 100px 100px;
          pointer-events: none;
        }
        .nav-link:hover {
          transform: translateY(-2px) scale(1.04);
          background: linear-gradient(160deg, rgba(100,160,255,0.4) 0%, rgba(21,101,192,0.5) 50%, rgba(10,60,140,0.55) 100%);
          box-shadow: 0 6px 20px rgba(21,101,192,0.25), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(0,0,50,0.1);
          color: #0D1B3E;
        }
        .nav-cta {
          background: #0D1B3E;
          color: #fff !important;
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
        }
        .nav-cta:hover { background: #1B4FD8; transform: translateY(-1px); }
      `}</style>

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: scrolled ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.45)",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.3)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: scrolled ? "0 4px 24px rgba(21,101,192,0.1)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ width: "100%", padding: "0 32px 0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72, position: "relative" }}>

          {/* Logo + PropFirm badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <img src="/nouveau-logo.png" alt="Elysium Rewards" style={{ height: 48, width: "auto" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "5px", color: "#0D1B3E", textTransform: "uppercase", lineHeight: 1 }}>ELYSIUM</span>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "3px", color: "#8a96aa", textTransform: "uppercase", lineHeight: 1.4 }}>— REWARDS —</span>
              </div>
            </a>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, paddingTop: 2 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <img src="https://flagcdn.com/40x30/fr.png" alt="FR" className="flag-float-1" style={{ width: 18, height: 14, borderRadius: 2, objectFit: "cover" }} />
                <img src="https://flagcdn.com/40x30/eu.png" alt="EU" className="flag-float-2" style={{ width: 18, height: 14, borderRadius: 2, objectFit: "cover" }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0D1B3E", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>PropFirm Française</div>
            </div>
          </div>

          {/* Desktop Nav */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {navLinks.map(([label, href]) => (
                <a key={href} href={href} className="nav-link">{label}</a>
              ))}
            </div>
          )}

          {/* Droite */}
          {!isMobile && (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {/* Langue */}
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

              <a href="/login" style={{ color: "#1a2744", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.3px" }}>
                {T.nav.logIn}
              </a>
              <a href="/#pricing" className="nav-cta">{T.nav.startChallenge}</a>
            </div>
          )}

          {/* Mobile */}
          {isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a href="/login" style={{ color: "#1B4FD8", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>{T.nav.logIn}</a>
              <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "#0D1B3E", cursor: "pointer" }}>
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
