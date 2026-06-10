"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const text: Record<string, { msg: string; ok: string }> = {
  en: {
    msg: "Traders Rewards operates in a fully simulated environment. No real capital is at risk. Rewards are calculated based on your simulated trading performance.",
    ok: "Got it",
  },
  fr: {
    msg: "Traders Rewards opère dans un environnement 100% simulé. Aucun capital réel n'est engagé. Vos récompenses sont calculées sur la base de vos performances simulées.",
    ok: "J'ai compris",
  },
  ar: {
    msg: "تعمل Traders Rewards في بيئة محاكاة كاملة. لا يوجد رأس مال حقيقي في خطر. المكافآت تُحسب بناءً على أدائك في التداول المحاكى.",
    ok: "فهمت",
  },
  es: {
    msg: "Traders Rewards opera en un entorno 100% simulado. No se arriesga capital real. Las recompensas se calculan en base a tu rendimiento de trading simulado.",
    ok: "Entendido",
  },
  pt: {
    msg: "Traders Rewards opera num ambiente 100% simulado. Nenhum capital real está em risco. As recompensas são calculadas com base no seu desempenho de trading simulado.",
    ok: "Entendi",
  },
  de: {
    msg: "Traders Rewards operiert in einer vollständig simulierten Umgebung. Kein echtes Kapital ist gefährdet. Prämien werden auf Basis Ihrer simulierten Trading-Leistung berechnet.",
    ok: "Verstanden",
  },
  tr: {
    msg: "Traders Rewards tamamen simüle edilmiş bir ortamda faaliyet gösterir. Gerçek sermaye risk altında değildir. Ödüller, simüle edilmiş işlem performansınıza göre hesaplanır.",
    ok: "Anladım",
  },
};

export default function DisclaimerBanner() {
  const { lang } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("disclaimer_dismissed");
    if (!dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  const t = text[lang] || text.en;

  return (
    <div style={{
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      zIndex: 999,
      backgroundColor: "#0a0a14",
      borderTop: "1px solid rgba(45,125,210,0.25)",
      padding: "14px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      flexWrap: "wrap",
    }}>
      <p style={{
        color: "#888",
        fontSize: 13,
        lineHeight: 1.5,
        margin: 0,
        maxWidth: 820,
        textAlign: "center",
      }}>
        ⚠️ {t.msg}
      </p>
      <button
        onClick={() => {
          sessionStorage.setItem("disclaimer_dismissed", "1");
          setVisible(false);
        }}
        style={{
          flexShrink: 0,
          backgroundColor: "#00C2FF",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "8px 20px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {t.ok}
      </button>
    </div>
  );
}
