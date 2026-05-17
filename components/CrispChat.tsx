"use client";
import { useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

export default function CrispChat() {
  const { lang } = useLanguage();

  useEffect(() => {
    const s1 = document.createElement("script");
    const s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = "https://embed.tawk.to/6a0989e1c744531c437324e7/1joqk565d";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    s0.parentNode!.insertBefore(s1, s0);
  }, []);

  useEffect(() => {
    const tawk = (window as any).Tawk_API;
    if (!tawk || !tawk.setAttributes) return;
    const widgetLang = lang === "fr" ? "fr" : "en";
    tawk.setAttributes({ language: widgetLang }, () => {});
  }, [lang]);

  return null;
}
