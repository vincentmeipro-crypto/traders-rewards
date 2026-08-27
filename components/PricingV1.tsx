"use client";

// ════════════════════════════════════════════════════════════════
//  PricingV1.tsx — Pricing V1 Traders Rewards
//  3 cartes : rewards-25k / rewards-50k / rewards-100k
//  Données : /api/products (filter rewards-*) + fallback hardcodé
//  50K = "LE PLUS POPULAIRE"
//  CTA "DÉMARRER" → /checkout?product=rewards-{size}[&qty=3]
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import PricingDetailModal from "./PricingDetailModal";

// ── Source de vérité fallback ──────────────────────────────────
// Période 1 (oct 1-15) — prix d'entrée les plus bas.
// Le frontend recharge depuis /api/products et surcharge ces valeurs
// avec les prix de la période active. Ce fallback évite un flash vide
// au premier rendu.
//
// refPriceCents / refPack3Cents : prix de référence barrés (affichage uniquement).
//   25K  → 190€ / 570€
//   50K  → 290€ / 870€
//  100K  → 590€ / 1 770€
const V1_FALLBACK = [
  {
    slug: "rewards-25k",  balance: 25000,  priceCents: 3800,  pack3Cents: 5700,
    qualDayUsd: 100, activFeeEur: 99,
    refPriceCents: 19000, refPack3Cents: 57000,  trailingDdPct: 4,
  },
  {
    slug: "rewards-50k",  balance: 50000,  priceCents: 5800,  pack3Cents: 8700,
    qualDayUsd: 250, activFeeEur: 99,
    refPriceCents: 29000, refPack3Cents: 87000,  trailingDdPct: 4,
  },
  {
    slug: "rewards-100k", balance: 100000, priceCents: 11800, pack3Cents: 17700,
    qualDayUsd: 300, activFeeEur: 99,
    refPriceCents: 59000, refPack3Cents: 177000, trailingDdPct: 3,
  },
];

type V1Card = {
  slug:          string;
  balance:       number;
  priceCents:    number;   // prix unitaire période active
  pack3Cents:    number;   // prix pack ×3 période active
  qualDayUsd:    number;
  activFeeEur:   number;
  refPriceCents:  number;  // prix de référence barré (unitaire)
  refPack3Cents:  number;  // prix de référence barré (×3)
  trailingDdPct: number;
};

type ApiProduct = {
  slug:                 string;
  balance_usd:          number;
  effective_price_cents: number;
  unit_price_cents?:    number | null;
  pack3_price_cents?:   number | null;
  ref_price_cents?:     number | null;
  ref_pack3_price_cents?: number | null;
  rules?: { rule_key: string; rule_value: unknown }[];
};

function getRuleNum(rules: { rule_key: string; rule_value: unknown }[], key: string): number | null {
  const r = rules.find(r => r.rule_key === key);
  if (!r) return null;
  const v = r.rule_value;
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = parseFloat(v); return isNaN(n) ? null : n; }
  return null;
}

