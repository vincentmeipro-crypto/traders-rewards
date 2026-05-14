"use client";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useLanguage } from "@/lib/LanguageContext";
import { languages, Lang } from "@/lib/translations";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { lang, setLang, T } = useLanguage();
  const current = languages.find(l => l.code === lang)!;

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backgroundColor: "rgba(7,7,7,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #1a1a1a",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>

          {/* Nom */}
          <div>
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "2px", textTransform: "uppercase" }}>
              Elysium <span style={{ color: "#C9A84C" }}>Funded</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {([
              [T.nav.challenges, "/#challenges"],
              [T.nav.howItWorks, "/#how-it-works"],
              [T.nav.pricing, "/#pricing"],
              [T.nav.rules, "/#rules"],
              [T.nav.faq, "/#faq"],
            ] as [string, string][]).map(([label, href]) => (
              <a key={href} href={href}
                style={{ color: "#A0A0A0", fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
                onMouseOver={e => (e.currentTarget.style.color = "#C9A84C")}
                onMouseOut={e => (e.currentTarget.style.color = "#A0A0A0")}
              >{label}</a>
            ))}
          </div>

          {/* Droite : langue + CTA */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>

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
                  backgroundColor: "#111", border: "1px solid #222",
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
                        borderLeft: lang === l.code ? "2px solid #C9A84C" : "2px solid transparent",
                        transition: "background 0.15s",
                      }}
                      onMouseOver={e => { if (lang !== l.code) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; }}
                      onMouseOut={e => { if (lang !== l.code) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <span style={{ fontSize: 18 }}>{l.flag}</span>
                      <span style={{ color: lang === l.code ? "#C9A84C" : "#888", fontSize: 14, fontWeight: 500 }}>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a href="/login" style={{ color: "#C9A84C", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.5px" }}>
              {T.nav.logIn}
            </a>
            <a href="/#pricing" className="btn-primary" style={{ padding: "10px 22px", fontSize: 13 }}>
              {T.nav.startChallenge}
            </a>
          </div>

          <button onClick={() => setOpen(!open)} style={{ display: "none", background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {open && (
          <div style={{ backgroundColor: "#0f0f0f", borderTop: "1px solid #1a1a1a", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            {languages.map(l => (
              <button key={l.code} onClick={() => { setLang(l.code as Lang); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <span>{l.flag}</span>
                <span style={{ color: lang === l.code ? "#C9A84C" : "#666", fontSize: 14 }}>{l.label}</span>
              </button>
            ))}
            <hr style={{ borderColor: "#222" }} />
            {([
              [T.nav.challenges, "/#challenges"],
              [T.nav.howItWorks, "/#how-it-works"],
              [T.nav.pricing, "/#pricing"],
              [T.nav.rules, "/#rules"],
            ] as [string, string][]).map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}
                style={{ color: "#A0A0A0", fontSize: 16, fontWeight: 500, textDecoration: "none" }}
              >{label}</a>
            ))}
            <a href="/login" style={{ color: "#C9A84C", fontSize: 16, fontWeight: 600, textDecoration: "none" }} onClick={() => setOpen(false)}>{T.nav.logIn}</a>
            <a href="/#pricing" className="btn-primary" style={{ textAlign: "center" }} onClick={() => setOpen(false)}>{T.nav.startChallenge}</a>
          </div>
        )}
      </nav>

      {/* Logo fixe en haut à droite sous START CHALLENGE */}
      <div style={{ position: "fixed", top: 72, right: 24, zIndex: 99 }}>
        <Image
          src="/logo.jpg"
          alt="Elysium Funded"
          width={100}
          height={100}
          priority
          style={{ objectFit: "contain", mixBlendMode: "screen" }}
        />
      </div>
    </>
  );
}
