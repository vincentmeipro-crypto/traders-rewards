"use client";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/LanguageContext";
import { languages, Lang } from "@/lib/translations";

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
      <nav style={{
        position: "fixed", top: 40, left: 0, right: 0, zIndex: 100,
        backgroundColor: "rgba(20,20,28,0.92)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #2A2A38",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>

          {/* Nom */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/logo-white.jpg"
              alt="Elysium Funded logo"
              style={{ width: 48, height: 48, objectFit: "contain", mixBlendMode: "screen" }}
            />
            <span style={{ fontFamily: "var(--font-bebas)", fontSize: 26, letterSpacing: "3px", textTransform: "uppercase", lineHeight: 1 }}>
              Elysium
            </span>
          </div>

          {/* Desktop Nav */}
          <div style={{ display: isMobile ? "none" : "flex", gap: 28, alignItems: "center" }}>
            {([
              [T.nav.challenges, "/#pricing"],
              [T.nav.howItWorks, "/#how-it-works"],
              [T.nav.rules, "/#rules"],
              [T.nav.elevation, "/#elevation"],
              [T.nav.faq, "/#faq"],
            ] as [string, string][]).map(([label, href]) => (
              <a key={href} href={href}
                style={{ color: "#A0A0A0", fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#2D7DD2")}
                onMouseOut={e => (e.currentTarget.style.color = "#A0A0A0")}
              >{label}</a>
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
                <span>{current.flag}</span>
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
                        borderLeft: lang === l.code ? "2px solid #2D7DD2" : "2px solid transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseOver={e => { if (lang !== l.code) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                      onMouseOut={e => { if (lang !== l.code) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span style={{ fontSize: 18 }}>{l.flag}</span>
                      <span style={{ color: lang === l.code ? "#2D7DD2" : "#888", fontSize: 14, fontWeight: 500 }}>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a href="/login" style={{ color: "#2D7DD2", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.5px" }}>
              {T.nav.logIn}
            </a>
            <a href="/#pricing" className="btn-primary btn-primary-animated" style={{ padding: "10px 22px", fontSize: 13 }}>
              {T.nav.startChallenge}
            </a>
          </div>

          <button onClick={() => setOpen(!open)} style={{ display: isMobile ? "flex" : "none", background: "none", border: "none", color: "#fff", cursor: "pointer", alignItems: "center" }}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <div style={{ backgroundColor: "#1A1A22", borderTop: "1px solid #2A2A38", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {languages.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code as Lang); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <span>{l.flag}</span>
                <span style={{ color: lang === l.code ? "#2D7DD2" : "#666", fontSize: 14 }}>{l.label}</span>
              </button>
            ))}
            <hr style={{ borderColor: "#222" }} />
            {([
              [T.nav.challenges, "/#pricing"],
              [T.nav.howItWorks, "/#how-it-works"],
              [T.nav.rules, "/#rules"],
              [T.nav.elevation, "/#elevation"],
            ] as [string, string][]).map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}
                style={{ color: "#A0A0A0", fontSize: 16, fontWeight: 500, textDecoration: "none" }}
              >{label}</a>
            ))}
            <a href="/login" style={{ color: "#2D7DD2", fontSize: 16, fontWeight: 600, textDecoration: "none" }} onClick={() => setOpen(false)}>{T.nav.logIn}</a>
            <a href="/#pricing" className="btn-primary" style={{ textAlign: "center" }} onClick={() => setOpen(false)}>{T.nav.startChallenge}</a>
          </div>
        )}
      </nav>

    </>
  );
}
