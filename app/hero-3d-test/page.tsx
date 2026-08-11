"use client";
// ── /hero-3d-test — Page de test isolée Hero 3D ───────────────────────────────
//
// ATTENTION : Cette page est UNIQUEMENT pour tester le prototype 3D.
// Elle ne touche PAS à Hero.tsx ni à app/page.tsx.
// Elle peut être supprimée après validation visuelle.
//
// Fonctionnalités de test :
//   - Barre de contrôles dev en haut (viewport, reducedMotion)
//   - Layout 2 colonnes : texte Hero factice (gauche) + Canvas 3D (droite)
//   - Viewport toggle : Desktop / Tablet / Mobile (simule la taille du Canvas)
//   - reducedMotion toggle
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import TrophySceneClient from "@/components/hero3d/TrophyScene.client";

// ── Types ──────────────────────────────────────────────────────────────────────
type Viewport = "desktop" | "tablet" | "mobile";

const VIEWPORT_CONFIG: Record<Viewport, { label: string; canvasWidth: number; canvasHeight: number; isMobile: boolean }> = {
  desktop: { label: "🖥  Desktop",  canvasWidth: 560, canvasHeight: 600, isMobile: false },
  tablet:  { label: "📱 Tablet",   canvasWidth: 360, canvasHeight: 480, isMobile: false },
  mobile:  { label: "📱 Mobile",   canvasWidth: 280, canvasHeight: 380, isMobile: true  },
};

