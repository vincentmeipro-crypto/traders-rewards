"use client";
// ── FloatingLabel V2 (OrbitLabel.tsx) ─────────────────────────────────────────
// Label flottant à POSITION FIXE dans l'espace 3D.
// AUCUNE trajectoire orbitale. AUCUN cercle. AUCUN effet arcade.
//
// Comportement :
//   - Position fixe + très légère oscillation verticale (presque imperceptible)
//   - Cycle de fade temporel — un label franchement visible à la fois
//   - Typographie premium : blanc/gris + petit dot bleu
//   - 0 React re-renders en animation (manipulation DOM directe)
// ─────────────────────────────────────────────────────────────────────────────

import { useRef }   from "react";
import { useFrame } from "@react-three/fiber";
import { Html }     from "@react-three/drei";
import * as THREE   from "three";

export interface OrbitLabelProps {
  text:           string;
  /** Position fixe dans l'espace 3D */
  basePosition:   [number, number, number];
  /** Offset dans le cycle [0, 1] — décale quand ce label est au pic */
  cycleOffset:    number;
  isMobile?:      boolean;
  reducedMotion?: boolean;
}

// Durée d'un cycle complet pour les 4 labels (secondes)
const CYCLE_DURATION = 14;

export default function OrbitLabel({
  text,
  basePosition,
  cycleOffset,
  isMobile      = false,
  reducedMotion = false,
}: OrbitLabelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const divRef   = useRef<HTMLDivElement>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !divRef.current) return;

    const t = reducedMotion ? cycleOffset * CYCLE_DURATION : clock.getElapsedTime();

    // ── Opacité — cycle temporel cosinus ───────────────────────────────────
    // Chaque label a son propre offset → pic à des moments différents
    const cycleT  = (t / CYCLE_DURATION) % 1.0;           // [0, 1] dans le cycle
    const shifted = ((cycleT - cycleOffset) % 1.0 + 1.0) % 1.0; // décalé pour ce label
    const cosVal  = Math.cos(shifted * Math.PI * 2);       // [-1, +1], pic à 0
    const raw     = (cosVal + 1) / 2;                      // [0, 1], pic à shifted=0
    // Puissance 4 = visible seulement autour du pic
    // À raw=0.7 → 0.24 ; à raw=0.5 → 0.06 ; à raw<0.4 → ~0
    const opacity = Math.pow(raw, 4);

    // ── Flottement vertical — subtil, indépendant du cycle fade ───────────
    const floatY = reducedMotion
      ? 0
      : Math.sin(t * 0.28 + cycleOffset * Math.PI * 2) * 0.05;

    // Position mise à jour directement (pas de setState)
    groupRef.current.position.set(
      basePosition[0],
      basePosition[1] + floatY,
      basePosition[2],
    );

    // Opacité DOM directe — 0 re-render React
    divRef.current.style.opacity = String(Math.max(0, Math.min(1, opacity)));
  });

  const fontSize = isMobile ? 10 : 12;
  const dotSize  = isMobile ? 3  : 4;

  return (
    <group ref={groupRef} position={basePosition}>
      <Html center style={{ pointerEvents: "none", userSelect: "none" }}>
        <div
          ref={divRef}
          style={{
            opacity:         0,           // démarrage invisible — useFrame gère
            display:         "flex",
            alignItems:      "center",
            gap:             `${isMobile ? 5 : 7}px`,
            transition:      "none",      // géré par useFrame, pas par CSS
          }}
        >
          {/* Dot bleu — seul accent coloré */}
          <span
            style={{
              width:        dotSize,
              height:       dotSize,
              borderRadius: "50%",
              background:   "#3b82f6",
              flexShrink:   0,
              // Halo très subtil — pas de glow agressif
              boxShadow: "0 0 5px rgba(59,130,246,0.55)",
            }}
          />
          {/* Texte — blanc cassé, tracking espacé, sans ornement */}
          <span
            style={{
              color:         "rgba(255, 255, 255, 0.86)",
              fontSize:      `${fontSize}px`,
              fontWeight:    600,
              fontFamily:    "-apple-system, 'SF Pro Display', BlinkMacSystemFont, 'Segoe UI', sans-serif",
              letterSpacing: "0.11em",
              whiteSpace:    "nowrap",
            }}
          >
            {text}
          </span>
        </div>
      </Html>
    </group>
  );
}
