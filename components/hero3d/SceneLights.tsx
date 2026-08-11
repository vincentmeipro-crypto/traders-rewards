"use client";
// ── SceneLights V2 — Éclairage studio produit ──────────────────────────────────
// Philosophie : lumière contrôlée comme un studio photo haut de gamme.
// Key light latérale → rim light froide derrière → fill quasi nul.
// Le bleu est un accent, pas la lumière principale.
// ─────────────────────────────────────────────────────────────────────────────

export default function SceneLights() {
  return (
    <>
      {/* Ambient — quasi nul, studio très sombre */}
      <ambientLight intensity={0.04} color="#ffffff" />

      {/* Key light — latérale droite haute, blanc légèrement froid */}
      {/* Source principale de définition du chrome */}
      <directionalLight
        position={[4.0, 5.5, 2.0]}
        intensity={2.6}
        color="#d8e4ff"
      />

      {/* Rim light — derrière haut gauche, froide et puissante */}
      {/* Crée l'arête lumineuse signature du chrome premium */}
      <directionalLight
        position={[-3.5, 5.5, -4.5]}
        intensity={2.0}
        color="#b0c8ff"
      />

      {/* Fill — très faible, évite les zones trop noires */}
      <directionalLight
        position={[0.5, -0.5, 5.0]}
        intensity={0.06}
        color="#ffffff"
      />

      {/* Accent bleu socle — très localisé, basse altitude */}
      {/* Donne la couleur bleue au bas du trophée sans contaminer le reste */}
      <pointLight
        position={[0, -0.65, 0.6]}
        intensity={1.4}
        color="#1a3db5"
        distance={2.2}
        decay={2.5}
      />
    </>
  );
}
