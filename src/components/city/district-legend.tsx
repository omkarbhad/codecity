"use client"

import { useMemo } from "react"
import type { CitySnapshot } from "@/lib/types/city"
import { isPathHidden, useCityStore } from "./use-city-store"
import { getExtension } from "./extension-filter"

function formatLines(lines: number): string {
  if (lines >= 1_000_000) return `${(lines / 1_000_000).toFixed(1)}M`
  if (lines >= 1000) return `${(lines / 1000).toFixed(1)}k`
  return String(lines)
}

interface DistrictLegendProps {
  snapshot: CitySnapshot
}

export function DistrictLegend({ snapshot }: DistrictLegendProps) {
  const selectFile = useCityStore((s) => s.selectFile)
  const selectedFile = useCityStore((s) => s.selectedFile)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)

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

  // Jump to the district's biggest visible file, passing its index so the
  // building gets the same highlight as a click in the city.
  function handleDistrictClick(districtName: string) {
    let best = -1
    snapshot.files.forEach((file, index) => {
      if (file.district !== districtName) return
      if (isPathHidden(file.path, hiddenPaths) || hiddenExtensions.has(getExtension(file.path))) return
      if (best === -1 || file.lines > snapshot.files[best].lines) best = index
    })
    if (best !== -1) selectFile(snapshot.files[best].path, best)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto overscroll-contain py-1 scroll-thin">
        {snapshot.districts.map((district) => {
          const stats = districtStats.get(district.name)
          const isActive = selectedDistrict === district.name

          return (
            <button
              key={district.name}
              type="button"
              onClick={() => handleDistrictClick(district.name)}
              aria-current={isActive || undefined}
              title={`${district.name}: ${district.files.length} files, ${stats ? formatLines(stats.lines) : 0} lines`}
              className={`mx-1.5 flex h-7 w-[calc(100%-12px)] items-center gap-2.5 rounded-md px-2.5 text-left text-[13px] transition-colors ${
                isActive
                  ? "bg-(--bg-on) text-(--cream) shadow-[inset_0_0_0_1px_var(--border-light)]"
                  : "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
              }`}
            >
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: district.color }} />
              <span className="flex-1 truncate">{district.name}</span>
              {/* Files in the district; lines are in the tooltip */}
              <span className="shrink-0 text-[12px] tabular-nums text-(--muted)">{district.files.length}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
