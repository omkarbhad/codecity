"use client"

import { useMemo } from "react"
import * as THREE from "three"
import type { CitySnapshot } from "@/lib/types/city"

interface GroundProps {
  snapshot?: CitySnapshot
}

/**
 * Dynamic ground plane and grid that scales with city size.
 * Adaptive sizing ensures the ground always extends beyond the city.
 */
export function Ground({ snapshot }: GroundProps) {
  const { groundSize, center } = useMemo(() => {
    if (!snapshot || snapshot.files.length === 0) return { groundSize: 500, center: [0, 0] as const }
    const xs = snapshot.files.map((f) => f.position.x)
    const zs = snapshot.files.map((f) => f.position.z)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minZ = Math.min(...zs)
    const maxZ = Math.max(...zs)
    const spread = Math.max(maxX - minX, maxZ - minZ, 100)
    return {
      groundSize: Math.max(500, spread * 5),
      center: [(minX + maxX) / 2, (minZ + maxZ) / 2] as const,
    }
  }, [snapshot])

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
