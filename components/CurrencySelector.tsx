"use client";
/**
 * CurrencySelector — Pills de sélection de devise
 * Placé au-dessus des cartes de pricing.
 * Desktop : 1 ligne ; Mobile : wrap automatique.
 */
import { CURRENCY_META, useCurrency } from "@/lib/CurrencyContext";
import type { FxCurrency } from "@/lib/CurrencyContext";

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div
      style={{
        display:        "flex",
        flexWrap:       "wrap",
        justifyContent: "center",
        gap:            6,
        marginBottom:   20,
      }}
    >
      {CURRENCY_META.map(({ code, flag }) => {
        const isActive = currency === code;
        return (
          <button
            key={code}
            onClick={() => setCurrency(code as FxCurrency)}
            aria-pressed={isActive}
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           5,
              padding:       "5px 12px",
              borderRadius:  100,
              border:        isActive
                ? "1px solid rgba(212,168,67,0.75)"
                : "1px solid rgba(255,255,255,0.10)",
              background:    isActive
                ? "rgba(212,168,67,0.10)"
                : "rgba(255,255,255,0.03)",
              color:         isActive
                ? "#D4A843"
                : "rgba(255,255,255,0.50)",
              fontSize:      12,
              fontWeight:    isActive ? 700 : 500,
              cursor:        "pointer",
              fontFamily:    "inherit",
              letterSpacing: "0.2px",
              transition:    "all 0.15s ease",
              whiteSpace:    "nowrap",
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{flag}</span>
            {code}
          </button>
        );
      })}
    </div>
  );
}
