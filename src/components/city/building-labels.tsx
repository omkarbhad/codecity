"use client"

import { useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import { Vector3 } from "three"
import type { CitySnapshot } from "@/lib/types/city"
import type { CityBounds } from "@/lib/visualization/city-bounds"
import { getBuildingHeight } from "@/lib/visualization/building-dimensions"
import { isPathHidden, useCityStore } from "./use-city-store"
import { getExtension } from "./extension-filter"
import { FileIcon } from "./file-icons"

/** Labels on screen at once; the biggest, nearest buildings win. */
const MAX_VISIBLE_LABELS = 12
/** Label box in screen pixels, used to keep labels from overlapping. */
const LABEL_HEIGHT_PX = 22
const LABEL_CHAR_PX = 7
const LABEL_CHROME_PX = 34 // icon, gap and padding
const LABEL_MAX_CHARS = 24
const LABEL_GAP_PX = 14
/** The floating view toolbar covers the top of the canvas. */
const TOOLBAR_CLEARANCE_PX = 60
/** How often (in frames) the visible set is recomputed. */
const RECOMPUTE_EVERY = 8

interface BuildingLabelsProps {
  snapshot: CitySnapshot
  cityBounds?: CityBounds
}

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function shorten(name: string): string {
  return name.length > LABEL_MAX_CHARS ? `${name.slice(0, LABEL_MAX_CHARS - 1)}…` : name
}

/**
 * File-name tags over the city, drawn as HTML so they stay a constant, readable
 * size at any zoom. Candidates are every building on screen, ranked by size over
 * distance; a tag that would overlap one already placed is skipped.
 */
export function BuildingLabels({ snapshot }: BuildingLabelsProps) {
  const hoveredIndex = useCityStore((s) => s.hoveredIndex)
  const selectedIndex = useCityStore((s) => s.selectedIndex)
  const showBuildingLabels = useCityStore((s) => s.showBuildingLabels)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const searchQuery = useCityStore((s) => s.searchQuery)
  const { camera, size } = useThree()
  const scratch = useMemo(() => new Vector3(), [])

  const indicesRef = useRef<number[]>([])
  const [, setVersion] = useState(0)
  const frame = useRef(0)

  const fileNames = useMemo(() => snapshot.files.map((f) => f.path.split("/").pop() ?? f.path), [snapshot.files])
  const labels = useMemo(() => fileNames.map(shorten), [fileNames])
  const heights = useMemo(() => snapshot.files.map((f) => getBuildingHeight(f)), [snapshot.files])
  // Same rules as the buildings' visibility mask, so no label floats over a building that search hid
  const visible = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return snapshot.files.map((f) => {
      if (isPathHidden(f.path, hiddenPaths) || hiddenExtensions.has(getExtension(f.path))) return false
      if (!q) return true
      return f.path.toLowerCase().includes(q) || f.functions.some((fn) => fn.name.toLowerCase().includes(q))
    })
  }, [snapshot.files, hiddenPaths, hiddenExtensions, searchQuery])

  useFrame(() => {
    if (!showBuildingLabels) {
      if (indicesRef.current.length) {
        indicesRef.current = []
        setVersion((v) => v + 1)
      }
      return
    }
    if (frame.current++ % RECOMPUTE_EVERY !== 0) return

    // Rank every on-screen building: taller and nearer first.
    const scored: { index: number; score: number; x: number; y: number }[] = []
    const cam = camera.position
    for (let i = 0; i < snapshot.files.length; i++) {
      if (!visible[i]) continue
      const f = snapshot.files[i]
      const top = heights[i] + 0.4
      scratch.set(f.position.x, top, f.position.z).project(camera)
      if (scratch.z > 1 || scratch.x < -1.05 || scratch.x > 1.05 || scratch.y < -1.05 || scratch.y > 1.1) continue
      const dx = f.position.x - cam.x
      const dy = top - cam.y
      const dz = f.position.z - cam.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
      scored.push({
        index: i,
        score: (heights[i] + 1) / dist,
        x: (scratch.x * 0.5 + 0.5) * size.width,
        y: (-scratch.y * 0.5 + 0.5) * size.height,
      })
    }
    scored.sort((a, b) => b.score - a.score)

    // Selected and hovered always get a tag; the rest fill in without overlapping.
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = []
    const next: number[] = []
    const claim = (s: { index: number; x: number; y: number }, force: boolean) => {
      const half = (labels[s.index].length * LABEL_CHAR_PX + LABEL_CHROME_PX) / 2 + LABEL_GAP_PX
      const box = { x0: s.x - half, x1: s.x + half, y0: s.y - LABEL_HEIGHT_PX - LABEL_GAP_PX, y1: s.y + LABEL_GAP_PX }
      // Skip tags that would be cut off at the canvas edge or sit under the floating toolbar.
      const offscreen = box.x0 < 4 || box.x1 > size.width - 4 || box.y0 < TOOLBAR_CLEARANCE_PX || box.y1 > size.height - 4
      if (!force && (offscreen || placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0))) return
      placed.push(box)
      next.push(s.index)
    }
    for (const pin of [selectedIndex, hoveredIndex]) {
      const s = pin === null ? undefined : scored.find((c) => c.index === pin)
      if (s && !next.includes(s.index)) claim(s, true)
    }
    for (const s of scored) {
      if (next.length >= MAX_VISIBLE_LABELS) break
      if (!next.includes(s.index)) claim(s, false)
    }

    if (!arraysEqual(indicesRef.current, next)) {
      indicesRef.current = next
      setVersion((v) => v + 1)
    }
  })

  if (!showBuildingLabels) return null

  return (
    <group>
      {indicesRef.current.map((i) => {
        const file = snapshot.files[i]
        if (!file) return null
        const selected = i === selectedIndex
        const hovered = i === hoveredIndex
        return (
          <Html
            key={i}
            position={[file.position.x, heights[i] + 0.4, file.position.z]}
            zIndexRange={selected || hovered ? [12, 12] : [10, 0]}
            style={{ pointerEvents: "none" }}
          >
            {/* Anchored at its bottom centre, just above the roof */}
            <div
              className={`flex w-max -translate-x-1/2 -translate-y-[calc(100%+4px)] items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1.5 pr-2.5 text-[12px] font-medium leading-none transition-colors ${
                selected
                  ? "cc-label-selected bg-(--lime) text-(--bg-deep) shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                  : hovered
                    ? "bg-(--cream) text-(--bg-deep) shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                    : "bg-[color-mix(in_srgb,var(--bg-deep)_72%,transparent)] text-(--cream-dark) ring-1 ring-[color-mix(in_srgb,var(--cream)_10%,transparent)]"
              }`}
              title={file.path}
            >
              <FileIcon name={fileNames[i]} className="!size-3.5" />
              {labels[i]}
            </div>
          </Html>
        )
      })}
    </group>
  )
}
