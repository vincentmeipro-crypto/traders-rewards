"use client";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import Image from "next/image";
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
  const { lang, setLang, T } = useLanguage();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const current = languages.find(l => l.code === lang)!;

  return (
    <>
      <style>{`
        @keyframes flagFloat {
          0%, 100% { transform: translateY(0px) translateZ(0); }
          50% { transform: translateY(-4px) translateZ(0); }
        }
        .flag-float-1 { animation: flagFloat 2.8s ease-in-out infinite; will-change: transform; backface-visibility: hidden; -webkit-backface-visibility: hidden; image-rendering: -webkit-optimize-contrast; }
        .flag-float-2 { animation: flagFloat 2.8s ease-in-out infinite 0.4s; will-change: transform; backface-visibility: hidden; -webkit-backface-visibility: hidden; image-rendering: -webkit-optimize-contrast; }
      `}</style>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: "#0d0d0d",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>

          {/* Logo + drapeaux */}
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>
            <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <img
                src="/logo-icon.png"
                alt="Elysium icon"
                style={{ height: isMobile ? 44 : 60, width: "auto", objectFit: "contain" }}
              />
            </a>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                <img className="flag-float-1" src="https://flagcdn.com/48x36/fr.png" width={isMobile ? 20 : 24} height={isMobile ? 15 : 18} alt="France" style={{ borderRadius: 2, display: "inline-block", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
                <img className="flag-float-2" src="https://flagcdn.com/48x36/eu.png" width={isMobile ? 20 : 24} height={isMobile ? 15 : 18} alt="EU" style={{ borderRadius: 2, display: "inline-block", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
              </div>
              <span style={{ color: "#A0A0A0", fontSize: isMobile ? 7 : 9, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", whiteSpace: "nowrap" }}>PropFirm Française</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div style={{ display: isMobile ? "none" : "flex", gap: 28, alignItems: "center" }}>
            {([
              [T.nav.challenges, "/#pricing", false],
              [T.nav.howItWorks, "/#how-it-works", false],
              [T.nav.rules, "/#rules", false],
              [T.nav.faq, "/#faq", false],
              ["Support", "/support", false],
            ] as [string, string, boolean][]).map(([label, href, badge]) => (
              <a key={href} href={href}
                style={{ display: "flex", alignItems: "center", gap: 4, color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none", padding: "6px 14px", borderRadius: 100, backgroundColor: "rgba(0,194,255,0.12)", border: "1px solid rgba(0,194,255,0.3)", backdropFilter: "blur(8px)", transition: "all 0.2s" }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = "rgba(0,194,255,0.25)"; e.currentTarget.style.borderColor = "rgba(0,194,255,0.7)"; e.currentTarget.style.boxShadow = "0 0 12px rgba(0,194,255,0.3)"; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = "rgba(0,194,255,0.12)"; e.currentTarget.style.borderColor = "rgba(0,194,255,0.3)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                {label}
                {badge && <span style={{ fontSize: 13 }}>🔒</span>}
              </a>
            ))}
          </div>

          {/* Droite : langue + CTA */}
          <div style={{ display: isMobile ? "none" : "flex", gap: 12, alignItems: "center" }}>

            {/* Sélecteur de langue */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(255,255,255,0.05)", border: "1px solid #2a2a2a",
                  borderRadius: 8, padding: "7px 12px", cursor: "pointer",
                  color: "#A0A0A0", fontSize: 13, fontWeight: 600,
                }}
              >
                <FlagImg code={current.code} />
                <span>{current.code.toUpperCase()}</span>
                <ChevronDown size={12} />
              </button>

              {langOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  backgroundColor: "#1E1E26", border: "1px solid #2A2A38",
                  borderRadius: 12, overflow: "hidden", minWidth: 160, zIndex: 200,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
                }}>
                  {languages.map(l => (
                    <button key={l.code} onClick={() => { setLang(l.code as Lang); setLangOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        width: "100%", padding: "12px 16px", background: "none",
                        border: "none", cursor: "pointer", textAlign: "left",
                        backgroundColor: lang === l.code ? "rgba(201,168,76,0.1)" : "transparent",
                        borderLeft: lang === l.code ? "2px solid #00C2FF" : "2px solid transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseOver={e => { if (lang !== l.code) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                      onMouseOut={e => { if (lang !== l.code) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <FlagImg code={l.code} />
                      <span style={{ color: lang === l.code ? "#00C2FF" : "#888", fontSize: 14, fontWeight: 500 }}>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a href="/login" style={{ color: "#00C2FF", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.5px" }}>
              {T.nav.logIn}
            </a>
            <a href="/#pricing" className="btn-primary" style={{ padding: "10px 22px", fontSize: 13 }}>
              {T.nav.startChallenge}
            </a>
          </div>

          <div style={{ display: isMobile ? "flex" : "none", alignItems: "center", gap: 10 }}>
            <a href="/login" style={{ color: "#00C2FF", fontSize: 13, fontWeight: 700, textDecoration: "none", letterSpacing: "0.5px" }}>
              {T.nav.logIn}
            </a>
            <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}>
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {open && (
          <div style={{ backgroundColor: "#1A1A22", borderTop: "1px solid #2A2A38", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {languages.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code as Lang); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <FlagImg code={l.code} />
                <span style={{ color: lang === l.code ? "#00C2FF" : "#666", fontSize: 14 }}>{l.label}</span>
              </button>
            ))}
            <hr style={{ borderColor: "#222" }} />
            {([
              [T.nav.challenges, "/#pricing", false],
              [T.nav.howItWorks, "/#how-it-works", false],
              [T.nav.rules, "/#rules", false],
              [T.nav.faq, "/#faq", false],
              ["Support", "/support", false],
            ] as [string, string, boolean][]).map(([label, href, badge]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 6, color: "#A0A0A0", fontSize: 16, fontWeight: 500, textDecoration: "none" }}
              >
                {label}
                {badge && <span style={{ fontSize: 15 }}>🔒</span>}
              </a>
            ))}
            <a href="/login" style={{ color: "#00C2FF", fontSize: 16, fontWeight: 600, textDecoration: "none" }} onClick={() => setOpen(false)}>{T.nav.logIn}</a>
            <a href="/#pricing" className="btn-primary" style={{ textAlign: "center" }} onClick={() => setOpen(false)}>{T.nav.startChallenge}</a>
          </div>
        )}
      </nav>

    </>
  );
}
