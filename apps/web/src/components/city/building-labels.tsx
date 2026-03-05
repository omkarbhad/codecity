"use client"

import { useRef, useMemo, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Text, Billboard } from "@react-three/drei"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

const MAX_VISIBLE_LABELS = 40
const BASE_DISTANCE_THRESHOLD = 35

interface BuildingLabelsProps {
  snapshot: CitySnapshot
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function BuildingLabels({ snapshot }: BuildingLabelsProps) {
  const hoveredIndex = useCityStore((s) => s.hoveredIndex)
  const selectedIndex = useCityStore((s) => s.selectedIndex)
  const showBuildingLabels = useCityStore((s) => s.showBuildingLabels)
  const { camera } = useThree()

  // Use ref to track computed indices; only trigger React re-render when they actually change
  const indicesRef = useRef<number[]>([])
  const [version, setVersion] = useState(0)
  const frameCounter = useRef(0)

  const fileNames = useMemo(
    () => snapshot.files.map((f) => f.path.split("/").pop() ?? f.path),
    [snapshot.files]
  )

  const heights = useMemo(
    () => snapshot.files.map((f) => Math.max(0.4, Math.min(18, f.lines / 50))),
    [snapshot.files]
  )

  const districtColorMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of snapshot.districts) m.set(d.name, d.color)
    return m
  }, [snapshot.districts])

  const distanceThreshold = useMemo(() => {
    if (snapshot.files.length === 0) return BASE_DISTANCE_THRESHOLD
    const xs = snapshot.files.map((f) => f.position.x)
    const zs = snapshot.files.map((f) => f.position.z)
    const spread = Math.max(
      Math.max(...xs) - Math.min(...xs),
      Math.max(...zs) - Math.min(...zs),
      30
    )
    return Math.max(BASE_DISTANCE_THRESHOLD, spread * 0.15)
  }, [snapshot.files])

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
    const next = scored.slice(0, MAX_VISIBLE_LABELS).map((s) => s.index)

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
              fontSize={isHovered || isSelected ? 0.45 : 0.3}
              color={isHovered || isSelected ? "#ffffff" : color}
              fillOpacity={isHovered || isSelected ? 0.9 : 0.5}
              anchorX="center"
              anchorY="bottom"
              maxWidth={6}
              outlineWidth={0.03}
              outlineColor="#000000"
              outlineOpacity={0.6}
            >
              {fileNames[i]}
            </Text>
          </Billboard>
        )
      })}
    </group>
  )
}
