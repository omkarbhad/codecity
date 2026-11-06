"use client"

import { useMemo } from "react"
import type { CitySnapshot } from "@/lib/types/city"
import type { CityBounds } from "@/lib/visualization/city-bounds"
import { getCityBounds } from "@/lib/visualization/city-bounds"

interface GroundProps {
  snapshot?: CitySnapshot
  cityBounds?: CityBounds
}

/** Asphalt ground that always extends well past the city; streets are the gaps between district blocks. */
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

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], 0, center[1]]} receiveShadow>
      <planeGeometry args={[groundSize, groundSize]} />
      <meshStandardMaterial color="#0c0e13" roughness={0.92} metalness={0.05} />
    </mesh>
  )
}