export default function PricingV1() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  const [cards, setCards]       = useState<V1Card[]>(V1_FALLBACK);
  const [selIdx, setSelIdx]     = useState(1); // 50K par défaut
  const [isMobile, setIsMobile] = useState(false);
  const [hovIdx,  setHovIdx]    = useState<number | null>(null);
  const [showPct,  setShowPct]  = useState(true);
  const [activeModal, setActiveModal] = useState<number | null>(null);
  // Ensemble des indices de cartes avec le pack ×3 sélectionné
  const [pack3Set, setPack3Set] = useState<Set<number>>(new Set());
  const triggerElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json())
      .then((data: ApiProduct[]) => {
        if (!Array.isArray(data)) return;
        const v1 = data
          .filter(p => typeof p.slug === "string" && p.slug.startsWith("rewards-"))
          .sort((a, b) => a.balance_usd - b.balance_usd);
        if (v1.length < 3) return;
        const merged: V1Card[] = v1.map(p => {
          const fb = V1_FALLBACK.find(f => f.slug === p.slug) ?? V1_FALLBACK[0];
          const qualDay    = p.rules ? (getRuleNum(p.rules, "qualifying_day_min_usd") ?? fb.qualDayUsd)  : fb.qualDayUsd;
          const activFee   = p.rules ? (getRuleNum(p.rules, "activation_fee_eur")     ?? fb.activFeeEur) : fb.activFeeEur;
          // trailingDdPct : toujours depuis V1_FALLBACK (source contractuelle)
          const trailingDd = fb.trailingDdPct;
          return {
            slug:          p.slug,
            balance:       p.balance_usd,
            priceCents:    p.unit_price_cents  ?? p.effective_price_cents ?? fb.priceCents,
            pack3Cents:    p.pack3_price_cents  ?? fb.pack3Cents,
            qualDayUsd:    qualDay,
            activFeeEur:   activFee,
            refPriceCents:  p.ref_price_cents        ?? fb.refPriceCents,
            refPack3Cents:  p.ref_pack3_price_cents   ?? fb.refPack3Cents,
            trailingDdPct: trailingDd,
          };
        });
        setCards(merged);
      })
      .catch(() => {});
  }, []);

  const fmtBalance = (b: number) => `$${Math.round(b / 1000)}K`;
  const fmtPrice   = (c: number) => `€${Math.round(c / 100)}`;
  const fmtDollar  = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

  const togglePack3 = (idx: number, enable: boolean) => {
    setPack3Set(prev => {
      const next = new Set(prev);
      enable ? next.add(idx) : next.delete(idx);
      return next;
    });
  };

  const renderCard = (card: V1Card, idx: number) => {
    const isPack3    = pack3Set.has(idx);
    const RULES = [
      { label: L("1 Étape","1 Paso","1 Step"),               value: "✓",                                                                                     accent: true  },
      { label: L("Objectif profit","Objetivo profit","Profit target"), value: showPct ? "+6%" : `+${fmtDollar(card.balance * 0.06)}`,                        accent: false },
      { label: L("Trailing DD EOD","Trailing DD EOD","Trailing DD EOD"), value: showPct ? `${card.trailingDdPct}%` : fmtDollar(card.balance * card.trailingDdPct / 100), accent: false },
      { label: L("Consistance","Consistencia","Consistency"), value: "≤ 50%",                                                                                   accent: false },
      { label: L("Jours min","Días mín","Min days"),          value: L("2 jours","2 días","2 days"),                                                           accent: false },
      { label: L("Durée max","Duración máx","Max duration"),  value: L("30 j. cal.","30 d. cal.","30 cal. days"),                                              accent: false },
    ];
    const isPopular  = card.balance === 50000;
    const isActive   = selIdx === idx;
    const isHovered  = hovIdx === idx && !isActive && !isMobile;
    const label      = fmtBalance(card.balance);

    // Prix affichés selon la sélection pack
    const displayPrice    = isPack3 ? fmtPrice(card.pack3Cents)   : fmtPrice(card.priceCents);
    const displayRefPrice = isPack3
      ? `€${Math.round(card.refPack3Cents / 100)}`
      : `€${Math.round(card.refPriceCents / 100)}`;

    return (
      <div
        key={card.slug}
        onClick={() => isMobile && setSelIdx(idx)}
        onMouseEnter={() => !isMobile && setHovIdx(idx)}
        onMouseLeave={() => !isMobile && setHovIdx(null)}
        style={{
          position:   "relative",
          background: "linear-gradient(145deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.012) 42%, #090909 100%)",
          border: `1px solid ${isHovered ? "rgba(255,255,255,0.42)" : isPopular ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.24)"}`,
          borderRadius: 20,
          padding:      "20px 18px 16px",
          display:      "flex",
          flexDirection: "column",
          gap:           0,
          cursor:        isMobile ? "pointer" : "default",
          transition:    "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
          transform:     isHovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow:     isPopular
            ? "inset 0 1px 0 rgba(255,255,255,0.09), 0 26px 64px rgba(0,0,0,0.82)"
            : isHovered
              ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 28px 66px rgba(0,0,0,0.84)"
              : "inset 0 1px 0 rgba(255,255,255,0.07), 0 22px 56px rgba(0,0,0,0.76)",
        }}
      >
        {/* Badge LE PLUS POPULAIRE */}
        {isPopular && (
          <div style={{
            position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
            background: "linear-gradient(115deg, #5f8ca4 0%, #d5f1ff 20%, #8fc4df 43%, #ecf9ff 62%, #74a9c4 82%, #c4e9fa 100%)", color: "#050505",
            fontSize: 8, fontWeight: 900, padding: "4px 16px",
            borderRadius: 100, letterSpacing: "1.8px", whiteSpace: "nowrap",
            border: "1px solid rgba(255,255,255,0.75)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(24,61,80,0.3), 0 4px 16px rgba(156,207,234,0.16)",
          }}>
            {L("LE PLUS POPULAIRE","EL MÁS POPULAR","MOST POPULAR")}
          </div>
        )}

        {/* Patch promo -90% — toujours visible, à cheval sur le bouton Pack ×3 */}
        <div style={{
          position:      "absolute",
          top:           88,
          right:         -6,
          transform:     "rotate(12deg)",
          zIndex:        3,
          pointerEvents: "none",
          background:    "linear-gradient(135deg, #ff6600 0%, #ff9900 100%)",
          color:         "#ffffff",
          fontSize:      10,
          fontWeight:    900,
          letterSpacing: "0.5px",
          padding:       "2px 9px",
          borderRadius:  5,
          border:        "1px solid rgba(255,180,0,0.50)",
          boxShadow:     "0 0 12px rgba(255,138,0,0.80), 0 0 5px rgba(255,138,0,0.50)",
        }}>
          -90%
        </div>

        {/* En-tête — taille de compte + bouton "i" */}
        <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{
                fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)",
                letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 5,
              }}>
                {L("Compte simulé","Cuenta simulada","Simulated account")}
              </div>
              <div style={{ fontSize: 34, fontWeight: 900, color: "#FFFFFF", letterSpacing: "0px", lineHeight: 1 }}>
                {label}
              </div>
            </div>
            {/* Bouton info pédagogique */}
            <button
              onClick={e => {
                e.stopPropagation();
                triggerElRef.current = e.currentTarget;
                setActiveModal(idx);
              }}
              aria-label={L(`Détails du Challenge ${label}`,`Detalles del Challenge ${label}`,`Challenge ${label} details`)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                border:      "1px solid rgba(156,207,234,0.35)",
                background:  "rgba(156,207,234,0.08)",
                color:       "#9CCFEA",
                fontSize:    11, fontWeight: 900, fontStyle: "normal",
                cursor:      "pointer",
                display:     "grid", placeItems: "center",
                flexShrink:  0, marginTop: 4,
                fontFamily:  "inherit",
                transition:  "all 0.16s ease",
              }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(156,207,234,0.20)"; b.style.borderColor = "rgba(156,207,234,0.65)"; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(156,207,234,0.08)"; b.style.borderColor = "rgba(156,207,234,0.35)"; }}
            >
              i
            </button>
          </div>
        </div>

        {/* ── Sélecteur 1 Challenge / Pack ×3 ── */}
        <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
          {[false, true].map(is3 => (
            <button
              key={String(is3)}
              onClick={e => { e.stopPropagation(); togglePack3(idx, is3); }}
              style={{
                flex:       1,
                padding:    "5px 0",
                borderRadius: 8,
                fontSize:   10,
                fontWeight: 800,
                border:     (isPack3 === is3)
                  ? "1.5px solid rgba(156,207,234,0.65)"
                  : "1.5px solid rgba(255,255,255,0.10)",
                background: (isPack3 === is3)
                  ? "rgba(156,207,234,0.13)"
                  : "transparent",
                color:      (isPack3 === is3)
                  ? "#9CCFEA"
                  : "rgba(255,255,255,0.30)",
                cursor:     "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.3px",
                transition: "all 0.16s ease",
              }}
            >
              {is3
                ? L("Pack ×3","Pack ×3","Pack ×3")
                : L("1 Challenge","1 Challenge","1 Challenge")}
            </button>
          ))}
        </div>

        {/* Prix */}
        <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
          <div style={{
            fontSize: 9, fontWeight: 700, color: isPack3 ? "#ff6600" : "#22c55e",
            letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6,
          }}>
            {isPack3
              ? "PACK ×3 BEST DEAL"
              : L("Accès challenge","Acceso challenge","Challenge access")}
          </div>

          {/* Prix de référence barré */}
          <div style={{
            fontSize:       15,
            fontWeight:     500,
            color:          "rgba(255,255,255,0.28)",
            textDecoration: "line-through",
            letterSpacing:  "0.5px",
            lineHeight:     1,
            marginBottom:   4,
          }}>
            {displayRefPrice}
          </div>

          {/* Prix de lancement — dominant */}
          <div style={{ fontSize: 36, fontWeight: 900, color: "#FFFFFF", letterSpacing: "0px", lineHeight: 1 }}>
            {displayPrice}
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.26)", marginTop: 4, fontWeight: 500 }}>
            {isPack3
              ? L("3 Challenges · Paiement unique","3 Challenges · Pago único","3 Challenges · One-time")
              : L("Paiement unique · non remboursable","Pago único · no reembolsable","One-time · non-refundable")}
          </div>
        </div>

        {/* Règles */}
        <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
          {RULES.map((rule, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "4px 0",
              borderBottom: i < RULES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", fontWeight: 500 }}>{rule.label}</span>
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: rule.accent ? "#9CCFEA" : "#FFFFFF",
              }}>{rule.value}</span>
            </div>
          ))}
          {/* Activation Reward Account — spécifique par carte */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "4px 0",
          }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", fontWeight: 500 }}>
              {L("Activation Compte Reward","Activación Compte Reward","Compte Reward activation")}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
              {card.activFeeEur}€
            </span>
          </div>
        </div>

        {/* CTA */}
        <a
          href={`/checkout?product=${card.slug}${isPack3 ? "&qty=3" : ""}`}
          className="pricing-chrome-cta"
          onClick={e => e.stopPropagation()}
          style={{
            display:       "flex",
            alignItems:    "center",
            justifyContent:"center",
            padding:       "11px 16px",
            marginTop:     8,
            borderRadius:  10,
            fontSize:      12,
            fontWeight:    900,
            letterSpacing: "1.8px",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          {isPack3
            ? L("DÉMARRER ×3","EMPEZAR ×3","GET STARTED ×3")
            : L("DÉMARRER","EMPEZAR","GET STARTED")}
        </a>
      </div>
    );
  };

  return (
    <section
      id="pricing"
      style={{
        padding:         isMobile ? "48px 16px" : "64px 24px",
        backgroundColor: "#000000",
        scrollMarginTop: "calc(72px + var(--promo-banner-height, 0px))",
        position:        "relative",
        overflowX:       "hidden",
      }}
    >
      <style>{`
        @keyframes pricingChromeSweep {
          0%   { transform: translateX(-135%); }
          55%  { transform: translateX(-135%); }
          100% { transform: translateX(135%); }
        }
        .pricing-chrome-cta {
          position: relative;
          overflow: hidden;
          background: linear-gradient(115deg, #5f8ca4 0%, #d5f1ff 18%, #8fc4df 34%, #ecf9ff 48%, #74a9c4 62%, #c4e9fa 78%, #5f8ca4 100%);
          color: #050505;
          border: 1px solid rgba(255,255,255,0.82);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -1px 0 rgba(24,61,80,0.30), 0 8px 24px rgba(156,207,234,0.10);
          transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
        }
        .pricing-chrome-cta::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.12) 38%, rgba(255,255,255,0.72) 48%, rgba(255,255,255,0.14) 58%, transparent 72%);
          transform: translateX(-135%);
          pointer-events: none;
          animation: pricingChromeSweep 4.5s ease-in-out infinite;
        }
        .pricing-chrome-cta:hover {
          transform: translateY(-2px);
          filter: brightness(1.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 10px 30px rgba(255,255,255,0.09);
        }
        .pricing-chrome-cta:active { transform: translateY(0) scale(0.99); }
        @media (prefers-reduced-motion: reduce) {
          .pricing-chrome-cta::before { animation: none; }
        }
      `}</style>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Titre section ── */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 14 }}>
          <h2 style={{
            fontSize:      isMobile ? "clamp(1.8rem, 7vw, 2.6rem)" : "clamp(2rem, 2.6vw, 3.4rem)",
            fontWeight:    900,
            color:         "#FFFFFF",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            lineHeight:    1.05,
            margin:        "0 0 8px",
          }}>
            {L("Choisissez votre","Elige tu","Choose your")}{" "}
            <span style={{ color: "#9CCFEA" }}>
              {L("Challenge","Desafío","Challenge")}
            </span>
          </h2>
        </div>

        {/* ── Toggle % / $ ── */}
        <div style={{
          display: "flex", justifyContent: "center",
          marginBottom: isMobile ? 18 : 12,
        }}>
          <button
            onClick={() => setShowPct(v => !v)}
            aria-label={L(
              `Afficher les règles en ${showPct ? "dollars" : "pourcentages"}`,
              `Mostrar las reglas en ${showPct ? "dólares" : "porcentajes"}`,
              `Show rules in ${showPct ? "dollars" : "percentages"}`
            )}
            style={{
              display:      "inline-flex",
              alignItems:   "center",
              gap:          8,
               padding:      "7px 16px",
              borderRadius: 10,
              border:       `1px solid ${showPct ? "rgba(255,255,255,0.09)" : "rgba(156,207,234,0.35)"}`,
              background:   showPct ? "#121212" : "rgba(156,207,234,0.08)",
              color:        "#9CCFEA",
              fontSize:     12, fontWeight: 700,
              cursor:       "pointer",
              fontFamily:   "inherit",
              letterSpacing: "0.3px",
              transition:   "all 0.18s ease",
              whiteSpace:   "nowrap",
            }}
          >
            <span style={{ fontWeight: 900, fontSize: 14 }}>%</span>
            <span style={{ fontSize: 11, letterSpacing: "-1px" }}>⇄</span>
            <span style={{ fontWeight: 900, fontSize: 14 }}>$</span>
            <span style={{ fontSize: 11, marginLeft: 2 }}>
              {showPct
                ? L("Voir en $","Ver en $","View in $")
                : L("Voir en %","Ver en %","View in %")}
            </span>
          </button>
        </div>

        {/* ── Mobile : selector tabs ── */}
        {isMobile && (
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            {cards.map((card, i) => (
              <button
                key={card.slug}
                onClick={() => setSelIdx(i)}
                style={{
                  flex:         "1 1 0",
                  padding:      "12px 0",
                  borderRadius: 28,
                  border:       selIdx === i ? "none" : "1px solid rgba(255,255,255,0.10)",
                  background:   selIdx === i ? "#9CCFEA" : "#171717",
                  color:        selIdx === i ? "#000" : "rgba(255,255,255,0.52)",
                  fontSize:     14,
                  fontWeight:   800,
                  cursor:       "pointer",
                  fontFamily:   "inherit",
                  transition:   "all 0.18s ease",
                  boxShadow:    selIdx === i ? "0 6px 18px rgba(156,207,234,0.30)" : "0 4px 14px rgba(0,0,0,0.40)",
                }}
              >
                {fmtBalance(card.balance)}
              </button>
            ))}
          </div>
        )}

        {/* ── Desktop : 3 cartes ── */}
        {!isMobile && (
          <div style={{
            display:             "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap:                 16,
            alignItems:          "flex-start",
            padding:             "8px 0 8px",
          }}>
            {cards.map((card, i) => renderCard(card, i))}
          </div>
        )}

        {/* ── Mobile : carte sélectionnée ── */}
        {isMobile && (
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            {renderCard(cards[selIdx], selIdx)}
          </div>
        )}

      </div>

      {/* ── Modal pédagogique ── */}
      <PricingDetailModal
        card={activeModal !== null ? cards[activeModal] : null}
        lang={lang}
        onClose={() => {
          setActiveModal(null);
          (triggerElRef.current as HTMLElement | null)?.focus();
          triggerElRef.current = null;
        }}
      />
    </section>
  );
}
