"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const START = new Date("2026-06-10T00:00:00");
const END   = new Date("2026-07-15T23:59:59");

export default function PromoPopup() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const isFr = lang === "fr";

  useEffect(() => {
    const now = new Date();
    if (now < START || now > END) return;
    const dismissed = sessionStorage.getItem("promo_trd50_dismissed");
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const tick = () => {
      const diff = END.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft(""); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}j ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visible]);

  const dismiss = () => {
    sessionStorage.setItem("promo_trd50_dismissed", "1");
    setVisible(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText("TRD50").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={dismiss}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: "#fff",
        border: "2px solid #0D1B3E",
        borderRadius: 20,
        padding: "36px 32px",
        maxWidth: 420,
        width: "100%",
        position: "relative",
        boxShadow: "0 24px 80px rgba(13,27,62,0.25)",
        textAlign: "center",
      }}>
        {/* Fermer */}
        <button onClick={dismiss} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#7a90b0", padding: 4 }}>
          <X size={20} />
        </button>

        {/* Badge */}
        <div style={{ display: "inline-block", backgroundColor: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: "2px", padding: "4px 14px", borderRadius: 100, marginBottom: 16, textTransform: "uppercase" }}>
          {isFr ? "Offre limitée" : "Limited offer"}
        </div>

        {/* Titre */}
        <div style={{ fontSize: 28, fontWeight: 900, color: "#0D1B3E", marginBottom: 6, lineHeight: 1.2 }}>
          {isFr ? "50% de réduction" : "50% off"}
        </div>
        <div style={{ color: "#7a90b0", fontSize: 14, marginBottom: 24 }}>
          {isFr ? "Sur tous vos challenges · 10 juin → 15 juillet" : "On all challenges · June 10 → July 15"}
        </div>

        {/* Code promo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#7a90b0", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>
            {isFr ? "Votre code promo" : "Your promo code"}
          </div>
          <button onClick={copyCode} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            backgroundColor: "#f0f5ff", border: "2px dashed #1565C0",
            borderRadius: 10, padding: "12px 28px", cursor: "pointer",
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#0D1B3E", letterSpacing: "4px", fontFamily: "monospace" }}>TRD50</span>
            <span style={{ fontSize: 12, color: copied ? "#16a34a" : "#1565C0", fontWeight: 700 }}>
              {copied ? (isFr ? "Copié !" : "Copied!") : (isFr ? "Copier" : "Copy")}
            </span>
          </button>
        </div>

        {/* Countdown */}
        {timeLeft && (
          <div style={{ marginBottom: 24, backgroundColor: "rgba(21,101,192,0.06)", borderRadius: 10, padding: "10px 16px" }}>
            <div style={{ fontSize: 11, color: "#7a90b0", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
              {isFr ? "Expire dans" : "Expires in"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0D1B3E", fontFamily: "monospace" }}>{timeLeft}</div>
          </div>
        )}

        {/* CTA */}
        <a href="/#pricing" onClick={dismiss} style={{
          display: "block", backgroundColor: "#0D1B3E", color: "#fff",
          padding: "14px", borderRadius: 8, fontWeight: 800,
          fontSize: 13, letterSpacing: "1.5px", textTransform: "uppercase",
          textDecoration: "none", transition: "background 0.2s",
        }}>
          {isFr ? "Utiliser le code →" : "Use the code →"}
        </a>

        <div style={{ marginTop: 14, fontSize: 11, color: "#b0bec5" }}>
          {isFr ? "Valable jusqu'au 15 juillet 2026" : "Valid until July 15, 2026"}
        </div>
      </div>
    </div>
  );
}
