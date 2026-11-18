"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber"
import { PerformanceMonitor } from "@react-three/drei"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { Lighting } from "./lighting"
import { Ground } from "./ground"
import { DistrictGround } from "./district-ground"
import { InstancedBuildings, type BuildingLoadProgress } from "./instanced-buildings"
import { DependencyPipes } from "./dependency-pipes"
import { CameraController } from "./camera-controller"
import { SelectionMarker } from "./selection-marker"
import { BuildingLabels } from "./building-labels"
import { NightSky, StreetLights } from "./city-atmosphere"
import { SceneEnvironment } from "./scene-environment"
import { useSceneLook } from "@/lib/theme"
import { useCityStore } from "./use-city-store"
import { AgentWorkers } from "./agent-workers"
import { useAgentActivity } from "./use-agent-activity"
import { getCityBounds } from "@/lib/visualization/city-bounds"

interface CitySceneProps {
  snapshot: CitySnapshot
  onBuildingLoadProgress?: (progress: BuildingLoadProgress | null) => void
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

/** The Canvas builds its camera once; keep the far plane in step with the city size. */
function CameraFarPlane({ far }: { far: number }) {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.far = far
    camera.updateProjectionMatrix()
  }, [camera, far])
  return null
}

/** Canvas-only scene — zustand store is global, no provider needed. */
export function CitySceneCanvas({ snapshot, onBuildingLoadProgress }: CitySceneProps) {
  const look = useSceneLook()
  // Read here, outside the canvas: react-query's context does not reach inside it
  const agentMode = useCityStore((s) => s.agentMode)
  const agents = useAgentActivity()
  const [buildingLoadProgress, setBuildingLoadProgress] = useState<BuildingLoadProgress | null>(null)
  const [showSecondaryDetails, setShowSecondaryDetails] = useState(false)
  const [canvasKey, setCanvasKey] = useState(0)
  // Resolution follows the measured frame rate: full (up to 2x) while smooth, 1x when it struggles
  const [dpr, setDpr] = useState<number | [number, number]>([1, 2])
  const containerRef = useRef<HTMLDivElement>(null)
  const cityBounds = useMemo(() => getCityBounds(snapshot.files), [snapshot.files])
  const isProgressivelyLoading = !!buildingLoadProgress && !buildingLoadProgress.complete
  const loadedDistricts = useMemo(() => {
    if (!buildingLoadProgress || buildingLoadProgress.complete) return null
    return new Set(buildingLoadProgress.loadedGroundDistricts)
  }, [buildingLoadProgress])

  const handleBuildingLoadProgress = useCallback(
    (progress: BuildingLoadProgress | null) => {
      setBuildingLoadProgress(progress)
      onBuildingLoadProgress?.(progress)
    },
    [onBuildingLoadProgress]
  )

  useEffect(() => {
    if (isProgressivelyLoading) {
      setShowSecondaryDetails(false)
      return
    }

    const timeoutId = setTimeout(() => setShowSecondaryDetails(true), buildingLoadProgress?.complete ? 900 : 0)
    return () => clearTimeout(timeoutId)
  }, [buildingLoadProgress?.complete, isProgressivelyLoading])

  // Fog scales with city size so far districts fade into the horizon at any scale
  const cityMetrics = useMemo(() => {
    const spread = Math.max(cityBounds.spread, 20)
    return {
      fogDensity: Math.max(0.0002, Math.min(0.006, 0.12 / spread)),
      spread,
    }
  }, [cityBounds])

  // Adaptive camera far plane based on city size
  const farPlane = Math.max(5000, cityMetrics.spread * 5)

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
    <Canvas
      key={canvasKey}
      gl={{
        antialias: true,
        // Neutral keeps saturated district colours saturated; ACES washed lit walls out to pastel
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1.0,
        powerPreference: "high-performance",
      }}
      shadows="percentage"
      dpr={dpr}
      camera={{ position: [40, 40, 40], fov: 50, near: 1, far: farPlane }}
      style={{ width: "100%", height: "100%" }}
      eventSource={containerRef as React.RefObject<HTMLElement>}
      onCreated={({ gl, invalidate }) => {
        const canvas = gl.domElement

        const handleContextLost = (e: Event) => {
          e.preventDefault()
          // Remount Canvas on next tick so R3F rebuilds the scene with a fresh context
          setCanvasKey((k) => k + 1)
        }
        const handleVisibility = () => {
          if (document.visibilityState === "visible") invalidate()
        }

        canvas.addEventListener("webglcontextlost", handleContextLost)
        document.addEventListener("visibilitychange", handleVisibility)

        return () => {
          canvas.removeEventListener("webglcontextlost", handleContextLost)
          document.removeEventListener("visibilitychange", handleVisibility)
        }
      }}
    >
      <color attach="background" args={[look.fog]} />
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr([1, 2])} flipflops={3} onFallback={() => setDpr(1)} />
      <Suspense fallback={null}>
        <Lighting snapshot={snapshot} cityBounds={cityBounds} />
        <Ground snapshot={snapshot} cityBounds={cityBounds} farPlane={farPlane} />
        <SceneEnvironment intensity={look.envIntensity} />
        <ClickCatcher />

        {snapshot.districts
          .filter((district) => !loadedDistricts || loadedDistricts.has(district.name))
          .map((d) => (
            <DistrictGround key={d.name} district={d} />
          ))}

        <InstancedBuildings snapshot={snapshot} onLoadProgress={handleBuildingLoadProgress} />
        {showSecondaryDetails && (
          <>
            <BuildingLabels snapshot={snapshot} cityBounds={cityBounds} />
            <SelectionMarker snapshot={snapshot} />
            <DependencyPipes snapshot={snapshot} />
            {agentMode && <AgentWorkers snapshot={snapshot} sessions={agents.sessions} uncommitted={agents.uncommitted} />}
          </>
        )}
        <CameraController snapshot={snapshot} cityBounds={cityBounds} />
        <CameraFarPlane far={farPlane} />

        {/* Night atmosphere */}
        <NightSky centerX={cityBounds.centerX} centerZ={cityBounds.centerZ} radius={farPlane * 0.8} />
        <StreetLights districts={snapshot.districts} />
      </Suspense>

      <fogExp2 attach="fog" args={[look.fog, cityMetrics.fogDensity * look.fogScale]} />
    </Canvas>
    </div>
  )
}

function CitySceneStandalone({ snapshot }: CitySceneProps) {
  return <CitySceneCanvas snapshot={snapshot} />
}

export default CitySceneStandalone
