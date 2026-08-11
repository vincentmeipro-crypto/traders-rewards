"use client";
// ── TrophyScene.client.tsx ────────────────────────────────────────────────────
// Wrapper avec dynamic import (ssr: false) pour éviter tout rendu WebGL
// côté serveur (Next.js RSC / SSR incompatible avec Three.js).
//
// Usage :
//   import TrophySceneClient from "@/components/hero3d/TrophyScene.client";
//   <TrophySceneClient isMobile={false} reducedMotion={false} />
// ─────────────────────────────────────────────────────────────────────────────
import dynamic from "next/dynamic";
import type { TrophySceneProps } from "./TrophyScene";

// Fallback affiché pendant le chargement du bundle WebGL
function LoadingFallback() {
  return (
    <div
      aria-label="Chargement du trophée 3D"
      style={{
        width:          "100%",
        height:         "100%",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "radial-gradient(ellipse at center, #0d1b3e 0%, #050508 100%)",
        borderRadius:   "inherit",
      }}
    >
      <div
        style={{
          width:        28,
          height:       28,
          borderRadius: "50%",
          border:       "2.5px solid rgba(29, 78, 216, 0.25)",
          borderTopColor: "rgba(29, 78, 216, 0.9)",
          animation:    "spin360 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes spin360 { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Import dynamique — code-splitting automatique du bundle Three.js/R3F
const TrophySceneCanvas = dynamic(
  () => import("@/components/hero3d/TrophyScene"),
  {
    ssr:     false,
    loading: () => <LoadingFallback />,
  },
);

export default function TrophySceneClient(props: TrophySceneProps) {
  return <TrophySceneCanvas {...props} />;
}
