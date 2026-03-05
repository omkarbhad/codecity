"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

/**
 * Scene lighting with adaptive shadow coverage and dynamic selection spotlight.
 */
export function Lighting({ snapshot }: { snapshot?: CitySnapshot }) {
  const selectedFile = useCityStore((s) => s.selectedFile)
  const spotRef = useRef<THREE.PointLight>(null)

  const fileData = useMemo(() => {
    if (!selectedFile || !snapshot) return null
    return snapshot.files.find((f) => f.path === selectedFile) ?? null
  }, [selectedFile, snapshot])

  // Adaptive shadow camera based on city size
  const shadowSize = useMemo(() => {
    if (!snapshot || snapshot.files.length === 0) return 80
    const xs = snapshot.files.map((f) => f.position.x)
    const zs = snapshot.files.map((f) => f.position.z)
    const spread = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...zs) - Math.min(...zs),
      80
    )
    return Math.min(200, spread * 0.6)
  }, [snapshot])

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
      <hemisphereLight color="#b0bfe0" groundColor="#080820" intensity={0.6} />
      <ambientLight color="#666880" intensity={0.3} />

      {/* Key light — strong for building contrast */}
      <directionalLight
        color="#fff5ea"
        intensity={2.2}
        position={[50, 80, 40]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
      />

      {/* Fill light */}
      <directionalLight
        color="#6688dd"
        intensity={0.45}
        position={[-40, 30, -20]}
      />

      {/* Rim/back light */}
      <directionalLight
        color="#ff9977"
        intensity={0.28}
        position={[-20, 40, 60]}
      />

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
