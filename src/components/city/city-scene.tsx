"use client"

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, type ThreeEvent } from "@react-three/fiber"
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
import { NightSky, StreetLights, NIGHT_HORIZON } from "./city-atmosphere"
import { useCityStore } from "./use-city-store"
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

/** Canvas-only scene — zustand store is global, no provider needed. */
export function CitySceneCanvas({ snapshot, onBuildingLoadProgress }: CitySceneProps) {
  const [buildingLoadProgress, setBuildingLoadProgress] = useState<BuildingLoadProgress | null>(null)
  const [showSecondaryDetails, setShowSecondaryDetails] = useState(false)
  const [canvasKey, setCanvasKey] = useState(0)
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
      fogDensity: Math.max(0.0003, Math.min(0.01, 0.2 / spread)),
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
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.25,
        powerPreference: "high-performance",
      }}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ position: [40, 40, 40], fov: 50, near: 0.5, far: farPlane }}
      style={{ width: "100%", height: "100%" }}
      eventSource={containerRef as React.RefObject<HTMLElement>}
      onCreated={({ gl, invalidate }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 2))
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
      <color attach="background" args={[NIGHT_HORIZON]} />
      <Suspense fallback={null}>
        <Lighting snapshot={snapshot} cityBounds={cityBounds} />
        <Ground snapshot={snapshot} cityBounds={cityBounds} />
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
          </>
        )}
        <CameraController snapshot={snapshot} cityBounds={cityBounds} />

        {/* Night atmosphere */}
        <NightSky centerX={cityBounds.centerX} centerZ={cityBounds.centerZ} radius={farPlane * 0.8} />
        <StreetLights districts={snapshot.districts} />
      </Suspense>

      <fogExp2 attach="fog" args={[NIGHT_HORIZON, cityMetrics.fogDensity]} />
    </Canvas>
    </div>
  )
}

function CitySceneStandalone({ snapshot }: CitySceneProps) {
  return <CitySceneCanvas snapshot={snapshot} />
}

export default CitySceneStandalone
