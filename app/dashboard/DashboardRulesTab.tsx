"use client";

// ════════════════════════════════════════════════════════════════
//  DashboardRulesTab.tsx
//  Onglet Règles du Dashboard Client
//  Réutilise RulesV1 (site public) via SizeSyncProvider isolé.
//  → Le site public reste STRICTEMENT inchangé.
// ════════════════════════════════════════════════════════════════

import { SizeSyncProvider } from "@/lib/SizeSyncContext";
import { useLanguage }      from "@/lib/LanguageContext";
import RulesV1              from "@/components/RulesV1";

/**
 * Convertit la chaîne account_size du challenge (ex: "50K", "100K", "$25,000")
 * en index SIZES_DATA [0=25K, 1=50K, 2=100K]. Défaut 1 (50K).
 */
function accountSizeToIndex(accountSize?: string): number {
  if (!accountSize) return 1;
  const raw =
    Number(accountSize.replace(/[^0-9.]/g, "")) *
    (accountSize.toUpperCase().includes("K") ? 1000 : 1);
  if (raw <= 25_000)  return 0;
  if (raw >= 100_000) return 2;
  return 1; // 50K
}

interface Props {
  /** account_size du challenge actif sélectionné (ex: "50K") */
  challengeAccountSize?: string;
}

export default function DashboardRulesTab({ challengeAccountSize }: Props) {
  const { T }          = useLanguage();
  const initialIndex   = accountSizeToIndex(challengeAccountSize);

  return (
    <div>
      {/* En-tête dashboard */}
      <h1
        className="dash-chrome-title"
        style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}
      >
        {T.dash.rules}
      </h1>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
        {T.dash.tradingRulesSub}
      </p>

      {/*
        SizeSyncProvider isolé du contexte public.
        key = challengeAccountSize → remonte le provider si le compte change,
        ce qui réinitialise la sélection à la taille du nouveau compte.
      */}
      <SizeSyncProvider
        key={challengeAccountSize ?? "default"}
        initialIndex={initialIndex}
      >
        {/* RulesV1 en mode compact : masque l'en-tête section, supprime padding */}
        <RulesV1 compact />
      </SizeSyncProvider>
    </div>
  );
}
