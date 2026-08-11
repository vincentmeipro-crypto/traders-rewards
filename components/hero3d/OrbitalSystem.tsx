"use client";
// ── FloatingLabels V2 (OrbitalSystem.tsx) ─────────────────────────────────────
// 4 labels à positions fixes dans l'espace 3D autour du trophée.
// AUCUNE orbite, AUCUNE trajectoire, AUCUN effet planète.
//
// Disposition :
//   25K  — bas gauche, légèrement devant
//   50K  — haut droite
//   100K — légèrement gauche, nettement derrière
//   200K — droite, devant
//
// Un seul label est fortement visible à la fois.
// Les autres sont en transition ou quasi invisibles.
// ─────────────────────────────────────────────────────────────────────────────

import OrbitLabel from "./OrbitLabel";

interface OrbitalSystemProps {
  isMobile?:      boolean;
  reducedMotion?: boolean;
}

// ── Positions desktop ─────────────────────────────────────────────────────────
// Plus espacées, profondeur variée (Z différents pour l'effet devant/derrière).
const LABELS_DESKTOP = [
  {
    text:         "25K",
    basePosition: [-1.55, -0.30, 0.55] as [number, number, number],
    cycleOffset:  0.00,
  },
  {
    text:         "50K",
    basePosition: [ 1.60,  0.72, 0.18] as [number, number, number],
    cycleOffset:  0.25,
  },
  {
    text:         "100K",
    basePosition: [-0.38, 0.32, -1.75] as [number, number, number],
    cycleOffset:  0.50,
  },
  {
    text:         "200K",
    basePosition: [ 1.05, -0.38, 1.68] as [number, number, number],
    cycleOffset:  0.75,
  },
] as const;

// ── Positions mobile — plus proches du trophée ────────────────────────────────
const LABELS_MOBILE = [
  {
    text:         "25K",
    basePosition: [-1.10, -0.22, 0.38] as [number, number, number],
    cycleOffset:  0.00,
  },
  {
    text:         "50K",
    basePosition: [ 1.15,  0.52, 0.12] as [number, number, number],
    cycleOffset:  0.25,
  },
  {
    text:         "100K",
    basePosition: [-0.28, 0.22, -1.15] as [number, number, number],
    cycleOffset:  0.50,
  },
  {
    text:         "200K",
    basePosition: [ 0.78, -0.26, 1.12] as [number, number, number],
    cycleOffset:  0.75,
  },
] as const;

export default function OrbitalSystem({
  isMobile      = false,
  reducedMotion = false,
}: OrbitalSystemProps) {
  const labels = isMobile ? LABELS_MOBILE : LABELS_DESKTOP;

  return (
    <>
      {labels.map((label) => (
        <OrbitLabel
          key={label.text}
          text={label.text}
          basePosition={label.basePosition}
          cycleOffset={label.cycleOffset}
          isMobile={isMobile}
          reducedMotion={reducedMotion}
        />
      ))}
    </>
  );
}
