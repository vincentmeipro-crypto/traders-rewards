"use client";

// ══════════════════════════════════════════════════════════════
//  JourneyRulesSection.tsx
//  Wrapper client qui enveloppe Parcours + Règles dans le
//  SizeSyncProvider afin de synchroniser le sélecteur 25K/50K/100K
//  entre les deux sections.
// ══════════════════════════════════════════════════════════════

import { SizeSyncProvider } from "@/lib/SizeSyncContext";
import JourneyThreeLevels  from "@/components/JourneyThreeLevels";
import RulesV1             from "@/components/RulesV1";

export default function JourneyRulesSection() {
  return (
    <SizeSyncProvider>
      <JourneyThreeLevels />
      <RulesV1 />
    </SizeSyncProvider>
  );
}
