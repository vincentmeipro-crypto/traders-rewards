"use client";

// ════════════════════════════════════════════════════════════════
//  Hero.tsx — Traders Rewards Premium
//  Visuel : /IMAGE HERO CHROME.png (fond noir · trophée chrome)
//  Technique : image absolute full-bleed + contenu HTML par-dessus
//  Direction couleur : Noir / Blanc / Chrome + #9CCFEA ~5-10%
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const ACCENT = "#9CCFEA";
const TITLE_ACCENT = "#9CCFEA";

export default function Hero() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L    = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  const [isMobile, setIsMobile] = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!mounted) return null;

  // ── i18n ─────────────────────────────────────────────────────
  const pill    = L("OFFRE DE LANCEMENT",     "OFERTA DE LANZAMIENTO", "LAUNCH OFFER");
  const h1L1    = L("UN SEUL CHALLENGE",         "UN SOLO CHALLENGE",       "ONE SINGLE CHALLENGE");
  const h1L2pre = L("DEVENEZ ",                  "CONVIÉRTETE EN ",         "BECOME A ");
  const h1L2acc = "TRADER REWARD";
  const ctaMain = L("CHOISIR MON CHALLENGE",    "ELEGIR MI CHALLENGE",     "CHOOSE MY CHALLENGE");
  const ctaSub  = L("DÉCOUVRIR LE PARCOURS",    "DESCUBRIR EL CAMINO",     "EXPLORE THE JOURNEY");

  // Sous-titre — spans couleur inline par langue
  const subtitle = isFr ? (
    <>
      Relevez le{" "}<span style={{ color: ACCENT }}>Challenge</span>.
      {" "}Prouvez votre discipline.{" "}
      Encaissez vos{" "}<span style={{ color: ACCENT }}>Rewards</span>.
    </>
  ) : isEs ? (
    <>
      Supera el{" "}<span style={{ color: ACCENT }}>Challenge</span>.
      {" "}Demuestra tu disciplina.{" "}
      Cobra tus{" "}<span style={{ color: ACCENT }}>Rewards</span>.
    </>
  ) : (
    <>
      Pass the{" "}<span style={{ color: ACCENT }}>Challenge</span>.
      {" "}Prove your discipline.{" "}
      Cash your{" "}<span style={{ color: ACCENT }}>Rewards</span>.
    </>
  );

  const promoFS = isMobile
    ? "clamp(2.4rem, 10vw, 3.6rem)"
    : "clamp(2.8rem, 4vw, 5rem)";

  return (
    <>
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pillDot {
          0%, 100% { box-shadow: 0 0 6px rgba(156,207,234,0.90); }
          50%       { box-shadow: 0 0 14px rgba(156,207,234,0.40); opacity: 0.55; }
        }

        /* ── Reflet chrome qui traverse le bouton lentement ── */
        @keyframes chromeSweep {
          0%   { transform: translateX(-130%); }
          55%  { transform: translateX(-130%); }
          100% { transform: translateX(130%); }
        }

        /* ── CTA principal : plaque métal chrome poli ── */
        .h-cta-main {
          display: inline-flex; align-items: center; gap: 10px;
          position: relative; overflow: hidden;   /* ← indispensable pour le shine */
          background: linear-gradient(
            115deg,
            #5f8ca4  0%,
            #d5f1ff 18%,
            #8fc4df 34%,
            #ecf9ff 48%,
            #74a9c4 62%,
            #c4e9fa 78%,
            #5f8ca4 100%
          );
          color: #050505;
          font-weight: 900; letter-spacing: 1.8px; text-transform: uppercase;
          text-decoration: none; border-radius: 10px; cursor: pointer;
          font-family: inherit; white-space: nowrap;
          border: 1px solid rgba(255,255,255,0.82);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.92),
            inset 0 -1px 0 rgba(0,0,0,0.22),
            0 8px 30px rgba(156,207,234,0.10);
          transition: transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease;
        }

        /* Reflet lumineux — pseudo-element traversant */
        .h-cta-main::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent               25%,
            rgba(255,255,255,0.12)    38%,
            rgba(255,255,255,0.72)    48%,
            rgba(255,255,255,0.14)    58%,
            transparent               72%
          );
          transform: translateX(-130%);
          pointer-events: none;
          z-index: 1;
          animation: chromeSweep 4.5s ease-in-out infinite;
        }

        /* Flèche — glisse légèrement au hover */
        .h-cta-main svg {
          position: relative; z-index: 2;
          transition: transform 0.22s ease;
          flex-shrink: 0;
        }
        .h-cta-main:hover svg { transform: translateX(3px); }

        .h-cta-main:hover {
          transform: translateY(-2px);
          filter: brightness(1.07);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,1),
            inset 0 -1px 0 rgba(0,0,0,0.18),
            0 10px 34px rgba(255,255,255,0.09);
        }
        .h-cta-main:active {
          transform: translateY(0) scale(0.99);
        }
        .h-cta-main:focus-visible {
          outline: 2px solid rgba(255,255,255,0.72);
          outline-offset: 3px;
        }

        /* ── CTA secondaire : sombre, blanc au hover ── */
        .h-cta-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: rgba(255,255,255,0.72);
          font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
          text-decoration: none; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.24); cursor: pointer;
          font-family: inherit; white-space: nowrap;
          transition: border-color 0.22s ease, color 0.22s ease, transform 0.22s ease;
        }
        .h-cta-ghost:hover {
          border-color: rgba(255,255,255,0.52);
          color: #FFFFFF;
          transform: translateY(-2px);
        }
        .h-cta-ghost:focus-visible {
          outline: 2px solid rgba(255,255,255,0.50);
          outline-offset: 3px;
        }

        /* ── Effet chrome sur 19€ (CTA — conservé pour compatibilité) ── */
        .h-price-chrome {
          background: linear-gradient(
            180deg,
            #ffffff 0%,
            #f3f3f3 35%,
            #8f8f8f 58%,
            #ffffff 76%,
            #b8b8b8 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Chrome métallique pour les grands chiffres du bloc promo ── */
        /* Appliqué à -90% ET 19€ pour cohérence visuelle parfaite      */
        .h-promo-chrome {
          background: linear-gradient(
            180deg,
            #ffffff  0%,
            #d8d8d8 18%,
            #7d7d7d 38%,
            #f8f8f8 52%,
            #a0a0a0 68%,
            #ffffff 82%,
            #777777 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          /* Relief subtil : luminosité haute + ombre de profondeur */
          filter: drop-shadow(0 1px 0 rgba(255,255,255,0.30))
                  drop-shadow(0 3px 6px rgba(0,0,0,0.50));
        }

        /* ── H1 : 3 lignes forcées sur desktop ──────────────────────
           white-space: nowrap empêche tout wrapping automatique.
           Désactivé sous 900px (mobile/tablette) pour ne pas déborder. */
        .h1-line {
          display:     block;
          white-space: nowrap;
        }
        @media (max-width: 899px) {
          .h1-line { white-space: normal; }
        }

        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; }
          .h-cta-main, .h-cta-ghost { transition: none; }
          .h-cta-main::before { animation: none; }
        }
      `}</style>

      <section
        id="hero"
        aria-label="Hero Traders Rewards"
        style={{
          background: "#000000",      /* fallback si image non chargée */
          width:      "100%",
          position:   "relative",
          overflow:   "hidden",
          boxSizing:  "border-box",
          /* hauteur minimale : contenu naturel sur mobile, contrainte sur desktop */
          minHeight:  isMobile ? 0 : "min(850px, 88vh)",
        }}
      >

        {/* Image hero supprimée — fond noir du section */}

        {/* Dégradé gauche : sécurité de lisibilité supplémentaire sur le texte
            Très subtil — l'image est déjà sombre à gauche */}
        <div
          aria-hidden="true"
          style={{
            position:      "absolute",
            inset:         0,
            background:    isMobile
              ? "linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 55%, rgba(0,0,0,0.05) 100%)"
              : "linear-gradient(to right, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.22) 45%, rgba(0,0,0,0) 100%)",
            zIndex:        1,
            pointerEvents: "none",
          }}
        />

        {/* ══════════════════════════════════════════════════════
            CONTENU HTML — par-dessus l'image
            Desktop : largeur 55% · calé à gauche
            Mobile  : largeur 100% · empilé
        ══════════════════════════════════════════════════════ */}
        <div style={{
          position:  "relative",
          zIndex:    2,
          /* centrage vertical sur desktop grâce à flex + minHeight */
          display:   "flex",
          alignItems: "center",
          minHeight: isMobile ? "auto" : "min(850px, 88vh)",
          /* paddingTop compense la navbar fixe + la bannière promo */
          paddingTop: isMobile
            ? "calc(60px + var(--promo-banner-height, 0px))"
            : "calc(72px + var(--promo-banner-height, 0px))",
        }}>

          {/* Colonne de contenu : 58% desktop, 100% mobile
              58% (vs 55%) donne ~43px de plus à 1440px pour le H1
              maxWidth 960 : évite que la colonne déborde sur très grand écran
              paddingLeft réduit (4vw) → espace texte maximal */}
          <div style={{
            width:          isMobile ? "100%" : "58%",
            maxWidth:       isMobile ? "100%" : 960,
            display:        "flex",
            flexDirection:  "column",
            justifyContent: "center",
            paddingLeft:    isMobile ? 22 : "max(40px, 4vw)",
            paddingRight:   isMobile ? 22 : 24,
            paddingTop:     isMobile ? 28 : 52,
            paddingBottom:  isMobile ? 36 : 52,
          }}>

            {/* ── Badge offre de lancement ── */}
            <div style={{ marginBottom: isMobile ? 16 : 20, animation: "heroFadeUp 0.44s ease both" }}>
              <span style={{
                display:      "inline-flex",
                alignItems:   "center",
                gap:          9,
                background:   "rgba(255,255,255,0.06)",
                border:       "1px solid rgba(255,255,255,0.22)",
                borderRadius: 100,
                padding:      isMobile ? "6px 16px" : "7px 20px",
              }}>
                {/* Seul usage du bleu dans le badge : petit point pulse */}
                <span style={{
                  display:      "inline-block",
                  width:        6,
                  height:       6,
                  borderRadius: "50%",
                  background:   ACCENT,
                  flexShrink:   0,
                  animation:    "pillDot 2.4s ease-in-out infinite",
                }} />
                <span style={{
                  fontSize:      10,
                  fontWeight:    800,
                  color:         "#FFFFFF",
                  letterSpacing: "2.2px",
                  textTransform: "uppercase",
                  whiteSpace:    "nowrap",
                }}>
                  {pill}
                </span>
              </span>
            </div>

            {/* ══ H1 — 2 lignes ══
                Ligne 1 : UN SEUL CHALLENGE — blanc
                Ligne 2 : DEVENEZ blanc + TRADER REWARD #9CCFEA  */}
            <h1 style={{
              fontWeight:    900,
              margin:        "0 0 18px",
              textTransform: "uppercase",
              textAlign:     "left",
              letterSpacing: isMobile ? "0px" : "0.5px",
              lineHeight:    0.95,
              animation:     "heroFadeUp 0.52s ease 0.05s both",
            }}>
              {/* Ligne 1 : UN SEUL CHALLENGE — blanc */}
              <span
                className="h1-line"
                style={{
                  fontSize: isMobile ? "clamp(2rem, 7vw, 3.2rem)" : "clamp(58px, 4.4vw, 80px)",
                  color:    "#FFFFFF",
                }}
              >
                {h1L1}
              </span>
              {/* Ligne 2 : DEVENEZ blanc + TRADER REWARD #9CCFEA */}
              <span
                className="h1-line"
                style={{
                  marginTop: isMobile ? 4 : 6,
                  fontSize:  isMobile ? "clamp(2rem, 7vw, 3.2rem)" : "clamp(58px, 4.4vw, 80px)",
                }}
              >
                <span style={{ color: "#FFFFFF" }}>{h1L2pre}</span>
                <span style={{ color: TITLE_ACCENT }}>{h1L2acc}</span>
              </span>
            </h1>

            {/* ── Sous-titre ── */}
            <p style={{
              margin:     "0 0 24px",
              fontSize:   isMobile ? 13 : 14.5,
              lineHeight: 1.6,
              color:      "rgba(255,255,255,0.55)",
              maxWidth:   480,
              animation:  "heroFadeUp 0.52s ease 0.08s both",
            }}>
              {subtitle}
            </p>

            {/* ── Bloc promo chrome : -90% / 19€ ── */}
            <div style={{
              display:      "inline-flex",
              alignItems:   "stretch",
              alignSelf:    "flex-start",
              /* Fond noir très légèrement translucide + dégradé chrome subtil */
              background:   "linear-gradient(135deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.012) 100%)",
              border:       "1px solid rgba(255,255,255,0.28)",
              borderRadius: 16,
              padding:      isMobile ? "14px 18px" : "18px 28px",
              marginBottom: isMobile ? 20 : 24,
              animation:    "heroFadeUp 0.52s ease 0.12s both",
              /* Relief inset : arête haute lumineuse + ombre externe profonde */
              boxShadow:    "inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 35px rgba(0,0,0,0.35)",
              backdropFilter:       "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            } as React.CSSProperties}>

              {/* Colonne gauche : -90% */}
              <div>
                {/* Label supérieur */}
                <div style={{
                  fontSize:      9,
                  fontWeight:    700,
                  color:         "rgba(255,255,255,0.44)",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  marginBottom:  3,
                }}>
                  {L("JUSQU'À","HASTA","UP TO")}
                </div>
                {/* Grand chiffre chrome */}
                <div
                  className="h-promo-chrome"
                  style={{
                    fontSize:      promoFS,
                    fontWeight:    900,
                    letterSpacing: "-1px",
                    lineHeight:    0.90,
                    marginBottom:  5,
                  }}
                >
                  -90%
                </div>
                {/* Label inférieur */}
                <div style={{
                  fontSize:      9,
                  fontWeight:    700,
                  color:         "rgba(255,255,255,0.44)",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                }}>
                  {L("SUR VOTRE CHALLENGE","EN TU CHALLENGE","ON YOUR CHALLENGE")}
                </div>
              </div>

              {/* Séparateur vertical fin */}
              <div style={{
                width:      1,
                alignSelf:  "stretch",
                background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.22) 20%, rgba(255,255,255,0.22) 80%, transparent)",
                margin:     isMobile ? "0 16px" : "0 24px",
                flexShrink: 0,
              }} />

              {/* Colonne droite : 19€ */}
              <div>
                {/* Label supérieur */}
                <div style={{
                  fontSize:      9,
                  fontWeight:    700,
                  color:         "rgba(255,255,255,0.44)",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  marginBottom:  3,
                }}>
                  {L("À PARTIR DE","DESDE","FROM")}
                </div>
                {/* Grand chiffre chrome — même système que -90% */}
                <div
                  className="h-promo-chrome"
                  style={{
                    fontSize:      promoFS,
                    fontWeight:    900,
                    letterSpacing: "-1px",
                    lineHeight:    0.90,
                    marginBottom:  5,
                  }}
                >
                  19€
                </div>
                {/* Label inférieur */}
                <div style={{
                  fontSize:      9,
                  fontWeight:    700,
                  color:         "rgba(255,255,255,0.44)",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                }}>
                  {L("PAIEMENT UNIQUE","PAGO ÚNICO","ONE-TIME PAYMENT")}
                </div>
              </div>
            </div>

            {/* ── CTAs ── */}
            <div style={{
              display:    "flex",
              gap:        isMobile ? 10 : 12,
              flexWrap:   "nowrap",
              alignItems: "center",
              animation:  "heroFadeUp 0.52s ease 0.16s both",
            }}>
              {/* CTA principal — blanc / chrome */}
              <a
                href="#pricing"
                className="h-cta-main"
                style={{ fontSize: isMobile ? 11 : 12, padding: isMobile ? "13px 22px" : "15px 34px" }}
              >
                {ctaMain}
                <svg
                  width="14" height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>

              {/* CTA secondaire — transparent / blanc */}
              <a
                href="#parcours-3-niveaux"
                className="h-cta-ghost"
                style={{ fontSize: isMobile ? 11 : 12, padding: isMobile ? "13px 22px" : "15px 34px" }}
              >
                {ctaSub}
              </a>
            </div>

          </div>{/* fin colonne contenu */}
        </div>{/* fin wrapper zIndex 2 */}

      </section>
    </>
  );
}
