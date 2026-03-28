"use client"

import { useMemo } from "react"
import { Eye, EyeOff } from "lucide-react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface ExtensionFilterProps {
  snapshot: CitySnapshot
}

const EXT_ICONS: Record<string, string> = {
  ".tsx": "Rx",
  ".ts": "TS",
  ".jsx": "Jx",
  ".js": "JS",
  ".css": "CS",
  ".scss": "SC",
  ".json": "{}",
  ".md": "Md",
  ".yaml": "Ym",
  ".yml": "Ym",
  ".html": "<>",
  ".py": "Py",
  ".go": "Go",
  ".rs": "Rs",
  ".vue": "Vu",
  ".svelte": "Sv",
}

const EXT_COLORS: Record<string, string> = {
  ".tsx": "#4d94ff",
  ".ts": "#3178c6",
  ".jsx": "#f7df1e",
  ".js": "#f0db4f",
  ".css": "#264de4",
  ".scss": "#cd6799",
  ".json": "#5b9e2d",
  ".md": "#ffffff",
  ".py": "#3572a5",
  ".go": "#00add8",
  ".rs": "#dea584",
}

function getExtension(path: string): string {
  const lastDot = path.lastIndexOf(".")
  if (lastDot === -1) return ".other"
  return path.slice(lastDot).toLowerCase()
}

export function ExtensionFilter({ snapshot }: ExtensionFilterProps) {
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const toggleExtension = useCityStore((s) => s.toggleExtension)
  const showAllExtensions = useCityStore((s) => s.showAllExtensions)
  const hideAllExtensions = useCityStore((s) => s.hideAllExtensions)

  const extensionData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const file of snapshot.files) {
      const ext = getExtension(file.path)
      counts.set(ext, (counts.get(ext) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ext, count]) => ({ ext, count }))
  }, [snapshot.files])

  const allExts = useMemo(() => extensionData.map((d) => d.ext), [extensionData])
  const allHidden = hiddenExtensions.size === allExts.length
  const noneHidden = hiddenExtensions.size === 0
  const visibleCount = snapshot.files.filter(
    (f) => !hiddenExtensions.has(getExtension(f.path))
  ).length

  return (
    <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] overflow-hidden">
      <div className="px-3 py-1.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="font-sans text-[10px] font-medium text-white/40 uppercase tracking-wider">
          Extensions
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={showAllExtensions}
            disabled={noneHidden}
            className="text-[9px] font-sans text-white/30 hover:text-white/60 disabled:text-white/10 transition-colors px-1"
            title="Show All"
          >
            All
          </button>
          <span className="text-white/10 text-[9px]">|</span>
          <button
            onClick={() => hideAllExtensions(allExts)}
            disabled={allHidden}
            className="text-[9px] font-sans text-white/30 hover:text-white/60 disabled:text-white/10 transition-colors px-1"
            title="Hide All"
          >
            None
          </button>
        </div>
      </div>
      <div className="py-0.5 max-h-[200px] overflow-y-auto scroll-thin">
        {extensionData.map(({ ext, count }) => {
          const isHidden = hiddenExtensions.has(ext)
          const icon = EXT_ICONS[ext] ?? ext.replace(".", "").slice(0, 2).toUpperCase()
          const color = EXT_COLORS[ext] ?? "#888"

          return (
            <button
              key={ext}
              onClick={() => toggleExtension(ext)}
              className={`flex items-center gap-2 w-full text-left px-3 py-1.5
                font-sans text-[11px] transition-all duration-150 cursor-pointer
                ${isHidden
                  ? "text-white/20 hover:text-white/40 hover:bg-white/[0.02]"
                  : "text-white/60 hover:text-white/80 hover:bg-white/[0.04]"
                }`}
            >
              {isHidden ? (
                <EyeOff className="w-3 h-3 shrink-0 text-white/15" />
              ) : (
                <Eye className="w-3 h-3 shrink-0 text-white/40" />
              )}
              <span
                className={`inline-block w-5 text-center text-[9px] font-bold rounded px-0.5 shrink-0 ${
                  isHidden ? "opacity-30" : ""
                }`}
                style={{ color }}
              >
                {icon}
              </span>
              <span className={`truncate flex-1 ${isHidden ? "line-through opacity-40" : ""}`}>
                {ext}
              </span>
              <span className={`text-[10px] shrink-0 ml-1 ${isHidden ? "text-white/10" : "text-white/25"}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
      {hiddenExtensions.size > 0 && (
        <div className="px-3 py-1.5 border-t border-white/[0.06]">
          <span className="font-sans text-[9px] text-white/30">
            Showing {visibleCount}/{snapshot.files.length} files
          </span>
        </div>
      )}
    </div>
  )
}

/** Utility to get file extension — exported for use in other components */
export { getExtension }
