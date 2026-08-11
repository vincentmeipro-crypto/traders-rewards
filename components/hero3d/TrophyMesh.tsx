// ── TrophyMesh V2 — LatheGeometry, chrome réaliste ────────────────────────────
//
// PLACEHOLDER GÉOMÉTRIQUE PREMIUM — à remplacer par le modèle GLB final.
//
// Amélioration clé vs V1 :
//   LatheGeometry = UN seul mesh continu pour tout le corps du trophée.
//   128 segments → surface parfaitement lisse, aucun facettage visible.
//   Chrome très sombre + très poli → reflets réalistes sous l'éclairage studio.
//
// Pour utiliser le GLB final :
//   1. Supprimer ce fichier entier
//   2. Nouveau fichier TrophyMesh.tsx :
//      import { useGLTF } from "@react-three/drei";
//      export default function TrophyMesh() {
//        const { scene } = useGLTF("/models/traders-rewards-trophy.glb");
//        return <primitive object={scene} />;
//      }
// ─────────────────────────────────────────────────────────────────────────────

import * as THREE from "three";

// ── Matériaux ──────────────────────────────────────────────────────────────────
// Palette : chrome sombre / chrome clair. Aucun doré. Aucun bleu sur le trophée.
// Le bleu vient uniquement de l'éclairage (SceneLights → pointLight accent).

function MatDarkChrome() {
  return (
    <meshStandardMaterial
      color="#15151a"
      metalness={0.97}
      roughness={0.03}
    />
  );
}

function MatBrightChrome() {
  return (
    <meshStandardMaterial
      color="#9c9eb8"
      metalness={0.98}
      roughness={0.02}
    />
  );
}

function MatInnerCup() {
  return (
    <meshStandardMaterial
      color="#0a0a0c"
      metalness={0.65}
      roughness={0.35}
      side={2} /* THREE.DoubleSide */
    />
  );
}

// ── Profil LatheGeometry ───────────────────────────────────────────────────────
// x = rayon depuis l'axe Y, y = hauteur
// La géométrie LatheGeometry fait pivoter ce profil 360° autour de Y.
// Résultat : un corps de trophée parfaitement de révolution, sans joints.
//
// Hauteur totale : ~2.20 unités
// Base (y=0) → Tige → Nœud → Coupe (y=2.20)
const TROPHY_PROFILE: THREE.Vector2[] = [
  // ── Base — large, massive, lourde ─────────────────────────────────────
  new THREE.Vector2(0.36, 0.00),   // bord bas extérieur
  new THREE.Vector2(0.40, 0.01),   // chanfrein bas
  new THREE.Vector2(0.40, 0.09),   // paroi de base
  new THREE.Vector2(0.37, 0.115),  // chanfrein haut base

  // ── Effilement base → tige ─────────────────────────────────────────────
  new THREE.Vector2(0.25, 0.16),
  new THREE.Vector2(0.10, 0.25),
  new THREE.Vector2(0.068, 0.29),  // entrée tige

  // ── Tige — slim, élégante, légèrement conique ──────────────────────────
  new THREE.Vector2(0.063, 0.60),
  new THREE.Vector2(0.062, 0.96),  // sommet tige

  // ── Nœud tige → coupe ─────────────────────────────────────────────────
  new THREE.Vector2(0.075, 1.01),
  new THREE.Vector2(0.100, 1.07),
  new THREE.Vector2(0.165, 1.15),
  new THREE.Vector2(0.240, 1.23),

  // ── Corps de la coupe — s'élargit progressivement ─────────────────────
  new THREE.Vector2(0.310, 1.37),
  new THREE.Vector2(0.390, 1.57),
  new THREE.Vector2(0.450, 1.78),
  new THREE.Vector2(0.490, 2.00),
  new THREE.Vector2(0.515, 2.15),

  // ── Lèvre du rebord ───────────────────────────────────────────────────
  new THREE.Vector2(0.530, 2.17),
  new THREE.Vector2(0.530, 2.21),
];

// ── Export ─────────────────────────────────────────────────────────────────────
export default function TrophyMesh() {
  return (
    <group>

      {/* ── Corps principal — LatheGeometry 128 segments ─────────────────── */}
      {/* UN seul mesh pour toute la silhouette : base + tige + nœud + coupe */}
      <mesh castShadow>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <latheGeometry args={[TROPHY_PROFILE as any, 128] as any} />
        <MatDarkChrome />
      </mesh>

      {/* ── Intérieur de la coupe — profondeur visuelle ───────────────────── */}
      {/* Cylindre tronqué DoubleSide visible quand on regarde dans la coupe */}
      <mesh position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.45, 0.29, 0.52, 64, 1, true]} />
        <MatInnerCup />
      </mesh>

      {/* ── Rebord de la coupe — chrome brillant ─────────────────────────── */}
      {/* Torus épais sur le bord supérieur → arête lumineuse premium */}
      <mesh position={[0, 2.20, 0]}>
        <torusGeometry args={[0.522, 0.028, 16, 128]} />
        <MatBrightChrome />
      </mesh>

      {/* ── Poignée gauche ───────────────────────────────────────────────── */}
      {/* Demi-tore : arc de 180° chrome brillant */}
      <mesh position={[-0.64, 1.62, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.24, 0.019, 14, 56, Math.PI]} />
        <MatBrightChrome />
      </mesh>

      {/* ── Poignée droite ───────────────────────────────────────────────── */}
      <mesh position={[0.64, 1.62, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <torusGeometry args={[0.24, 0.019, 14, 56, Math.PI]} />
        <MatBrightChrome />
      </mesh>

    </group>
  );
}
