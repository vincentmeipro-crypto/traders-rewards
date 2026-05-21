"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";

const SHOW_ON = ["/"];

export default function CrispChat() {
  const { lang } = useLanguage();
  const pathname = usePathname();

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
    const apply = () => {
      const tawk = (window as any).Tawk_API;
      if (!tawk) return;
      const visible = SHOW_ON.includes(pathname);
      if (visible) tawk.showWidget?.();
      else tawk.hideWidget?.();
    };
    // Tawk peut ne pas être encore chargé
    const tawk = (window as any).Tawk_API;
    if (tawk) {
      apply();
    } else {
      (window as any).Tawk_API = (window as any).Tawk_API || {};
      const prev = (window as any).Tawk_API.onLoad;
      (window as any).Tawk_API.onLoad = function () {
        if (prev) prev();
        apply();
      };
    }
  }, [pathname]);

  useEffect(() => {
    const tawk = (window as any).Tawk_API;
    if (!tawk?.setAttributes) return;
    const widgetLang = lang === "fr" ? "fr" : "en";
    tawk.setAttributes({ language: widgetLang }, () => {});
  }, [lang]);

  return null;
}
