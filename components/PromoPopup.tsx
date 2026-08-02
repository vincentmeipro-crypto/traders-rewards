"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const START = new Date("2026-07-28T00:00:00");
const END   = new Date("2026-08-15T23:59:59");

export default function PromoPopup() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const isFr = lang === "fr";

  useEffect(() => {
    const now = new Date();
    if (now < START || now > END) return;
    const dismissed = sessionStorage.getItem("promo_tr33_dismissed");
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 15000);
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
    sessionStorage.setItem("promo_tr33_dismissed", "1");
    setVisible(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText("TR33").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24,
    }} onClick={dismiss}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: "#0a0a0a",
        border: "1.5px solid rgba(249,115,22,0.35)",
        borderRadius: 20,
        padding: "36px 32px",
        maxWidth: 420,
        width: "100%",
        position: "relative",
        boxShadow: "0 0 60px rgba(249,115,22,0.15), 0 24px 80px rgba(0,0,0,0.6)",
        textAlign: "center",
      }}>
        {/* Fermer */}
        <button onClick={dismiss} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4 }}>
          <X size={20} />
        </button>

        {/* Badge neon */}
        <div style={{ display: "inline-block", marginBottom: 20 }}>
          <div style={{
            fontSize: 72, fontWeight: 900, lineHeight: 1,
            color: "#f97316",
            textShadow: "0 0 20px rgba(249,115,22,0.8), 0 0 60px rgba(249,115,22,0.4), 0 0 100px rgba(249,115,22,0.2)",
            letterSpacing: "-2px",
          }}>-33%</div>
        </div>

        {/* Titre */}
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6, lineHeight: 1.2 }}>
          {isFr ? "Offre Été — 33% de réduction" : "Summer Deal — 33% off"}
        </div>
        <div style={{ color: "#666", fontSize: 13, marginBottom: 24 }}>
          {isFr ? "Sur tous vos challenges · Jusqu'au 15 août 2026" : "On all challenges · Until Aug 15, 2026"}
        </div>

        {/* Code promo */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#555", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>
            {isFr ? "Votre code promo" : "Your promo code"}
          </div>
          <button onClick={copyCode} style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            backgroundColor: "rgba(249,115,22,0.08)",
            border: "2px dashed rgba(249,115,22,0.5)",
            borderRadius: 10, padding: "12px 28px", cursor: "pointer",
            transition: "all 0.2s",
          }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: "#f97316", letterSpacing: "4px", fontFamily: "monospace", textShadow: "0 0 12px rgba(249,115,22,0.5)" }}>TR33</span>
            <span style={{ fontSize: 12, color: copied ? "#22c55e" : "#f97316", fontWeight: 700 }}>
              {copied ? (isFr ? "Copié !" : "Copied!") : (isFr ? "Copier" : "Copy")}
            </span>
          </button>
        </div>

        {/* Countdown */}
        {timeLeft && (
          <div style={{ marginBottom: 24, backgroundColor: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.15)", borderRadius: 10, padding: "10px 16px" }}>
            <div style={{ fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>
              {isFr ? "Expire dans" : "Expires in"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#f97316", fontFamily: "monospace" }}>{timeLeft}</div>
          </div>
        )}

        {/* CTA */}
        <a href="/#pricing" onClick={dismiss} style={{
          display: "block",
          background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
          color: "#fff",
          padding: "14px", borderRadius: 8, fontWeight: 800,
          fontSize: 13, letterSpacing: "1.5px", textTransform: "uppercase",
          textDecoration: "none",
          boxShadow: "0 4px 24px rgba(249,115,22,0.3)",
        }}>
          {isFr ? "Utiliser le code TR33 →" : "Use code TR33 →"}
        </a>

        <div style={{ marginTop: 14, fontSize: 11, color: "#444" }}>
          {isFr ? "Valable jusqu'au 15 août 2026" : "Valid until August 15, 2026"}
        </div>
      </div>
    </div>
  );
}
