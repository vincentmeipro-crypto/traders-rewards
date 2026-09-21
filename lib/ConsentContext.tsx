"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  ConsentContextType,
  ConsentState,
  INITIAL_CONSENT,
  CONSENT_STORAGE_KEY,
} from "./consent-types";

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<ConsentState>(INITIAL_CONSENT);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasSeenBanner, setHasSeenBanner] = useState(false);

  // Load consent from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ConsentState;
        // Validate version matches
        if (parsed.version === "1.0") {
          setConsentState(parsed);
          setHasSeenBanner(true);
        } else {
          // Version mismatch — reset and show banner
          localStorage.removeItem(CONSENT_STORAGE_KEY);
          setHasSeenBanner(false);
        }
      } else {
        // First visit — show banner
        setHasSeenBanner(false);
      }
    } catch (e) {
      // Storage error — reset
      setHasSeenBanner(false);
    }
    setIsInitialized(true);
  }, []);

  const setConsent = (state: ConsentState) => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
      setConsentState(state);
      setHasSeenBanner(true);
    } catch (e) {
      // Storage error, but continue with state update
      setConsentState(state);
      setHasSeenBanner(true);
    }
  };

  const updateCategory = (category: "analytics" | "advertising", value: boolean) => {
    const updated: ConsentState = {
      ...consent,
      [category]: value,
      updatedAt: new Date().toISOString(),
    };
    setConsent(updated);
  };

  const acceptAll = () => {
    const updated: ConsentState = {
      version: "1.0",
      necessary: true,
      analytics: true,
      advertising: true,
      updatedAt: new Date().toISOString(),
    };
    setConsent(updated);
  };

  const rejectAll = () => {
    const updated: ConsentState = {
      version: "1.0",
      necessary: true,
      analytics: false,
      advertising: false,
      updatedAt: new Date().toISOString(),
    };
    setConsent(updated);
  };

  return (
    <ConsentContext.Provider
      value={{
        consent,
        setConsent,
        updateCategory,
        acceptAll,
        rejectAll,
        isInitialized,
        hasSeenBanner,
        setHasSeenBanner,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export const useConsent = () => {
  const context = useContext(ConsentContext);
  if (!context) {
    throw new Error("useConsent must be used within ConsentProvider");
  }
  return context;
};
