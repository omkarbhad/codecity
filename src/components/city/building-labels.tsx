"use client"

import { useRef, useMemo, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Text, Billboard } from "@react-three/drei"
import { Vector3 } from "three"
import type { CitySnapshot } from "@/lib/types/city"
import type { CityBounds } from "@/lib/visualization/city-bounds"
import { getCityBounds } from "@/lib/visualization/city-bounds"
import { getBuildingHeight } from "@/lib/visualization/building-dimensions"
import { useCityStore } from "./use-city-store"

const MAX_VISIBLE_LABELS = 40
const BASE_DISTANCE_THRESHOLD = 35
const LABEL_FONT_SIZE = 0.3
const LABEL_MAX_WIDTH = 6
const CHAR_WIDTH = LABEL_FONT_SIZE * 0.6 // approx. glyph advance in world units
const LABEL_GAP_PX = 2

interface BuildingLabelsProps {
  snapshot: CitySnapshot
  cityBounds?: CityBounds
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function BuildingLabels({ snapshot, cityBounds }: BuildingLabelsProps) {
  const hoveredIndex = useCityStore((s) => s.hoveredIndex)
  const selectedIndex = useCityStore((s) => s.selectedIndex)
  const showBuildingLabels = useCityStore((s) => s.showBuildingLabels)
  const { camera, size } = useThree()
  const [scratch, right, up] = useMemo(() => [new Vector3(), new Vector3(), new Vector3()], [])

  // Use ref to track computed indices; only trigger React re-render when they actually change
  const indicesRef = useRef<number[]>([])
  const [version, setVersion] = useState(0)
  const frameCounter = useRef(0)

  const fileNames = useMemo(
    () => snapshot.files.map((f) => f.path.split("/").pop() ?? f.path),
    [snapshot.files]
  )

  const heights = useMemo(
    () => snapshot.files.map((f) => getBuildingHeight(f)),
    [snapshot.files]
  )

  const districtColorMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of snapshot.districts) m.set(d.name, d.color)
    return m
  }, [snapshot.districts])

  const distanceThreshold = useMemo(() => {
    const bounds = cityBounds ?? getCityBounds(snapshot.files)
    const spread = bounds.spread
    return Math.max(BASE_DISTANCE_THRESHOLD, spread * 0.15)
  }, [cityBounds, snapshot.files])

  const spatialGrid = useMemo(() => {
    const cellSize = distanceThreshold
    const grid = new Map<string, number[]>()
    for (let i = 0; i < snapshot.files.length; i++) {
      const f = snapshot.files[i]
      const key = `${Math.floor(f.position.x / cellSize)},${Math.floor(f.position.z / cellSize)}`
      if (!grid.has(key)) grid.set(key, [])
      grid.get(key)!.push(i)
    }
    return { grid, cellSize }
  }, [snapshot.files, distanceThreshold])

  // Recalculate visible labels every 6 frames — only re-render when indices change
  useFrame(() => {
    if (!showBuildingLabels) {
      if (indicesRef.current.length > 0) {
        indicesRef.current = []
        setVersion((v) => v + 1)
      }
      return
    }

    frameCounter.current++
    if (frameCounter.current % 6 !== 0) return

    const camPos = camera.position
    const { grid, cellSize } = spatialGrid
    const camCellX = Math.floor(camPos.x / cellSize)
    const camCellZ = Math.floor(camPos.z / cellSize)

    const scored: { index: number; dist: number }[] = []

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const indices = grid.get(`${camCellX + dx},${camCellZ + dz}`)
        if (!indices) continue
        for (const i of indices) {
          const f = snapshot.files[i]
          const ddx = f.position.x - camPos.x
          const ddz = f.position.z - camPos.z
          const dist = Math.sqrt(ddx * ddx + ddz * ddz)
          if (dist < distanceThreshold) {
            scored.push({ index: i, dist })
          }
        }
      }
    }

    scored.sort((a, b) => a.dist - b.dist)

    // Declutter: nearest labels claim their screen rectangle first; a label
    // that would overlap an already placed one is skipped.
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    const toScreen = (v: Vector3) => {
      v.project(camera)
      return { x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height, behind: v.z > 1 }
    }
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
    const next: number[] = []
    for (const { index } of scored) {
      if (next.length >= MAX_VISIBLE_LABELS) break
      const f = snapshot.files[index]
      const y = heights[index] + 0.6
      const anchor = toScreen(scratch.set(f.position.x, y, f.position.z))
      if (anchor.behind) continue
      const halfWidth = Math.min(fileNames[index].length * CHAR_WIDTH, LABEL_MAX_WIDTH) / 2
      const edge = toScreen(scratch.set(f.position.x, y, f.position.z).addScaledVector(right, halfWidth))
      const top = toScreen(scratch.set(f.position.x, y, f.position.z).addScaledVector(up, LABEL_FONT_SIZE))
      const halfPx = Math.abs(edge.x - anchor.x) + LABEL_GAP_PX
      const box = { x0: anchor.x - halfPx, x1: anchor.x + halfPx, y0: top.y - LABEL_GAP_PX, y1: anchor.y + LABEL_GAP_PX }
      if (placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) continue
      placed.push(box)
      next.push(index)
    }

    if (hoveredIndex !== null && !next.includes(hoveredIndex)) next.push(hoveredIndex)
    if (selectedIndex !== null && !next.includes(selectedIndex)) next.push(selectedIndex)

    // Only trigger re-render if indices actually changed
    if (!arraysEqual(indicesRef.current, next)) {
      indicesRef.current = next
      setVersion((v) => v + 1)
    }
  })

  // Read from ref (version is just a trigger)
  void version
  const visibleIndices = indicesRef.current

  if (!showBuildingLabels) return null

  return (
    <group>
      {visibleIndices.map((i) => {
        const file = snapshot.files[i]
        if (!file) return null
        const height = heights[i]
        const color = districtColorMap.get(file.district) ?? "#888"
        const isHovered = i === hoveredIndex
        const isSelected = i === selectedIndex

        return (
          <Billboard
            key={i}
            position={[file.position.x, height + 0.6, file.position.z]}
            follow
            lockX={false}
            lockY={false}
            lockZ={false}
          >
            <Text
              fontSize={isHovered || isSelected ? 0.45 : LABEL_FONT_SIZE}
              color={isHovered || isSelected ? "#e8dcc8" : color}
              fillOpacity={isHovered || isSelected ? 0.95 : 0.5}
              anchorX="center"
              anchorY="bottom"
              maxWidth={LABEL_MAX_WIDTH}
              outlineWidth={0.04}
              outlineColor="#0d0d0f"
              outlineOpacity={0.75}
            >
              {fileNames[i]}
            </Text>
          </Billboard>
        )
      })}
    </group>
  )
}
