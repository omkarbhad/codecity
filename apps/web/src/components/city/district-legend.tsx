"use client"

import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface DistrictLegendProps {
  snapshot: CitySnapshot
}

export function DistrictLegend({ snapshot }: DistrictLegendProps) {
  const { selectFile } = useCityStore()

  function handleDistrictClick(districtName: string) {
    const district = snapshot.districts.find((d) => d.name === districtName)
    if (district && district.files.length > 0) {
      selectFile(district.files[0])
    }
  }

  return (
    <div className="bg-card/30 backdrop-blur-xl rounded-lg border border-border/30 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/30">
        <span className="font-mono text-xs text-white/50 uppercase tracking-wider">
          Districts
        </span>
      </div>
      <div className="py-1">
        {snapshot.districts.map((district) => (
          <button
            key={district.name}
            onClick={() => handleDistrictClick(district.name)}
            className="flex items-center gap-2 w-full text-left px-3 py-1.5
              font-mono text-xs text-white/60 hover:text-white/90 hover:bg-white/5
              transition-colors duration-100 cursor-pointer"
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: district.color }}
            />
            <span className="truncate">{district.name}</span>
            <span className="text-white/30 ml-auto shrink-0">
              {district.files.length}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
