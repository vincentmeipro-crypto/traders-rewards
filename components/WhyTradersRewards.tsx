"use client";

// ════════════════════════════════════════════════════════════════
//  WhyTradersRewards.tsx — 5 arguments clés, Traders Rewards V1
//  Design : metric-led · palette #000/#111/blanc/gris/#9CCFEA
//  Pas d'emoji · SVG inline · 5 colonnes desktop, colonne mobile
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

// ── SVG icons ─────────────────────────────────────────────────

const IconTag = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const IconTrendUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IconShield = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconLayers = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);

const IconBarChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
);

// ── Data ───────────────────────────────────────────────────────

interface Feature {
  num:    string;
  metric: string;
  title:  string;
  desc:   string;
  icon:   React.ReactNode;
  badge?: string;   // ligne mise en évidence sous le descriptif (optionnel)
}

const FEATURES_FR: Feature[] = [
  {
    num: "01", metric: "19€",
    title: "PETIT PRIX",
    desc:  "Accédez au Challenge Traders Rewards à partir de 19€ avec trois tailles de comptes simulés : 25K, 50K et 100K USD.",
    icon: <IconTag />,
  },
  {
    num: "02", metric: "+6%",
    title: "1 SEUL OBJECTIF",
    desc:  "Un seul Challenge à valider. Objectif +6%, minimum 2 journées de trading. 30 jours maximum.",
    icon: <IconTrendUp />,
  },
  {
    num: "03", metric: "EOD",
    title: "RÈGLES SIMPLES",
    desc:  "Trailing drawdown EOD de 4% sur les comptes 25K et 50K, et de 3% sur le 100K.",
    icon: <IconShield />,
  },
  {
    num: "04", metric: "∞",
    title: "TEMPS ILLIMITÉ",
    desc:  "Après validation du Challenge et activation du Compte Reward, le trader entre dans un parcours conçu pour durer — durée illimitée.",
    icon: <IconLayers />,
  },
  {
    num: "05", metric: "×5",
    title: "5 NIVEAUX DE REWARDS",
    desc:  "Progressez à travers 5 Rewards successifs dont les montants maximums augmentent selon le niveau et la taille du compte.",
    icon: <IconBarChart />,
  },
];

const FEATURES_EN: Feature[] = [
  {
    num: "01", metric: "€19",
    title: "LOW ENTRY PRICE",
    desc:  "Access the Traders Rewards Challenge from €19 with three simulated account sizes: 25K, 50K and 100K USD.",
    icon: <IconTag />,
  },
  {
    num: "02", metric: "+6%",
    title: "1 SINGLE TARGET",
    desc:  "One challenge to validate. Target: +6%, minimum 2 trading days. 30 days maximum.",
    icon: <IconTrendUp />,
  },
  {
    num: "03", metric: "EOD",
    title: "SIMPLE RULES",
    desc:  "4% trailing EOD drawdown on 25K and 50K accounts, and 3% on the 100K.",
    icon: <IconShield />,
  },
  {
    num: "04", metric: "∞",
    title: "UNLIMITED TIME",
    desc:  "After passing the Challenge and activating the Compte Reward, the trader enters a journey designed to last — unlimited duration.",
    icon: <IconLayers />,
  },
  {
    num: "05", metric: "×5",
    title: "5 REWARD LEVELS",
    desc:  "Progress through 5 successive Rewards whose maximum amounts increase with level and account size.",
    icon: <IconBarChart />,
  },
];

const FEATURES_ES: Feature[] = [
  {
    num: "01", metric: "19€",
    title: "PRECIO ACCESIBLE",
    desc:  "Accede al Challenge Traders Rewards desde 19€ con tres tamaños de cuenta simulados: 25K, 50K y 100K USD.",
    icon: <IconTag />,
  },
  {
    num: "02", metric: "+6%",
    title: "1 SOLO OBJETIVO",
    desc:  "Un único Challenge a validar. Objetivo +6%, mínimo 2 días de trading. 30 días máximo.",
    icon: <IconTrendUp />,
  },
  {
    num: "03", metric: "EOD",
    title: "REGLAS SIMPLES",
    desc:  "Trailing drawdown EOD del 4% en las cuentas 25K y 50K, y del 3% en la 100K.",
    icon: <IconShield />,
  },
  {
    num: "04", metric: "∞",
    title: "TIEMPO ILIMITADO",
    desc:  "Tras validar el Challenge y activar el Compte Reward, el trader entra en un camino diseñado para durar — duración ilimitada.",
    icon: <IconLayers />,
  },
  {
    num: "05", metric: "×5",
    title: "5 NIVELES DE REWARDS",
    desc:  "Progresa a través de 5 Rewards sucesivos cuyos montos máximos aumentan según el nivel y el tamaño de cuenta.",
    icon: <IconBarChart />,
  },
];

// ── Composant ─────────────────────────────────────────────────

