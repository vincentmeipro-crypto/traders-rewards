/**
 * Consent categories and types for Traders Rewards
 * Version: 1.0
 */

export type ConsentCategory = "necessary" | "analytics" | "advertising";

export interface ConsentState {
  version: "1.0";
  necessary: boolean; // Always true, always required
  analytics: boolean; // Optional, default false
  advertising: boolean; // Optional, default false
  updatedAt: string; // ISO timestamp
}

export const INITIAL_CONSENT: ConsentState = {
  version: "1.0",
  necessary: true,
  analytics: false,
  advertising: false,
  updatedAt: new Date().toISOString(),
};

export const CONSENT_STORAGE_KEY = "tr_consent_v1";

export interface ConsentContextType {
  consent: ConsentState;
  setConsent: (state: ConsentState) => void;
  updateCategory: (category: "analytics" | "advertising", value: boolean) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  isInitialized: boolean;
  hasSeenBanner: boolean;
  setHasSeenBanner: (value: boolean) => void;
}
