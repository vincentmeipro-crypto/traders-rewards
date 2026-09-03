"use client";

// ══════════════════════════════════════════════════════════════
//  lib/SizeSyncContext.tsx
//  État partagé du sélecteur 25K / 50K / 100K
//  Consommé par : JourneyThreeLevels + RulesV1
//  Fourni par   : JourneyRulesSection (wrapper client)
// ══════════════════════════════════════════════════════════════

import { createContext, useContext, useState } from "react";

type SizeSyncCtx = {
  selectedSizeIndex: number;
  setSelectedSizeIndex: (i: number) => void;
};

const SizeSyncContext = createContext<SizeSyncCtx>({
  selectedSizeIndex: 1,           // 50K par défaut
  setSelectedSizeIndex: () => {},
});

export function SizeSyncProvider({ children }: { children: React.ReactNode }) {
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(1);
  return (
    <SizeSyncContext.Provider value={{ selectedSizeIndex, setSelectedSizeIndex }}>
      {children}
    </SizeSyncContext.Provider>
  );
}

export const useSizeSync = () => useContext(SizeSyncContext);
