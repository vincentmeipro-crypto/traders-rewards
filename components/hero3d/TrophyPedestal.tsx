"use client";
// ── TrophyPedestal V2 — Socle minimaliste ────────────────────────────────────
// Noir profond mat + une seule ligne bleue statique très discrète.
// Aucune animation, aucun pulse, aucun effet hologramme.
// Philosophie "less but better" — le socle sert le trophée, pas lui-même.
// ─────────────────────────────────────────────────────────────────────────────

interface TrophyPedestalProps {
  reducedMotion?: boolean;
}

export default function TrophyPedestal({ reducedMotion: _ = false }: TrophyPedestalProps) {
  // Pas d'animation — le socle est statique
  return (
    <group position={[0, -0.16, 0]}>

      {/* ── Disque principal — noir profond quasi mat ─────────────────────── */}
      <mesh>
        <cylinderGeometry args={[0.68, 0.62, 0.07, 128]} />
        <meshStandardMaterial
          color="#0c0c0f"
          metalness={0.18}
          roughness={0.88}
        />
      </mesh>

      {/* ── Bord supérieur — très fin, chrome sombre ─────────────────────── */}
      <mesh position={[0, 0.036, 0]}>
        <torusGeometry args={[0.66, 0.009, 8, 128]} />
        <meshStandardMaterial
          color="#3a3a4a"
          metalness={0.92}
          roughness={0.08}
        />
      </mesh>

      {/* ── Unique ligne bleue — accent très discret, statique ────────────── */}
      {/* Une seule ligne, aucun pulse, aucune animation */}
      <mesh position={[0, 0.028, 0]}>
        <torusGeometry args={[0.60, 0.005, 6, 128]} />
        <meshStandardMaterial
          color="#2563eb"
          emissive="#1d4ed8"
          emissiveIntensity={0.55}
          metalness={0.30}
          roughness={0.45}
        />
      </mesh>

    </group>
  );
}
