"use client"

import { memo, useMemo, useEffect } from "react"
import * as THREE from "three"
import type { DistrictData, SubDistrictData } from "@/lib/types/city"

/** Renders only the border outline of a rectangular boundary. */
const BorderOnly = memo(function BorderOnly({
  bounds,
  color,
  opacity = 0.5,
  y = 0.06,
}: {
  bounds: { x: number; z: number; width: number; depth: number }
  color: string
  opacity?: number
  y?: number
}) {
  const borderGeometry = useMemo(() => {
    const x0 = bounds.x
    const z0 = bounds.z
    const x1 = bounds.x + bounds.width
    const z1 = bounds.z + bounds.depth
    const by = y + 0.01

    const points = [
      new THREE.Vector3(x0, by, z0), new THREE.Vector3(x1, by, z0),
      new THREE.Vector3(x1, by, z0), new THREE.Vector3(x1, by, z1),
      new THREE.Vector3(x1, by, z1), new THREE.Vector3(x0, by, z1),
      new THREE.Vector3(x0, by, z1), new THREE.Vector3(x0, by, z0),
    ]
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [bounds, y])

  useEffect(() => {
    return () => { borderGeometry.dispose() }
  }, [borderGeometry])

  return (
    <lineSegments geometry={borderGeometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </lineSegments>
  )
})

const MAX_SUBDIST_DEPTH = 3
/** The district outline sits a little outside its outermost buildings. */
const BLOCK_MARGIN = 0.2
/** Lines float just above the asphalt: any closer and they flicker at overview distances. */
const LINE_Y = 0.03

/** Outlines of a district's sub-folders, fainter the deeper they are nested. */
const RecursiveSubDistricts = memo(function RecursiveSubDistricts({
  subDistricts,
  depth,
}: {
  subDistricts: SubDistrictData[]
  depth: number
}) {
  if (depth >= MAX_SUBDIST_DEPTH) return null

  const borderOpacity = Math.max(0.14, 0.32 - depth * 0.07)
  const y = LINE_Y + (depth + 1) * 0.01

  return (
    <>
      {subDistricts.map((sub) => (
        <group key={sub.name}>
          <BorderOnly bounds={sub.bounds} color={sub.color} opacity={borderOpacity} y={y} />
          {sub.subDistricts && sub.subDistricts.length > 0 && (
            <RecursiveSubDistricts subDistricts={sub.subDistricts} depth={depth + 1} />
          )}
        </group>
      ))}
    </>
  )
})

interface DistrictGroundProps {
  district: DistrictData
}

export const DistrictGround = memo(function DistrictGround({ district }: DistrictGroundProps) {
  const { bounds, color, subDistricts } = district
  const hasChildren = subDistricts && subDistricts.length > 0
  const block = useMemo(
    () => ({
      x: bounds.x - BLOCK_MARGIN,
      z: bounds.z - BLOCK_MARGIN,
      width: bounds.width + BLOCK_MARGIN * 2,
      depth: bounds.depth + BLOCK_MARGIN * 2,
    }),
    [bounds]
  )
  // No slab under the district: buildings stand on the asphalt, and a thin line in
  // the district colour marks where the district ends.
  return (
    <group>
      <BorderOnly bounds={block} color={color} opacity={0.6} y={LINE_Y} />
      {hasChildren && <RecursiveSubDistricts subDistricts={subDistricts} depth={0} />}
    </group>
  )
})
