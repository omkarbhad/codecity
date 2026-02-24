"use client"

import { useMemo } from "react"
import * as THREE from "three"
import type { DistrictData } from "@/lib/types/city"

interface DistrictGroundProps {
  district: DistrictData
}

export function DistrictGround({ district }: DistrictGroundProps) {
  const { bounds, color } = district

  // Center position of the district
  const cx = bounds.x + bounds.width / 2
  const cz = bounds.z + bounds.depth / 2

  // Build border as a line-segments geometry (pairs of points for each edge)
  const borderGeometry = useMemo(() => {
    const x0 = bounds.x
    const z0 = bounds.z
    const x1 = bounds.x + bounds.width
    const z1 = bounds.z + bounds.depth
    const y = 0.03

    // lineSegments needs pairs: [A,B, B,C, C,D, D,A]
    const points = [
      new THREE.Vector3(x0, y, z0),
      new THREE.Vector3(x1, y, z0),

      new THREE.Vector3(x1, y, z0),
      new THREE.Vector3(x1, y, z1),

      new THREE.Vector3(x1, y, z1),
      new THREE.Vector3(x0, y, z1),

      new THREE.Vector3(x0, y, z1),
      new THREE.Vector3(x0, y, z0),
    ]

    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [bounds])

  return (
    <group>
      {/* Semi-transparent colored floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[cx, 0.02, cz]}
      >
        <planeGeometry args={[bounds.width, bounds.depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.15}
          roughness={0.9}
        />
      </mesh>

      {/* Border outline */}
      <lineSegments geometry={borderGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.4} />
      </lineSegments>
    </group>
  )
}
