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

  const borderOpacity = Math.max(0.2, 0.5 - depth * 0.1)
  const y = 0.08 + depth * 0.02

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
                fillOpacity={0.08}
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

  return (
    <group>
      {/* Main district: border only if it has sub-districts, filled if it's a flat district */}
      {hasChildren ? (
        <BorderOnly
          bounds={bounds}
          color={color}
          opacity={0.65}
          y={0.06}
        />
      ) : (
        <FilledGround
          bounds={bounds}
          color={color}
          fillOpacity={0.12}
          borderOpacity={0.65}
          y={0.06}
        />
      )}

      {/* Recursive sub-district boundaries */}
      {hasChildren && (
        <RecursiveSubDistricts subDistricts={subDistricts} depth={0} />
      )}
    </group>
  )
})
