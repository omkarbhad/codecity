"use client"

import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import * as THREE from "three"
import type { MagnovaCitySnapshot } from "@/lib/magnova/types"
import { Terrain } from "./terrain"
import { Lighting } from "./lighting"
import { CameraController } from "./camera-controller"
import { AllBuildings } from "./buildings/building-factory"
import { BuildingLabels } from "./building-labels"
import { AmbientDetails } from "./ambient-details"
import { HudOverlay } from "./hud/hud-overlay"
import { useMagnovaStore } from "./use-magnova-store"

interface MagnovaSceneProps {
  snapshot: MagnovaCitySnapshot
}

/** Click catcher — deselects when clicking empty space */
function ClickCatcher() {
  const { selectSpace, hoverSpace } = useMagnovaStore()

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.02, 0]}
      onPointerUp={(e) => {
        e.stopPropagation()
        selectSpace(null)
        hoverSpace(null)
        document.body.style.cursor = "auto"
      }}
    >
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}

function MagnovaSceneCanvas({ snapshot }: MagnovaSceneProps) {
  return (
    <Canvas
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        powerPreference: "high-performance",
      }}
      shadows
      orthographic
      camera={{
        position: [40, 40, 40],
        zoom: 18,
        near: 0.1,
        far: 1000,
      }}
      style={{ width: "100%", height: "100%" }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      }}
    >
      <color attach="background" args={["#C5D8E8"]} />

      <Suspense fallback={null}>
        <Lighting />
        <Terrain spaces={snapshot.spaces} />
        <ClickCatcher />
        <AllBuildings spaces={snapshot.spaces} />
        <BuildingLabels spaces={snapshot.spaces} />
        <AmbientDetails spaces={snapshot.spaces} />
        <CameraController spaces={snapshot.spaces} />
      </Suspense>
    </Canvas>
  )
}

export function MagnovaCity({ snapshot }: MagnovaSceneProps) {
  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* 3D Canvas */}
      <MagnovaSceneCanvas snapshot={snapshot} />

      {/* HTML HUD overlay */}
      <HudOverlay spaces={snapshot.spaces} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 16,
          color: "rgba(255, 248, 225, 0.7)",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          fontSize: 11,
          letterSpacing: 2,
          fontWeight: 600,
          zIndex: 10,
        }}
      >
        MAGNOVA
      </div>
    </div>
  )
}

export default MagnovaCity
