"use client"

import { useMemo } from "react"
import * as THREE from "three"
import type { FileData } from "@/lib/types/city"

interface DemoBuildingProps {
  file: FileData
  color: string
}

export function DemoBuilding({ file, color }: DemoBuildingProps) {
  const height = Math.max(0.4, Math.min(18, file.lines / 50))
  const width = Math.min(2.8, 1.2 + file.functions.length * 0.15)
  const depth = width

  const edgesGeometry = useMemo(() => {
    const box = new THREE.BoxGeometry(width, height, depth)
    const edges = new THREE.EdgesGeometry(box)
    box.dispose()
    return edges
  }, [width, height, depth])

  return (
    <group position={[file.position.x, height / 2, file.position.z]}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.15}
          roughness={0.65}
        />
      </mesh>
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.4} />
      </lineSegments>
    </group>
  )
}
