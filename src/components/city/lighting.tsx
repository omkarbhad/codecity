"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import type { CityBounds } from "@/lib/visualization/city-bounds"
import { getCityBounds } from "@/lib/visualization/city-bounds"
import { useCityStore } from "./use-city-store"
import { useSceneLook } from "@/lib/theme"
import { getBuildingHeight } from "@/lib/visualization/building-dimensions"

/**
 * Scene lighting with adaptive shadow coverage and dynamic selection spotlight.
 */
/** Direction from the city towards the key light (the moon by night, the sun by day). */
// Lower than noon: one wall of each tower is lit, the next falls into shade, and shadows run long
const KEY_DIR = new THREE.Vector3(52, 74, 34).normalize()

export function Lighting({ snapshot, cityBounds }: { snapshot?: CitySnapshot; cityBounds?: CityBounds }) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const spotRef = useRef<THREE.PointLight>(null)
  const look = useSceneLook()

  const fileData = useMemo(() => {
    if (!selectedFile || !snapshot) return null
    return snapshot.files.find((f) => f.path === selectedFile) ?? null
  }, [selectedFile, snapshot])

  // Shadow camera framed on the city itself (not the world origin) and sized to it
  const { shadowSize, center, lightDistance } = useMemo(() => {
    const bounds = cityBounds ?? (snapshot ? getCityBounds(snapshot.files) : null)
    const spread = Math.max(bounds?.spread ?? 80, 80)
    const shadowSize = Math.min(320, spread * 0.6)
    const tallest = snapshot ? snapshot.files.reduce((m, f) => Math.max(m, getBuildingHeight(f)), 0) : 40
    return {
      shadowSize,
      center: [bounds?.centerX ?? 0, bounds?.centerZ ?? 0] as const,
      // Far enough back that the whole box (corners and the tallest roof) sits past the near plane
      lightDistance: shadowSize * 1.5 + tallest + 20,
    }
  }, [cityBounds, snapshot])
  const keyRef = useRef<THREE.DirectionalLight>(null)

  // The key light and its target follow the city centre, so the shadow frustum covers it
  useEffect(() => {
    const key = keyRef.current
    if (!key) return
    key.position.copy(KEY_DIR).multiplyScalar(lightDistance).add(new THREE.Vector3(center[0], 0, center[1]))
    key.target.position.set(center[0], 0, center[1])
    key.target.updateMatrixWorld()
    // three only builds the shadow projection once; refresh it whenever the frame changes
    key.shadow.camera.updateProjectionMatrix()
  }, [center, lightDistance, shadowSize])

  useFrame(({ clock }) => {
    if (!spotRef.current) return
    if (fileData) {
      const t = clock.elapsedTime
      // Above the selected roof; intensity is candela with inverse-square falloff
      spotRef.current.position.set(fileData.position.x, getBuildingHeight(fileData) + 6, fileData.position.z)
      spotRef.current.intensity = 420 + Math.sin(t * 2) * 80
    } else {
      spotRef.current.intensity = 0
    }
  })

  return (
    <>
      {/* Sky and ground bounce, then ambient fill: dusk in dark mode, day in light */}
      <hemisphereLight color={look.hemi.sky} groundColor={look.hemi.ground} intensity={look.hemi.intensity} />
      <ambientLight color={look.ambient.color} intensity={look.ambient.intensity} />

      {/* Moonlight — key light with shadows */}
      <directionalLight
        ref={keyRef}
        color={look.key.color}
        intensity={look.key.intensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={lightDistance * 2}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-radius={3}
      />

      {/* Cool fill from the opposite side */}
      <directionalLight color={look.fill.color} intensity={look.fill.intensity} position={[-40, 30, -20]} />

      {/* Low warm bounce — the glow of the streets */}
      <directionalLight color={look.warm.color} intensity={look.warm.intensity} position={[-20, 10, 60]} />

      {/* Selection spotlight */}
      <pointLight
        ref={spotRef}
        color="#aaccff"
        intensity={0}
        distance={40}
        decay={2}
      />
    </>
  )
}
