"use client";
/**
 * ============================================================
 * lib/CurrencyContext.tsx — Sélecteur de devise partagé
 * ============================================================
 * Utilisé par PricingV1 et le Checkout pour afficher les prix
 * dans la devise choisie par l'utilisateur.
 *
 * Comportement :
 *  - Persistance : localStorage "tr_currency"
 *  - Défaut si aucun choix sauvegardé : EN→USD, FR/ES→EUR
 *  - Taux : chargés depuis /api/fx-rates (live, cache 1h)
 *           avec fallback statique si l'API est indisponible
 * ============================================================
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useLanguage } from "./LanguageContext";
import {
  FxCurrency,
  SUPPORTED_CURRENCIES,
  FALLBACK_RATES,
  CURRENCY_DISPLAY,
  convertEurCents as _convert,
  commercialRound,
  formatCurrencyAmount,
} from "./fx-rates";

// ── Re-exports pour les consommateurs ──────────────────────────────────────────
export type { FxCurrency };
export type SupportedCurrency = FxCurrency;
export { SUPPORTED_CURRENCIES, CURRENCY_DISPLAY, formatCurrencyAmount };

// ── Métadonnées UI avec flag — utilisées uniquement client-side ───────────────

export const CURRENCY_META: { code: FxCurrency; flag: string; symbol: string; position: "prefix" | "suffix" }[] =
  (Object.keys(CURRENCY_DISPLAY) as FxCurrency[])
    // Ordre souhaité dans le sélecteur
    .sort((a, b) => {
      const order: FxCurrency[] = ["USD", "EUR", "GBP", "CHF", "CAD", "AUD", "CZK"];
      return order.indexOf(a) - order.indexOf(b);
    })
    .map(code => ({ code, ...CURRENCY_DISPLAY[code] }));

// ── Devise par défaut selon la langue ────────────────────────────────────────

function defaultCurrencyForLang(lang: string): FxCurrency {
  return lang === "fr" || lang === "es" ? "EUR" : "USD";
}

// ── Contexte ─────────────────────────────────────────────────────────────────

type CurrencyContextType = {
  currency: FxCurrency;
  setCurrency: (c: FxCurrency) => void;
  rates: Record<FxCurrency, number>;
  /** Convertit des centimes EUR en montant dans la devise cible (arrondi commercial) */
  convertCents: (eurCents: number) => number;
  /**
   * Formate des centimes EUR dans la devise cible.
   * NOTE : utilise les taux client (actualisés au chargement de la page).
   * Pour un affichage garanti = paiement, utiliser le prix renvoyé par /api/checkout/preview.
   */
  formatCents: (eurCents: number) => string;
};

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "EUR",
  setCurrency: () => {},
  rates: FALLBACK_RATES,
  convertCents: (c) => Math.round(c / 100),
  formatCents: (c) => `€${Math.round(c / 100)}`,
});

// ── Provider ──────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();

  const [currency, setCurrencyState] = useState<FxCurrency>("EUR");
  const [rates, setRates] = useState<Record<FxCurrency, number>>({ ...FALLBACK_RATES });
  const [manuallySet, setManuallySet] = useState(false);

  // Charger les taux live depuis /api/fx-rates (cache 1h côté serveur)
  useEffect(() => {
    fetch("/api/fx-rates")
      .then(r => r.json())
      .then((data: { rates: Record<string, number> }) => {
        if (data?.rates && typeof data.rates === "object") {
          setRates(prev => ({ ...prev, ...data.rates } as Record<FxCurrency, number>));
        }
      })
      .catch(() => {}); // conserver le fallback en cas d'erreur
  }, []);

  // Charger la devise sauvegardée depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tr_currency") as FxCurrency | null;
      if (saved && SUPPORTED_CURRENCIES.includes(saved as FxCurrency)) {
        setCurrencyState(saved as FxCurrency);
        setManuallySet(true);
      }
    } catch {}
  }, []);

  // Appliquer le défaut basé sur la langue si aucun choix manuel
  useEffect(() => {
    if (manuallySet) return;
    try {
      if (!localStorage.getItem("tr_currency")) {
        setCurrencyState(defaultCurrencyForLang(lang));
      }
    } catch {
      setCurrencyState(defaultCurrencyForLang(lang));
    }
  }, [lang, manuallySet]);

  const setCurrency = useCallback((c: FxCurrency) => {
    setCurrencyState(c);
    setManuallySet(true);
    try { localStorage.setItem("tr_currency", c); } catch {}
  }, []);

  const convertCents = useCallback(
    (eurCents: number): number => _convert(eurCents, currency, rates[currency] ?? 1),
    [currency, rates]
  );

  const formatCents = useCallback(
    (eurCents: number): string =>
      formatCurrencyAmount(
        commercialRound((eurCents / 100) * (rates[currency] ?? 1), currency),
        currency
      ),
    [currency, rates]
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, convertCents, formatCents }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const useCurrency = () => useContext(CurrencyContext);
