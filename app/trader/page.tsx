"use client";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PromoBanner from "@/components/PromoBanner";

// Investing.com lang codes
const INV_LANG: Record<string, string> = {
  en: "1", fr: "5", ar: "14", es: "4", pt: "11", de: "3", tr: "18",
};

export default function TraderPage() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<"calendar" | "platform">("calendar");
  const isFr = lang === "fr";
  const invLang = INV_LANG[lang] || "1";

  const calendarSrc =
    `https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous` +
    `&features=datepicker,timezone` +
    `&countries=25,32,6,37,72,22,17,39,14,10,35,43,56,36,110,11,26,12,4,5` +
    `&calType=week&timeZone=55&lang=${invLang}`;

  const labels = {
    title:   isFr ? "Espace Trader" : "Trader Hub",
    sub:     isFr ? "Vos outils de trading au même endroit." : "Your trading tools in one place.",
    calTab:  isFr ? "Annonces Économiques" : "Economic Announcements",
    platTab: isFr ? "Plateforme de Trading" : "Trading Platform",
    mt5Desc: isFr
      ? "Accédez à votre compte certifié depuis MetaTrader 5, la référence des traders professionnels."
      : "Access your certified account from MetaTrader 5, the reference for professional traders.",
    mt5Btn:  isFr ? "Télécharger MT5" : "Download MT5",
  };

  return (
    <>
      <PromoBanner />
      <Navbar />
      <main style={{ minHeight: "100vh", paddingTop: 140, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 8 }}>
            {labels.title}
          </h1>
          <p style={{ color: "#555", fontSize: 15, marginBottom: 40 }}>{labels.sub}</p>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #2A2A38", marginBottom: 32 }}>
            {(["calendar", "platform"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "12px 28px", background: "none", border: "none",
                borderBottom: tab === t ? "2px solid #2D7DD2" : "2px solid transparent",
                color: tab === t ? "#2D7DD2" : "#555",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                marginBottom: -1, letterSpacing: "0.3px", transition: "color 0.2s",
              }}>
                {t === "calendar" ? labels.calTab : labels.platTab}
              </button>
            ))}
          </div>

          {/* Investing.com Economic Calendar */}
          {tab === "calendar" && (
            <iframe
              key={invLang}
              src={calendarSrc}
              width="100%"
              height="740"
              frameBorder="0"
              allowTransparency={true}
              style={{ display: "block", border: "none", borderRadius: 12, width: "100%", height: 740 }}
            />
          )}

          {/* MT5 Platform */}
          {tab === "platform" && (
            <div style={{ maxWidth: 400 }}>
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <img src="/MT5.png" alt="MetaTrader 5" style={{ height: 80, width: "auto", objectFit: "contain", marginBottom: 24 }} />
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>MetaTrader 5</h3>
                <p style={{ color: "#666", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>{labels.mt5Desc}</p>
                <a
                  href="https://www.metatrader5.com/fr/download"
                  target="_blank" rel="noopener noreferrer"
                  className="btn-primary btn-primary-animated"
                  style={{ display: "inline-block", padding: "13px 32px", fontSize: 13 }}
                >
                  {labels.mt5Btn}
                </a>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
