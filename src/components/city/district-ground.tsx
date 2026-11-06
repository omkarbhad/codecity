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

/** Renders a filled ground plane + border (used for leaf sub-districts only). */
const FilledGround = memo(function FilledGround({
  bounds,
  color,
  fillOpacity = 0.10,
  borderOpacity = 0.45,
  y = 0.06,
}: {
  bounds: { x: number; z: number; width: number; depth: number }
  color: string
  fillOpacity?: number
  borderOpacity?: number
  y?: number
}) {
  const cx = bounds.x + bounds.width / 2
  const cz = bounds.z + bounds.depth / 2

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
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, y, cz]}>
        <planeGeometry args={[bounds.width, bounds.depth]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={fillOpacity}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <lineSegments geometry={borderGeometry}>
        <lineBasicMaterial color={color} transparent opacity={borderOpacity} depthWrite={false} />
      </lineSegments>
    </group>
  )
})

const MAX_SUBDIST_DEPTH = 3
/** Districts are raised pavement blocks; streets are the asphalt between them. */
const BLOCK_HEIGHT = 0.05
const BLOCK_MARGIN = 0.2
const PAVEMENT = new THREE.Color("#1d2027")

/** Recursively render sub-district boundaries.
 *  Parent sub-districts show only borders.
 *  Leaf sub-districts (no children) show a subtle filled ground. */
const RecursiveSubDistricts = memo(function RecursiveSubDistricts({
  subDistricts,
  depth,
}: {
  subDistricts: SubDistrictData[]
  depth: number
}) {
  if (depth >= MAX_SUBDIST_DEPTH) return null

  const borderOpacity = Math.max(0.14, 0.32 - depth * 0.07)
  const y = BLOCK_HEIGHT + 0.004 + depth * 0.004

  return (
    <>
      {subDistricts.map((sub) => {
        const isLeaf = !sub.subDistricts || sub.subDistricts.length === 0

        return (
          <group key={sub.name}>
            {isLeaf ? (
              // Leaf: show subtle fill + border
              <FilledGround
                bounds={sub.bounds}
                color={sub.color}
                fillOpacity={0.035}
                borderOpacity={borderOpacity}
                y={y}
              />
            ) : (
              // Parent: only show border, no fill to avoid stacking
              <BorderOnly
                bounds={sub.bounds}
                color={sub.color}
                opacity={borderOpacity}
                y={y}
              />
            )}
            {sub.subDistricts && sub.subDistricts.length > 0 && (
              <RecursiveSubDistricts
                subDistricts={sub.subDistricts}
                depth={depth + 1}
              />
            )}
          </group>
        )
      })}
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
  const slabColor = useMemo(() => PAVEMENT.clone().lerp(new THREE.Color(color), 0.05), [color])

  return (
    <group>
      {/* Pavement block, tinted toward the district color */}
      <mesh position={[block.x + block.width / 2, BLOCK_HEIGHT / 2, block.z + block.depth / 2]} receiveShadow>
        <boxGeometry args={[block.width, BLOCK_HEIGHT, block.depth]} />
        <meshStandardMaterial color={slabColor} roughness={0.95} metalness={0} />
      </mesh>

      {/* District-colored curb keeps the legend color visible */}
      <BorderOnly bounds={block} color={color} opacity={0.6} y={BLOCK_HEIGHT - 0.008} />

      {/* Lot lines for sub-folders */}
      {hasChildren && <RecursiveSubDistricts subDistricts={subDistricts} depth={0} />}
    </group>
  )
})
