"use client";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PromoBanner from "@/components/PromoBanner";

const TV_LOCALE: Record<string, string> = {
  en: "en", fr: "fr", ar: "ar", es: "es", pt: "pt_BR", de: "de", tr: "tr",
};

export default function TraderPage() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<"calendar" | "platform">("calendar");
  const calendarRef = useRef<HTMLDivElement>(null);
  const isFr = lang === "fr";
  const locale = TV_LOCALE[lang] || "en";

  useEffect(() => {
    if (tab !== "calendar" || !calendarRef.current) return;
    calendarRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s.tradingview.com/external-embedding/embed-widget-economic-calendar.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      isTransparent: true,
      width: "100%",
      height: "700",
      locale,
      importanceFilter: "-1,0,1",
    });
    calendarRef.current.appendChild(script);
  }, [tab, locale]);

  const labels = {
    title:    isFr ? "Espace Trader" : "Trader Hub",
    calTab:   isFr ? "Annonces Économiques" : "Economic Announcements",
    platTab:  isFr ? "Plateforme de Trading" : "Trading Platform",
    mt5Title: "MetaTrader 5",
    mt5Desc:  isFr
      ? "Accédez à votre compte certifié depuis MetaTrader 5, la référence des traders professionnels."
      : "Access your certified account from MetaTrader 5, the reference for professional traders.",
    mt5Btn:   isFr ? "Télécharger MT5" : "Download MT5",
    webTitle: isFr ? "Dashboard Elysium" : "Elysium Dashboard",
    webDesc:  isFr
      ? "Suivez vos performances, vos récompenses et vos statistiques depuis votre espace personnel."
      : "Track your performance, rewards and statistics from your personal dashboard.",
    webBtn:   isFr ? "Accéder au Dashboard" : "Go to Dashboard",
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
          <p style={{ color: "#555", fontSize: 15, marginBottom: 40 }}>
            {isFr
              ? "Vos outils de trading au même endroit."
              : "Your trading tools in one place."}
          </p>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 32, borderBottom: "1px solid #2A2A38" }}>
            {(["calendar", "platform"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "12px 28px",
                background: "none",
                border: "none",
                borderBottom: tab === t ? "2px solid #2D7DD2" : "2px solid transparent",
                color: tab === t ? "#2D7DD2" : "#555",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                marginBottom: -1,
                letterSpacing: "0.3px",
                transition: "color 0.2s",
              }}>
                {t === "calendar" ? labels.calTab : labels.platTab}
              </button>
            ))}
          </div>

          {/* Economic Calendar */}
          {tab === "calendar" && (
            <div
              ref={calendarRef}
              className="tradingview-widget-container"
              style={{ minHeight: 700, borderRadius: 16, overflow: "hidden" }}
            />
          )}

          {/* Trading Platform */}
          {tab === "platform" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>

              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 20 }}>📊</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{labels.mt5Title}</h3>
                <p style={{ color: "#666", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>{labels.mt5Desc}</p>
                <a
                  href="https://www.metatrader5.com/fr/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary btn-primary-animated"
                  style={{ display: "inline-block", padding: "13px 32px", fontSize: 13 }}
                >
                  {labels.mt5Btn}
                </a>
              </div>

              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 20 }}>🚀</div>
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>{labels.webTitle}</h3>
                <p style={{ color: "#666", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>{labels.webDesc}</p>
                <a
                  href="/dashboard"
                  className="btn-primary btn-primary-animated"
                  style={{ display: "inline-block", padding: "13px 32px", fontSize: 13 }}
                >
                  {labels.webBtn}
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
