"use client"

import { useMemo } from "react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface DistrictLegendProps {
  snapshot: CitySnapshot
}

export function DistrictLegend({ snapshot }: DistrictLegendProps) {
  const selectFile = useCityStore((s) => s.selectFile)
  const selectedFile = useCityStore((s) => s.selectedFile)

  // Compute total lines per district
  const districtStats = useMemo(() => {
    const stats = new Map<string, { lines: number; functions: number }>()
    for (const file of snapshot.files) {
      const existing = stats.get(file.district) ?? { lines: 0, functions: 0 }
      existing.lines += file.lines
      existing.functions += file.functions.length
      stats.set(file.district, existing)
    }
    return stats
  }, [snapshot.files])

  // Find which district the selected file belongs to
  const selectedDistrict = useMemo(() => {
    if (!selectedFile) return null
    const file = snapshot.files.find((f) => f.path === selectedFile)
    return file?.district ?? null
  }, [selectedFile, snapshot.files])

  function handleDistrictClick(districtName: string) {
    const district = snapshot.districts.find((d) => d.name === districtName)
    if (district && district.files.length > 0) {
      selectFile(district.files[0])
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin">
        {snapshot.districts.map((district) => {
          const stats = districtStats.get(district.name)
          const isActive = selectedDistrict === district.name

          return (
            <button
              key={district.name}
              onClick={() => handleDistrictClick(district.name)}
              className={`flex w-full items-center gap-2 border-b border-dashed border-(--border-pixel) px-2 py-1.5 text-left font-mono text-[11px] transition-colors
                ${isActive
                  ? "bg-(--bg-raised) text-(--cream)"
                  : "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
                }`}
            >
              <span
                className={`inline-block size-2.5 shrink-0 border ${isActive ? "border-(--cream)" : "border-(--border-strong)"}`}
                style={{ backgroundColor: district.color }}
              />
              <span className="flex-1 truncate">{district.name}</span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-(--muted)">
                {stats ? `${(stats.lines / 1000).toFixed(1)}k` : ""}
              </span>
              <span className="shrink-0 border-2 border-(--border-pixel) bg-(--bg-deep) px-1 py-px font-mono text-[10px] tabular-nums text-(--cream-dark)">
                {district.files.length}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
