"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import type { CityBounds } from "@/lib/visualization/city-bounds"
import { getCityBounds } from "@/lib/visualization/city-bounds"
import { useCityStore } from "./use-city-store"

/**
 * Scene lighting with adaptive shadow coverage and dynamic selection spotlight.
 */
export function Lighting({ snapshot, cityBounds }: { snapshot?: CitySnapshot; cityBounds?: CityBounds }) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const spotRef = useRef<THREE.PointLight>(null)

  const fileData = useMemo(() => {
    if (!selectedFile || !snapshot) return null
    return snapshot.files.find((f) => f.path === selectedFile) ?? null
  }, [selectedFile, snapshot])

  // Adaptive shadow camera based on city size
  const shadowSize = useMemo(() => {
    const bounds = cityBounds ?? (snapshot ? getCityBounds(snapshot.files) : null)
    if (!bounds) return 80
    const spread = Math.max(bounds.spread, 80)
    return Math.min(200, spread * 0.6)
  }, [cityBounds, snapshot])

  useFrame(({ clock }) => {
    if (!spotRef.current) return
    if (fileData) {
      const t = clock.getElapsedTime()
      spotRef.current.position.set(
        fileData.position.x,
        14,
        fileData.position.z
      )
      spotRef.current.intensity = 20 + Math.sin(t * 2) * 5
    } else {
      spotRef.current.intensity = 0
    }
  })

  return (
    <>
      {/* Night: cool sky, dark ground bounce */}
      <hemisphereLight color="#5c6f9e" groundColor="#0b0d14" intensity={0.6} />
      <ambientLight color="#1c2236" intensity={0.4} />

      {/* Moonlight — key light with shadows */}
      <directionalLight
        color="#c9d6ff"
        intensity={1.3}
        position={[50, 80, 40]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
      />

      {/* Cool fill from the opposite side */}
      <directionalLight color="#4d6bb3" intensity={0.35} position={[-40, 30, -20]} />

      {/* Low warm bounce — the glow of the streets */}
      <directionalLight color="#ff9a5c" intensity={0.3} position={[-20, 10, 60]} />

      {/* Selection spotlight */}
      <pointLight
        ref={spotRef}
        color="#aaccff"
        intensity={0}
        distance={35}
        decay={2}
      />
    </>
  )
}