export default function WhyTradersRewards() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L   = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
  const features = isFr ? FEATURES_FR : isEs ? FEATURES_ES : FEATURES_EN;

  const [isNarrow, setIsNarrow] = useState(false); // < 900px

  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section
      aria-labelledby="why-heading"
      style={{
        padding:         isNarrow ? "48px 16px" : "64px 24px",
        backgroundColor: "#000000",
        position:        "relative",
        overflow:        "hidden",
      }}
    >
      {/* Halo de fond */}
      <div aria-hidden="true" style={{
        position:      "absolute",
        top:           "10%",
        left:          "50%",
        width:         "min(860px, 82vw)",
        height:        300,
        transform:     "translateX(-50%)",
        borderRadius:  "50%",
        background:    "radial-gradient(ellipse, rgba(156,207,234,0.05), transparent 65%)",
        filter:        "blur(24px)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Titre */}
        <div style={{ textAlign: "center", marginBottom: isNarrow ? 32 : 52 }}>
          <h2
            id="why-heading"
            style={{
              fontSize:      isNarrow ? "clamp(1.8rem, 7vw, 2.6rem)" : "clamp(2rem, 2.6vw, 3.4rem)",
              fontWeight:    900,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              lineHeight:    1.05,
              margin:        0,
            }}
          >
            <span style={{ color: "#FFFFFF" }}>
              {L("Pourquoi", "¿Por qué", "Why")}
            </span>
            {" "}
            <span style={{ color: "#9CCFEA" }}>
              {L("Traders Rewards ?", "Traders Rewards ?", "Traders Rewards ?")}
            </span>
          </h2>
        </div>

        {/* Feature grid — 5 colonnes desktop, colonne mobile */}
        <div
          style={{
            border:       "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            background:   "linear-gradient(160deg, #0b0c0f 0%, #060708 100%)",
            overflow:     "hidden",
          }}
        >
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: isNarrow ? "1fr" : "repeat(5, 1fr)",
            }}
          >
            {features.map((f, i) => {
              const isLast   = i === features.length - 1;
              const showDiv  = isNarrow ? !isLast : i < features.length - 1;
              const divStyle = isNarrow
                ? { borderBottom: "1px solid rgba(255,255,255,0.07)" }
                : { borderRight:  "1px solid rgba(255,255,255,0.07)" };

              return (
                <div
                  key={i}
                  style={{
                    padding:     isNarrow ? "22px 22px" : "28px 20px 26px",
                    display:     "flex",
                    flexDirection: isNarrow ? "row" : "column",
                    gap:         isNarrow ? 20 : 0,
                    alignItems:  isNarrow ? "flex-start" : "flex-start",
                    ...(showDiv ? divStyle : {}),
                  }}
                >
                  {/* En-tête: numéro + icône */}
                  <div style={{
                    display:        "flex",
                    justifyContent: "space-between",
                    alignItems:     "flex-start",
                    width:          isNarrow ? 48 : "100%",
                    flexShrink:     isNarrow ? 0 : undefined,
                    marginBottom:   isNarrow ? 0 : 18,
                  }}>
                    {isNarrow ? (
                      // Mobile: numéro seulement (icône plus bas)
                      <div style={{
                        width:       44,
                        height:      44,
                        borderRadius: 11,
                        border:      "1px solid rgba(156,207,234,0.20)",
                        background:  "rgba(156,207,234,0.06)",
                        display:     "grid",
                        placeItems:  "center",
                        color:       "#9CCFEA",
                        flexShrink:  0,
                      }}>
                        {f.icon}
                      </div>
                    ) : (
                      <>
                        <span style={{
                          fontSize:      8,
                          fontWeight:    800,
                          color:         "rgba(156,207,234,0.50)",
                          letterSpacing: "2px",
                          lineHeight:    1,
                          paddingTop:    1,
                        }}>
                          {f.num}
                        </span>
                        <div style={{ color: "rgba(255,255,255,0.25)" }}>{f.icon}</div>
                      </>
                    )}
                  </div>

                  {/* Corps */}
                  <div style={{ flex: 1 }}>

                    {/* ── ROW MÉTRIQUE : hauteur fixe commune → LIGNE A alignée ── */}
                    <div style={{
                      height:       isNarrow ? "auto" : 80, // même zone pour les 5 cartes
                      display:      "flex",
                      alignItems:   "center",               // centre vertical du glyphe
                      overflow:     "visible",              // ∞ peut déborder ±8px sans impact layout
                      marginBottom: isNarrow ? 10 : 14,
                    }}>
                      <div style={{
                        fontSize:      f.metric === "∞"
                          ? (isNarrow ? 77 : 97)
                          : (isNarrow ? 46 : 58),
                        fontWeight:    900,
                        color:         "#9CCFEA",
                        lineHeight:    1,                   // uniforme — le wrapper gère le centrage
                        letterSpacing: f.metric === "∞" ? "0px" : "-1px",
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {f.metric}
                      </div>
                    </div>

                    {/* ── ROW TITRE → LIGNE B alignée (démarre toujours à 80+14=94px) ── */}
                    <div style={{
                      fontSize:      isNarrow ? 11 : 10,
                      fontWeight:    800,
                      color:         "#FFFFFF",
                      letterSpacing: "0.6px",
                      textTransform: "uppercase",
                      marginBottom:  isNarrow ? 6 : 10,
                      lineHeight:    1.3,
                    }}>
                      {f.title}
                    </div>

                    {/* Description */}
                    <p style={{
                      fontSize:   isNarrow ? 13 : 11.5,
                      color:      "rgba(255,255,255,0.40)",
                      lineHeight: 1.65,
                      margin:     0,
                    }}>
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
