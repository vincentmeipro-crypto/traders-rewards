"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const END = new Date("2026-07-15T23:59:59");

const items = [
  { en: "🔥 LIMITED OFFER — 50% OFF all challenges · Code TRD50", fr: "🔥 OFFRE LIMITÉE — 50% DE RÉDUCTION sur tous les challenges · Code TRD50" },
  { en: "⏳ Valid until July 15, 2026 only", fr: "⏳ Valable jusqu'au 15 juillet 2026 uniquement" },
  { en: "💰 Up to $200,000 simulated capital · Scale to $400,000 certified", fr: "💰 Jusqu'à 200 000$ de capital simulé · Évoluez jusqu'à 400 000$ en certifié" },
  { en: "✅ Use code TRD50 at checkout — 50% OFF", fr: "✅ Utilisez le code TRD50 au paiement — 50% DE RÉDUCTION" },
];

export default function PromoBanner() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    if (now > END) return;
    const dismissed = sessionStorage.getItem("promo_banner_dismissed");
    if (!dismissed) setVisible(true);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--promo-banner-height", visible ? "40px" : "0px");
    return () => { document.documentElement.style.setProperty("--promo-banner-height", "0px"); };
  }, [visible]);

  const dismiss = () => {
    sessionStorage.setItem("promo_banner_dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  const isFr = lang === "fr";
  const texts = [...items, ...items];

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      zIndex: 200,
      height: 40,
      background: "linear-gradient(135deg, #0D1B3E 0%, #1565C0 100%)",
      borderBottom: "1px solid rgba(21,101,192,0.4)",
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
    }}>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 60, background: "linear-gradient(to right, #0D1B3E, transparent)", zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 32, top: 0, bottom: 0, width: 60, background: "linear-gradient(to left, #1565C0, transparent)", zIndex: 2, pointerEvents: "none" }} />

        <div className="marquee-track">
          {texts.map((item, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center",
              whiteSpace: "nowrap", fontSize: 12, fontWeight: 700,
              letterSpacing: "0.8px", color: "#fff", padding: "0 48px",
            }}>
              {isFr ? item.fr : item.en}
              <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.5)", margin: "0 0 0 48px" }} />
            </span>
          ))}
        </div>
      </div>

      <button onClick={dismiss} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: "0 12px", display: "flex", alignItems: "center", flexShrink: 0, transition: "color 0.2s" }}
        onMouseOver={e => (e.currentTarget.style.color = "#fff")}
        onMouseOut={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
      >
        <X size={14} />
      </button>
    </div>
  );
}