// ── Styles inline (pas de dépendance CSS externe) ─────────────────────────────
const STYLES = {
  page: {
    minHeight:       "100vh",
    background:      "#04040a",
    color:           "#fff",
    fontFamily:      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display:         "flex" as const,
    flexDirection:   "column" as const,
  },

  devBar: {
    background:    "rgba(255,255,255,0.04)",
    borderBottom:  "1px solid rgba(255,255,255,0.08)",
    padding:       "10px 20px",
    display:       "flex" as const,
    alignItems:    "center" as const,
    gap:           16,
    flexWrap:      "wrap" as const,
    fontSize:      12,
    color:         "rgba(255,255,255,0.5)",
  },

  devLabel: {
    color:         "rgba(255,255,255,0.35)",
    marginRight:   4,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    fontSize:      10,
  },

  devBadge: {
    background:    "rgba(29,78,216,0.15)",
    border:        "1px solid rgba(29,78,216,0.4)",
    color:         "#93b4fc",
    padding:       "2px 8px",
    borderRadius:  4,
    fontSize:      11,
    fontWeight:    600 as const,
    letterSpacing: "0.03em",
  },

  main: {
    flex:           1,
    display:        "flex" as const,
    alignItems:     "flex-start" as const,
    justifyContent: "center" as const,
    gap:            48,
    padding:        "60px 40px",
    flexWrap:       "wrap" as const,
  },

  textCol: {
    flex:       "1 1 320px",
    maxWidth:   520,
    display:    "flex" as const,
    flexDirection: "column" as const,
    gap:        24,
    paddingTop: 24,
  },

  eyebrow: {
    display:       "inline-block",
    background:    "rgba(29,78,216,0.15)",
    border:        "1px solid rgba(29,78,216,0.4)",
    color:         "#93b4fc",
    padding:       "4px 14px",
    borderRadius:  999,
    fontSize:      12,
    fontWeight:    600 as const,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    width:         "fit-content",
  },

  headline: {
    fontSize:    "clamp(32px, 5vw, 52px)",
    fontWeight:  800 as const,
    lineHeight:  1.15,
    letterSpacing: "-0.02em",
    margin:      0,
    color:       "#ffffff",
  },

  headlineAccent: {
    color: "#3b82f6",
  },

  subline: {
    fontSize:   16,
    lineHeight: 1.6,
    color:      "rgba(255,255,255,0.5)",
    maxWidth:   420,
    margin:     0,
  },

  ctaRow: {
    display:   "flex" as const,
    gap:       12,
    flexWrap:  "wrap" as const,
  },

  ctaPrimary: {
    background:    "#1d4ed8",
    color:         "#fff",
    border:        "none",
    padding:       "12px 28px",
    borderRadius:  8,
    fontSize:      15,
    fontWeight:    700 as const,
    cursor:        "pointer" as const,
    letterSpacing: "0.01em",
  },

  ctaSecondary: {
    background:    "transparent",
    color:         "rgba(255,255,255,0.6)",
    border:        "1px solid rgba(255,255,255,0.15)",
    padding:       "12px 28px",
    borderRadius:  8,
    fontSize:      15,
    fontWeight:    600 as const,
    cursor:        "pointer" as const,
  },

  statsRow: {
    display:       "flex" as const,
    gap:           24,
    paddingTop:    8,
  },

  statItem: {
    display:       "flex" as const,
    flexDirection: "column" as const,
    gap:           2,
  },

  statValue: {
    fontSize:    20,
    fontWeight:  800 as const,
    color:       "#ffffff",
    letterSpacing: "-0.01em",
  },

  statLabel: {
    fontSize: 11,
    color:    "rgba(255,255,255,0.35)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },

  canvasWrapper: {
    borderRadius:  16,
    overflow:      "hidden",
    border:        "1px solid rgba(59,130,246,0.15)",
    boxShadow:     "0 0 60px rgba(29,78,216,0.12), 0 8px 40px rgba(0,0,0,0.6)",
    transition:    "width 0.3s ease, height 0.3s ease",
    flexShrink:    0,
  },

  footer: {
    textAlign:  "center" as const,
    padding:    "24px 20px 32px",
    fontSize:   11,
    color:      "rgba(255,255,255,0.18)",
    borderTop:  "1px solid rgba(255,255,255,0.05)",
    letterSpacing: "0.04em",
  },
};

// ── Composant bouton toggle ────────────────────────────────────────────────────
function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active:   boolean;
  onClick:  () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background:    active ? "rgba(29,78,216,0.25)" : "transparent",
        border:        active ? "1px solid rgba(29,78,216,0.6)" : "1px solid rgba(255,255,255,0.12)",
        color:         active ? "#93b4fc" : "rgba(255,255,255,0.45)",
        padding:       "4px 12px",
        borderRadius:  6,
        fontSize:      12,
        fontWeight:    active ? 700 : 400,
        cursor:        "pointer",
        transition:    "all 0.15s",
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </button>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
export default function Hero3DTestPage() {
  const [viewport, setViewport]           = useState<Viewport>("desktop");
  const [reducedMotion, setReducedMotion] = useState(false);

  // Détecte prefers-reduced-motion au montage
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  const vp = VIEWPORT_CONFIG[viewport];

  return (
    <div style={STYLES.page}>

      {/* ── Barre dev ──────────────────────────────────────────────────────── */}
      <div style={STYLES.devBar}>
        {/* Badge prototype */}
        <span style={STYLES.devBadge}>⚗️ PROTOTYPE — /hero-3d-test</span>

        {/* Séparateur */}
        <span style={{ color: "rgba(255,255,255,0.12)" }}>|</span>

        {/* Viewport */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={STYLES.devLabel}>Viewport</span>
          {(["desktop", "tablet", "mobile"] as Viewport[]).map(v => (
            <ToggleBtn key={v} active={viewport === v} onClick={() => setViewport(v)}>
              {VIEWPORT_CONFIG[v].label}
            </ToggleBtn>
          ))}
        </div>

        {/* Séparateur */}
        <span style={{ color: "rgba(255,255,255,0.12)" }}>|</span>

        {/* reducedMotion */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={STYLES.devLabel}>Motion</span>
          <ToggleBtn active={!reducedMotion} onClick={() => setReducedMotion(false)}>
            ✅ Normal
          </ToggleBtn>
          <ToggleBtn active={reducedMotion} onClick={() => setReducedMotion(true)}>
            ⏸ Réduite
          </ToggleBtn>
        </div>

        {/* Info DPR */}
        <span style={{ marginLeft: "auto", color: "rgba(255,255,255,0.25)", fontSize: 10 }}>
          DPR cap : {vp.isMobile ? "1.0" : "1.5"} — isMobile : {String(vp.isMobile)}
        </span>
      </div>

      {/* ── Contenu principal ──────────────────────────────────────────────── */}
      <div style={STYLES.main}>

        {/* Colonne texte (mock Hero) */}
        <div style={STYLES.textCol}>
          <span style={STYLES.eyebrow}>Propfirm Trading · Depuis 2024</span>

          <h1 style={STYLES.headline}>
            Prouvez votre talent.
            <br />
            <span style={STYLES.headlineAccent}>Devenez Certifié.</span>
          </h1>

          <p style={STYLES.subline}>
            Traders Rewards finance les meilleurs traders indépendants.
            Passez les étapes, recevez votre capital alloué et tradez
            avec nos fonds — jusqu&apos;à 200 000 $.
          </p>

          <div style={STYLES.ctaRow}>
            <button style={STYLES.ctaPrimary}>
              Démarrer un challenge
            </button>
            <button style={STYLES.ctaSecondary}>
              Comment ça marche ?
            </button>
          </div>

          <div style={STYLES.statsRow}>
            {[
              { value: "200K$", label: "Capital max" },
              { value: "80%",   label: "Split certifié" },
              { value: "4.9★",  label: "Avis clients" },
            ].map(s => (
              <div key={s.label} style={STYLES.statItem}>
                <span style={STYLES.statValue}>{s.value}</span>
                <span style={STYLES.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Colonne Canvas 3D */}
        <div
          style={{
            ...STYLES.canvasWrapper,
            width:  vp.canvasWidth,
            height: vp.canvasHeight,
          }}
        >
          <TrophySceneClient
            isMobile={vp.isMobile}
            reducedMotion={reducedMotion}
          />
        </div>

      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={STYLES.footer}>
        Hero 3D Prototype — Traders Rewards · Validation visuelle uniquement
        · Ne pas déployer en production sans GO
      </div>

    </div>
  );
}
