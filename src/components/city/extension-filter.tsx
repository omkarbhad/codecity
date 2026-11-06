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
    <div className="flex h-full flex-col overflow-hidden border-2 border-(--border-pixel) bg-(--bg-card)">
      {/* Section header */}
      <div className="flex shrink-0 items-center gap-2 border-b-2 border-(--border-pixel) bg-(--bg-raised) px-2 py-1.5">
        <span className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-(--cream)">
          Ext
        </span>
        <button
          onClick={showAllExtensions}
          disabled={noneHidden}
          className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--cream-dark) transition-colors hover:text-primary disabled:text-(--dim) disabled:hover:text-(--dim)"
        >
          ALL
        </button>
        <span className="font-mono text-(--very-dim)">·</span>
        <button
          onClick={() => hideAllExtensions(allExts)}
          disabled={allHidden}
          className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--cream-dark) transition-colors hover:text-primary disabled:text-(--dim) disabled:hover:text-(--dim)"
        >
          NONE
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin">
        {extensionData.map(({ ext, count }) => {
          const isHidden = hiddenExtensions.has(ext)
          const icon = EXT_ICONS[ext] ?? ext.replace(".", "").slice(0, 2).toUpperCase()
          const color = EXT_COLORS[ext] ?? "#888"

          return (
            <button
              key={ext}
              onClick={() => toggleExtension(ext)}
              className={`flex w-full items-center gap-2 border-b border-dashed border-(--border-pixel) px-2 py-1.5 text-left font-mono text-[11px] transition-colors
                ${isHidden
                  ? "text-(--dim) hover:bg-(--bg-deep)"
                  : "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
                }`}
            >
              {isHidden ? (
                <EyeOff className="size-3 shrink-0 text-(--very-dim)" />
              ) : (
                <Eye className="size-3 shrink-0 text-(--lime)" />
              )}
              <span
                className={`inline-block w-6 shrink-0 border-2 px-0.5 py-px text-center font-mono text-[10px] font-bold uppercase tracking-[0.04em] ${
                  isHidden ? "border-(--very-dim) opacity-30" : "border-(--border-pixel)"
                }`}
                style={{ color }}
              >
                {icon}
              </span>
              <span className={`flex-1 truncate ${isHidden ? "line-through opacity-50" : ""}`}>
                {ext}
              </span>
              <span className={`ml-1 shrink-0 font-mono text-[10px] tabular-nums ${isHidden ? "text-(--very-dim)" : "text-(--muted)"}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {hiddenExtensions.size > 0 && (
        <div className="border-t-2 border-(--border-pixel) bg-(--bg-raised) px-2 py-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">
            <span className="text-(--dim)">{">"}</span> <span className="text-(--cream-dark) tabular-nums">{visibleCount}</span>/<span className="text-(--cream-dark) tabular-nums">{snapshot.files.length}</span> shown
          </span>
        </div>
      )}
    </div>
  )
}

/** Utility to get file extension — exported for use in other components */
export { getExtension }
