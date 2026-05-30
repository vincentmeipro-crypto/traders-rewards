"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Lang, t, languages } from "./translations";

type ContextType = { lang: Lang; setLang: (l: Lang) => void; T: typeof t.en; isRtl: boolean };

const LanguageContext = createContext<ContextType>({
  lang: "fr", setLang: () => {}, T: t.fr, isRtl: false,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("elysium-lang", l);
    const isRtl = languages.find(x => x.code === l)?.rtl ?? false;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = l;
  };

  useEffect(() => {
    const saved = localStorage.getItem("elysium-lang") as Lang | null;
    if (saved && t[saved]) setLang(saved);
  }, []);

  const isRtl = languages.find(x => x.code === lang)?.rtl ?? false;

  return (
    <LanguageContext.Provider value={{ lang, setLang, T: t[lang], isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
