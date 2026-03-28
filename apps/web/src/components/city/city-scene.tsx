"use client"

import { Suspense, useCallback, useMemo, useRef } from "react"
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { Lighting } from "./lighting"
import { Ground } from "./ground"
import { DistrictGround } from "./district-ground"
import { DistrictLabels } from "./district-labels"
import { InstancedBuildings } from "./instanced-buildings"
import { DependencyPipes } from "./dependency-pipes"
import { CameraController } from "./camera-controller"
import { SelectionMarker } from "./selection-marker"
import { BuildingLabels } from "./building-labels"
import { useCityStore } from "./use-city-store"

interface CitySceneProps {
  snapshot: CitySnapshot
}

/** Invisible ground plane to catch clicks on empty space and deselect.
 *  Uses pointer down/up tracking for reliable click detection with panning. */
function ClickCatcher() {
  const selectFile = useCityStore((s) => s.selectFile)
  const hoverFile = useCityStore((s) => s.hoverFile)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      pointerStart.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    },
    []
  )

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!pointerStart.current) return
      const dx = e.nativeEvent.clientX - pointerStart.current.x
      const dy = e.nativeEvent.clientY - pointerStart.current.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      pointerStart.current = null

      // Only deselect if it was a true click (not a pan drag)
      if (dist < 6) {
        selectFile(null, null)
        hoverFile(null, null)
        document.body.style.cursor = "auto"
      }
    },
    [selectFile, hoverFile]
  )

  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "R" }))
    },
    []
  )

  const handlePointerOver = useCallback(() => {
    document.body.style.cursor = "auto"
  }, [])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.01, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onPointerOver={handlePointerOver}
    >
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  )
}

/** Ambient floating particles for atmosphere */
function AmbientParticles({ count = 200, spread = 200 }: { count?: number; spread?: number }) {
  const mesh = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * spread
      arr[i * 3 + 1] = Math.random() * 40 + 5
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread
    }
    return arr
  }, [count, spread])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    mesh.current.rotation.y = clock.getElapsedTime() * 0.005
    mesh.current.position.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.5
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#99aaff"
        size={0.22}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

/** Canvas-only scene — zustand store is global, no provider needed. */
export function CitySceneCanvas({ snapshot }: CitySceneProps) {
  // Compute dynamic fog density and spread based on city size
  const cityMetrics = useMemo(() => {
    if (snapshot.files.length === 0) return { fogDensity: 0.002, spread: 30, particleCount: 100 }
    const xs = snapshot.files.map((f) => f.position.x).filter(Number.isFinite)
    const zs = snapshot.files.map((f) => f.position.z).filter(Number.isFinite)
    if (xs.length === 0 || zs.length === 0) return { fogDensity: 0.002, spread: 30, particleCount: 100 }
    const spread = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...zs) - Math.min(...zs),
      30
    )
    return {
      fogDensity: Math.max(0.0002, Math.min(0.002, 1.5 / spread)),
      spread,
      particleCount: Math.min(500, Math.max(100, Math.round(spread * 1.5))),
    }
  }, [snapshot.files])

  // Adaptive camera far plane based on city size
  const farPlane = Math.max(5000, cityMetrics.spread * 5)

  return (
    <Canvas
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.4,
        powerPreference: "high-performance",
      }}
      shadows
      camera={{ position: [40, 40, 40], fov: 50, near: 0.5, far: farPlane }}
      style={{ width: "100%", height: "100%" }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        const canvas = gl.domElement
        canvas.addEventListener("webglcontextlost", (e) => {
          e.preventDefault()
          console.warn("WebGL context lost — will restore automatically")
        })
        canvas.addEventListener("webglcontextrestored", () => {
          console.warn("WebGL context restored")
        })
      }}
    >
      <color attach="background" args={["#040408"]} />
      <Suspense fallback={null}>
        <Lighting snapshot={snapshot} />
        <Ground snapshot={snapshot} />
        <ClickCatcher />

        {snapshot.districts.map((d) => (
          <DistrictGround key={d.name} district={d} />
        ))}

        <InstancedBuildings snapshot={snapshot} />
        <BuildingLabels snapshot={snapshot} />
        <SelectionMarker snapshot={snapshot} />
        <DependencyPipes snapshot={snapshot} />
        <CameraController snapshot={snapshot} />

        {/* Ambient atmosphere */}
        <AmbientParticles count={cityMetrics.particleCount} spread={cityMetrics.spread * 1.5} />
      </Suspense>

      <fogExp2 attach="fog" args={["#040408", cityMetrics.fogDensity * 0.22]} />
    </Canvas>
  )
}

function CitySceneStandalone({ snapshot }: CitySceneProps) {
  return <CitySceneCanvas snapshot={snapshot} />
}

export default CitySceneStandalone
