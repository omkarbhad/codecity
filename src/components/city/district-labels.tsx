"use client"

import { useMemo, memo } from "react"
import { Text } from "@react-three/drei"
import type { CitySnapshot, SubDistrictData } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

const SubDistrictLabelsRecursive = memo(function SubDistrictLabelsRecursive({
  subDistricts,
  depth,
}: {
  subDistricts: SubDistrictData[]
  depth: number
}) {
  if (depth > 3) return null

  const fontSize = Math.max(0.3, 0.8 - depth * 0.18)
  const opacity = Math.max(0.12, 0.45 - depth * 0.1)
  const yPos = 0.14 + depth * 0.03

  return (
    <>
      {subDistricts.map((sub) => {
        if (sub.name === "_root" || sub.bounds.width === 0) return null
        const cx = sub.bounds.x + sub.bounds.width / 2
        const topZ = sub.bounds.z + 0.3

        return (
          <group key={`${sub.name}-d${depth}-${sub.bounds.x.toFixed(1)}`}>
            <Text
              position={[cx, yPos, topZ]}
              fontSize={fontSize}
              color={sub.color}
              fillOpacity={opacity}
              anchorX="center"
              anchorY="bottom"
              maxWidth={sub.bounds.width * 0.85}
              outlineWidth={fontSize * 0.06}
              outlineColor="#000000"
              outlineOpacity={0.4}
            >
              {sub.name}
            </Text>
            {sub.subDistricts && sub.subDistricts.length > 0 && (
              <SubDistrictLabelsRecursive
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

export const DistrictLabels = memo(function DistrictLabels({ snapshot }: { snapshot: CitySnapshot }) {
  const layoutMode = useCityStore((s) => s.layoutMode)

  const fileCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const file of snapshot.files) {
      counts.set(file.district, (counts.get(file.district) ?? 0) + 1)
    }
    return counts
  }, [snapshot.files])

  const totalLines = useMemo(() => {
    const lines = new Map<string, number>()
    for (const file of snapshot.files) {
      lines.set(file.district, (lines.get(file.district) ?? 0) + file.lines)
    }
    return lines
  }, [snapshot.files])

  return (
    <group>
      {snapshot.districts.map((district) => {
        if (district.bounds.width === 0) return null

        const cx = district.bounds.x + district.bounds.width / 2
        const topZ = district.bounds.z + 0.3
        const fileCount = fileCounts.get(district.name) ?? 0
        const lines = totalLines.get(district.name) ?? 0

        // Scale font size with district size
        const fontSize = Math.max(0.5, Math.min(2.0, district.bounds.width * 0.07))

        return (
          <group key={district.name}>
            {/* District name */}
            <Text
              position={[cx, 0.16, topZ]}
              fontSize={fontSize}
              color={district.color}
              fillOpacity={0.6}
              anchorX="center"
              anchorY="bottom"
              maxWidth={district.bounds.width * 0.9}
              outlineWidth={fontSize * 0.05}
              outlineColor="#000000"
              outlineOpacity={0.5}
              letterSpacing={0.12}
            >
              {district.name.toUpperCase()}
            </Text>

            {/* Stats line */}
            <Text
              position={[cx, 0.13, topZ + fontSize * 0.7]}
              fontSize={fontSize * 0.45}
              color={district.color}
              fillOpacity={0.22}
              anchorX="center"
              anchorY="bottom"
              maxWidth={district.bounds.width * 0.9}
            >
              {`${fileCount} file${fileCount !== 1 ? "s" : ""}  ${lines >= 1000 ? `${(lines / 1000).toFixed(1)}k` : lines} LOC`}
            </Text>

            {/* Recursive sub-district labels */}
            {district.subDistricts && district.subDistricts.length > 0 && (
              <SubDistrictLabelsRecursive
                subDistricts={district.subDistricts}
                depth={0}
              />
            )}
          </group>
        )
      })}
    </group>
  )
})
