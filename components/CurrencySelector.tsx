"use client";
/**
 * CurrencySelector — Dropdown compact (tous écrans)
 * Remplace les pills horizontales sur desktop / tablette / mobile.
 * Ordre : EUR › USD › GBP › CHF › CAD › AUD › CZK
 */
import { useState, useEffect, useRef } from "react";
import { CURRENCY_META, useCurrency } from "@/lib/CurrencyContext";
import type { FxCurrency } from "@/lib/CurrencyContext";

// Ordre du menu — EUR en tête
const DROPDOWN_ORDER: FxCurrency[] = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "CZK"];
const DROPDOWN_META = DROPDOWN_ORDER
  .map(code => CURRENCY_META.find(m => m.code === code))
  .filter((m): m is (typeof CURRENCY_META)[0] => m !== undefined);

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  const [isOpen,  setIsOpen]  = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fermer au clic extérieur
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const activeMeta = DROPDOWN_META.find(m => m.code === currency) ?? DROPDOWN_META[0];

  return (
    <div
      ref={wrapperRef}
      style={{ display: "flex", justifyContent: "center", marginBottom: 20, position: "relative" }}
    >
      {/* ── Bouton trigger ── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           8,
          padding:       "8px 14px",
          borderRadius:  12,
          border:        "1px solid rgba(212,168,67,0.45)",
          background:    "rgba(0,0,0,0.55)",
          color:         "#FFFFFF",
          fontSize:      13,
          fontWeight:    650,
          cursor:        "pointer",
          fontFamily:    "inherit",
          letterSpacing: "0.3px",
          whiteSpace:    "nowrap",
          transition:    "border-color 0.15s ease",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/flags/${activeMeta.code}.svg`}
          alt=""
          width={22}
          height={15}
          style={{ borderRadius: 2, display: "block", flexShrink: 0 }}
          aria-hidden
        />
        <span>{activeMeta.code}</span>
        <span style={{ fontSize: 10, color: "#D4A843", marginLeft: 2, lineHeight: 1 }}>▼</span>
      </button>

      {/* ── Liste déroulante ── */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Devise"
          style={{
            position:     "absolute",
            top:          "calc(100% + 6px)",
            left:         "50%",
            transform:    "translateX(-50%)",
            zIndex:       200,
            background:   "#141618",
            border:       "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            overflow:     "hidden",
            minWidth:     140,
            boxShadow:    "0 12px 40px rgba(0,0,0,0.60)",
          }}
        >
          {DROPDOWN_META.map(({ code }) => {
            const isActive = currency === code;
            return (
              <button
                key={code}
                role="option"
                aria-selected={isActive}
                onClick={() => { setCurrency(code as FxCurrency); setIsOpen(false); }}
                style={{
                  display:       "flex",
                  alignItems:    "center",
                  gap:           10,
                  width:         "100%",
                  padding:       "9px 16px",
                  border:        "none",
                  borderLeft:    isActive ? "2px solid rgba(212,168,67,0.60)" : "2px solid transparent",
                  background:    isActive ? "rgba(212,168,67,0.10)" : "transparent",
                  color:         isActive ? "#D4A843" : "#FFFFFF",
                  fontSize:      13,
                  fontWeight:    isActive ? 700 : 450,
                  cursor:        "pointer",
                  fontFamily:    "inherit",
                  letterSpacing: "0.2px",
                  textAlign:     "left",
                  transition:    "background 0.12s ease",
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/flags/${code}.svg`}
                  alt=""
                  width={22}
                  height={15}
                  style={{ borderRadius: 2, display: "block", flexShrink: 0 }}
                  aria-hidden
                />
                <span>{code}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
