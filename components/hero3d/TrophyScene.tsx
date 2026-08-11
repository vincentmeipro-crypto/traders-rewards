"use client";
// ── TrophyScene V2 ─────────────────────────────────────────────────────────────
// Canvas R3F principal — chargé via dynamic import (ssr:false).
// Direction V2 :
//   - Rotation ralentie : 22s/tour (vs 15s V1)
//   - Parallax souris : amplitude quasi imperceptible (x:0.04, y:0.02)
//   - Fond : noir profond, brume bleue très diffuse
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect }  from "react";
import { Canvas, useFrame }   from "@react-three/fiber";
import * as THREE             from "three";
import SceneLights            from "./SceneLights";
import TrophyMesh             from "./TrophyMesh";
import TrophyPedestal         from "./TrophyPedestal";
import OrbitalSystem          from "./OrbitalSystem";

export interface TrophySceneProps {
  isMobile?:      boolean;
  reducedMotion?: boolean;
}

// ── TrophyGroup — rotation lente 22s/tour ─────────────────────────────────────
function TrophyGroup({
  children,
  reducedMotion,
}: {
  children:      React.ReactNode;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!ref.current || reducedMotion) return;
    // 22 secondes par tour : 2π / 22 ≈ 0.286 rad/s
    ref.current.rotation.y += (Math.PI * 2 / 22) * delta;
  });

  return (
    <group ref={ref}>
      {children}
    </group>
  );
}

// ── CameraParallax — amplitude quasi imperceptible ────────────────────────────
// Desktop uniquement. Amplitude réduite à l'essentiel.
// Le rendu doit être beau sans aucune interaction.
function CameraParallax({
  isMobile,
  reducedMotion,
}: {
  isMobile:      boolean;
  reducedMotion: boolean;
}) {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isMobile || reducedMotion) return;
    const handleMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [isMobile, reducedMotion]);

  useFrame(({ camera }) => {
    if (isMobile || reducedMotion) return;
    // Amplitude réduite au minimum — presque imperceptible
    camera.position.x += (mouse.current.x * 0.04 - camera.position.x) * 0.03;
    camera.position.y += (-mouse.current.y * 0.02 + 0.5 - camera.position.y) * 0.03;
    camera.lookAt(0, 0.6, 0);
  });

  return null;
}

// ── SceneContent ──────────────────────────────────────────────────────────────
function SceneContent({
  isMobile,
  reducedMotion,
}: {
  isMobile:      boolean;
  reducedMotion: boolean;
}) {
  return (
    <>
      <SceneLights />
      <CameraParallax isMobile={isMobile} reducedMotion={reducedMotion} />

      {/* Trophée — rotation lente */}
      {/* Position : base du trophée à y≈-0.08, coupe à y≈2.12, centre visuel y≈1.0 */}
      <TrophyGroup reducedMotion={reducedMotion}>
        <group position={[0, -0.08, 0]}>
          <TrophyMesh />
        </group>
      </TrophyGroup>

      {/* Socle — statique, indépendant du trophée */}
      <TrophyPedestal reducedMotion={reducedMotion} />

      {/* Labels flottants 25K / 50K / 100K / 200K */}
      <OrbitalSystem isMobile={isMobile} reducedMotion={reducedMotion} />
    </>
  );
}

// ── Export principal ───────────────────────────────────────────────────────────
export default function TrophyScene({
  isMobile      = false,
  reducedMotion = false,
}: TrophySceneProps) {
  const dpr = isMobile
    ? 1
    : typeof window !== "undefined"
      ? Math.min(window.devicePixelRatio, 1.5)
      : 1;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Fond — noir profond, brume bleue très diffuse */}
      <div
        aria-hidden
        style={{
          position:      "absolute",
          inset:         0,
          background:    "radial-gradient(ellipse 75% 55% at 50% 58%, #060a1a 0%, #050505 60%)",
          borderRadius:  "inherit",
          pointerEvents: "none",
        }}
      />

      <Canvas
        dpr={dpr}
        camera={{
          position: [0, 0.5, 5.0] as [number, number, number],
          fov:      50,
        }}
        frameloop="always"
        gl={{
          antialias:       !isMobile,
          powerPreference: "high-performance",
          alpha:           true,
        }}
        style={{ position: "relative", zIndex: 1 }}
      >
        <SceneContent isMobile={isMobile} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
