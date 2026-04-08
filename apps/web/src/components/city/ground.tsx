"use client"

import { useMemo } from "react"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"
import type { CityBounds } from "@/lib/visualization/city-bounds"
import { getCityBounds } from "@/lib/visualization/city-bounds"

interface GroundProps {
  snapshot?: CitySnapshot
  cityBounds?: CityBounds
}

/**
 * Dynamic ground plane and grid that scales with city size.
 * Adaptive sizing ensures the ground always extends beyond the city.
 */
export function Ground({ snapshot, cityBounds }: GroundProps) {
  const { groundSize, center } = useMemo(() => {
    const bounds = cityBounds ?? (snapshot ? getCityBounds(snapshot.files) : null)
    if (!bounds) return { groundSize: 500, center: [0, 0] as const }

    const spread = Math.max(bounds.spread, 100)
    return {
      groundSize: Math.max(500, spread * 5),
      center: [bounds.centerX, bounds.centerZ] as const,
    }
  }, [cityBounds, snapshot])

  // PERF: Cap grid divisions to avoid excessive line segments on large cities
  const gridDivisions = Math.min(120, Math.max(40, Math.round(groundSize / 6)))

  return (
    <group>
      {/* Main ground — near-black neutral for building contrast */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0, center[1]]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial color="#080808" roughness={0.97} metalness={0.0} />
      </mesh>

      <gridHelper
        args={[groundSize, gridDivisions, new THREE.Color("#303030"), new THREE.Color("#1c1c1c")]}
        position={[center[0], 0.01, center[1]]}
      />
    </group>
  )
}
