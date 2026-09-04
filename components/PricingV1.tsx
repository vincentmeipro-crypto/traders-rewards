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
          background: isPopular ? "#22262a" : "#1d2024",
          border: `1px solid ${isPopular ? "rgba(183,110,121,0.48)" : isHovered ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.075)"}`,
          borderRadius: 20,
          padding:      isMobile ? "24px 20px 20px" : "18px 20px 14px",
          display:      "flex",
          flexDirection: "column",
          gap:           0,
          cursor:        isMobile ? "pointer" : "default",
          transition:    "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
          transform:     isHovered ? "translateY(-2px)" : "translateY(0)",
          boxShadow:     isPopular
            ? "0 22px 60px rgba(0,0,0,0.44), 0 0 32px rgba(183,110,121,0.08)"
            : isHovered
              ? "0 20px 54px rgba(0,0,0,0.30)"
              : "0 14px 40px rgba(0,0,0,0.22)",
        }}
      >
        {/* Badge LE PLUS POPULAIRE */}
        {isPopular && (
          <div style={{
            position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #B76E79, #F1D0C8 55%, #9A5865)",
            color: "#2A0810",
            fontSize: 10, fontWeight: 750, padding: "6px 18px",
            borderRadius: 100, letterSpacing: "0.15px", whiteSpace: "nowrap",
            border: "1px solid rgba(241,208,200,0.40)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
          }}>
            {L("LE PLUS POPULAIRE","EL MÁS POPULAR","MOST POPULAR")}
          </div>
        )}

        {/* Patch promo -90% — toujours visible, à cheval sur le bouton Pack ×3 */}
        <div style={{
          position:      "absolute",
          top:           54,
          right:         28,
          zIndex:        3,
          pointerEvents: "none",
          background:    "rgba(200,162,72,0.10)",
          color:         "#C8A84B",
          fontSize:      9,
          fontWeight:    750,
          letterSpacing: "0.3px",
          padding:       "4px 8px",
          borderRadius:  100,
          border:        "1px solid rgba(200,162,72,0.36)",
          boxShadow:     "0 0 14px rgba(200,162,72,0.08)",
        }}>
          -90%
        </div>

        {/* En-tête — taille de compte + bouton "i" */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 650, color: "rgba(255,255,255,0.38)",
                letterSpacing: "1.7px", textTransform: "uppercase", marginBottom: 4,
              }}>
                {L("Compte simulé","Cuenta simulada","Simulated account")}
              </div>
              <div style={{ fontSize: 30, fontWeight: 720, color: "#F7F8FA", letterSpacing: "-1.2px", lineHeight: 1 }}>
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
                border:      "1px solid rgba(255,255,255,0.18)",
                background:  "transparent",
                color:       "rgba(255,255,255,0.62)",
                fontSize:    11, fontWeight: 900, fontStyle: "normal",
                cursor:      "pointer",
                display:     "grid", placeItems: "center",
                flexShrink:  0, marginTop: 4,
                fontFamily:  "inherit",
                transition:  "all 0.16s ease",
              }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.06)"; b.style.borderColor = "rgba(255,255,255,0.32)"; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.background = "transparent"; b.style.borderColor = "rgba(255,255,255,0.18)"; }}
            >
              i
            </button>
          </div>
        </div>

        {/* ── Sélecteur 1 Challenge / Pack ×3 ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, padding: 4, borderRadius: 10, background: "rgba(0,0,0,0.28)" }}>
          {[false, true].map(is3 => (
            <button
              key={String(is3)}
              onClick={e => { e.stopPropagation(); togglePack3(idx, is3); }}
              style={{
                flex:       1,
                padding:    "5px 0",
                borderRadius: 8,
                fontSize:   11,
                fontWeight: 650,
                border:     (isPack3 === is3)
                  ? "1px solid rgba(255,255,255,0.46)"
                  : "1px solid transparent",
                background: (isPack3 === is3)
                  ? "rgba(255,255,255,0.055)"
                  : "transparent",
                color:      (isPack3 === is3)
                  ? "#F5F7F8"
                  : "rgba(255,255,255,0.45)",
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
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.085)" }}>
          <div style={{
            fontSize: 10, fontWeight: isPack3 ? 750 : 650, color: isPack3 ? "#C8A84B" : "rgba(255,255,255,0.38)",
            letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4,
            textShadow: isPack3 ? "0 0 14px rgba(200,162,72,0.20)" : "none",
          }}>
            {isPack3
              ? "PACK ×3 BEST DEAL"
              : L("Accès challenge","Acceso challenge","Challenge access")}
          </div>

          {/* Prix de référence barré */}
          <div style={{
            fontSize:       14,
            fontWeight:     500,
            color:          "rgba(255,255,255,0.28)",
            textDecoration: "line-through",
            letterSpacing:  "0.5px",
            lineHeight:     1,
            marginBottom:   2,
          }}>
            {displayRefPrice}
          </div>

          {/* Prix de lancement — dominant */}
          <div style={{ fontSize: 34, fontWeight: 720, color: "#F7F8FA", letterSpacing: "-1.5px", lineHeight: 1 }}>
            {displayPrice}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 3, fontWeight: 450 }}>
            {isPack3
              ? L("3 Challenges · Paiement unique","3 Challenges · Pago único","3 Challenges · One-time")
              : L("Paiement unique · non remboursable","Pago único · no reembolsable","One-time · non-refundable")}
          </div>
        </div>

        {/* Règles */}
        <div style={{ marginBottom: 4, paddingBottom: 4 }}>
          {RULES.map((rule, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "4px 0",
              borderBottom: i < RULES.length - 1 ? "1px solid rgba(255,255,255,0.075)" : "none",
            }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 450 }}>{rule.label}</span>
              <span style={{
                display: "inline-flex", alignItems: "center",
                padding: "3px 9px", borderRadius: 6,
                background: "rgba(0,0,0,0.28)",
                border: `1px solid ${rule.accent ? "rgba(183,110,121,0.38)" : "rgba(255,255,255,0.08)"}`,
                fontSize: 12, fontWeight: 650,
                color: rule.accent ? "#D8A39D" : "rgba(255,255,255,0.88)",
                letterSpacing: "0.2px",
              }}>{rule.value}</span>
            </div>
          ))}
          {/* Activation Reward Account — spécifique par carte */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "4px 0",
            borderBottom: "1px solid rgba(255,255,255,0.075)",
          }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.62)", fontWeight: 450 }}>
              {L("Activation Compte Reward","Activación Compte Reward","Compte Reward activation")}
            </span>
            <span style={{
              display: "inline-flex", alignItems: "center",
              padding: "3px 9px", borderRadius: 6,
              background: "rgba(0,0,0,0.28)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12, fontWeight: 650,
              color: "rgba(255,255,255,0.88)",
              letterSpacing: "0.2px",
            }}>
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
            padding:       "9px 16px",
            marginTop:     4,
            borderRadius:  10,
            fontSize:      13,
            fontWeight:    700,
            letterSpacing: "0.3px",
            textTransform: "none",
            textDecoration: "none",
          }}
        >
          {isPack3
            ? L("Démarrer avec 3 Challenges","Empezar con 3 Challenges","Get started with 3 Challenges")
            : L("Démarrer","Empezar","Get started")}
        </a>
      </div>
    );
  };

  return (
    <section
      id="pricing"
      style={{
        padding:         isMobile ? "56px 16px" : "80px 28px 52px",
        backgroundColor: "#000000",
        fontFamily:      "var(--font-sans), system-ui, -apple-system, sans-serif",
        scrollMarginTop: "calc(72px + var(--promo-banner-height, 0px))",
        position:        "relative",
        overflowX:       "hidden",
      }}
    >
      <style>{`
        .pricing-chrome-cta {
          position: relative;
          overflow: hidden;
          background: #000000;
          color: #FFFFFF;
          border: 1px solid rgba(183,110,121,0.52);
          box-shadow: none;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .pricing-chrome-cta:hover {
          transform: translateY(-1px);
          background: rgba(255,255,255,0.03);
          border-color: rgba(216,163,157,0.85);
        }
        .pricing-chrome-cta:active { transform: translateY(0) scale(0.99); }
      `}</style>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>

        {/* ── Titre section ── */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 16 : 18 }}>
          <h2 style={{
            fontSize:      isMobile ? "clamp(2.1rem, 7vw, 2.75rem)" : "clamp(2.4rem, 3.5vw, 3.5rem)",
            fontWeight:    900,
            color:         "#FFFFFF",
            textTransform: "none",
            letterSpacing: "-2px",
            lineHeight:    1.08,
            margin:        "0 0 10px",
          }}>
            {L("Choisissez votre Challenge","Elige tu Desafío","Choose your Challenge")}
          </h2>
          <p style={{ maxWidth: isMobile ? 480 : 860, margin: "0 auto", color: "rgba(255,255,255,0.58)", fontSize: isMobile ? 14 : 16, lineHeight: 1.55, fontWeight: 400 }}>
            {L(
              "Sélectionnez la taille de compte simulé qui correspond à vos objectifs et progressez jusqu'à 5 Rewards.",
              "Seleccione el tamaño de cuenta simulada que mejor se adapte a sus objetivos y avance hasta 5 Rewards.",
              "Choose the simulated account size that fits your goals and progress through up to 5 Rewards."
            )}
          </p>
        </div>

        {/* ── Toggle % / $ ── */}
        <div style={{
          display: "flex", justifyContent: "center",
          marginBottom: isMobile ? 14 : 16,
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
              borderRadius: 100,
              border:       "1px solid rgba(255,255,255,0.10)",
              background:   "rgba(255,255,255,0.045)",
              color:        "rgba(255,255,255,0.62)",
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
                  border:       selIdx === i ? "1px solid rgba(200,162,72,0.55)" : "1px solid rgba(255,255,255,0.10)",
                  background:   selIdx === i ? "rgba(255,255,255,0.10)" : "#171717",
                  color:        selIdx === i ? "#FFFFFF" : "rgba(255,255,255,0.42)",
                  fontSize:     14,
                  fontWeight:   800,
                  cursor:       "pointer",
                  fontFamily:   "inherit",
                  transition:   "all 0.18s ease",
                  boxShadow:    selIdx === i ? "0 6px 18px rgba(0,0,0,0.30)" : "0 4px 14px rgba(0,0,0,0.40)",
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
            gap:                 24,
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
