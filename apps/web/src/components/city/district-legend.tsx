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
    <div className="bg-white/[0.02] backdrop-blur-xl rounded-lg border border-white/[0.06] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-white/[0.06]">
        <span className="font-mono text-[10px] text-white/40 uppercase tracking-wider">
          Districts
          <span className="ml-1.5 text-white/20">{snapshot.districts.length}</span>
        </span>
      </div>
      <div className="py-0.5">
        {snapshot.districts.map((district) => {
          const stats = districtStats.get(district.name)
          const isActive = selectedDistrict === district.name

          return (
            <button
              key={district.name}
              onClick={() => handleDistrictClick(district.name)}
              className={`flex items-center gap-2 w-full text-left px-3 py-1.5
                font-mono text-[11px] transition-all duration-150 cursor-pointer
                ${isActive
                  ? "text-white/90 bg-white/[0.06]"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"
                }`}
            >
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm shrink-0 transition-shadow"
                style={{
                  backgroundColor: district.color,
                  boxShadow: isActive
                    ? `0 0 8px ${district.color}60`
                    : `0 0 4px ${district.color}30`,
                }}
              />
              <span className="truncate flex-1">{district.name}</span>
              <span className="text-white/15 text-[9px] shrink-0 mr-1">
                {stats ? `${(stats.lines / 1000).toFixed(1)}k` : ""}
              </span>
              <span className="text-white/25 text-[10px] shrink-0 bg-white/[0.04] px-1.5 py-0.5 rounded">
                {district.files.length}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
