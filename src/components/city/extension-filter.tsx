"use client"

import { useMemo } from "react"
import { FileIcon } from "./file-icons"
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons"
import type { CitySnapshot } from "@/lib/types/city"
import { AppIcon } from "@/components/ui/app-icon"
import { useCityStore } from "./use-city-store"

interface ExtensionFilterProps {
  snapshot: CitySnapshot
}

// Same file-type icon set the explorer uses; vscode-icons' "light_" variants vanish on dark backgrounds.
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

  const pctShown = snapshot.files.length > 0 ? Math.round((visibleCount / snapshot.files.length) * 100) : 100

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Section header */}
      <div className="flex shrink-0 items-center gap-2 px-3.5 pb-2">
        <span className="flex-1 text-[12px] text-(--muted)">Show in the city</span>
        <div className="cc-seg" role="group" aria-label="Show or hide all file types">
          <button
            type="button"
            onClick={showAllExtensions}
            disabled={noneHidden}
            className="cc-seg-btn h-6 px-2.5 text-[12px] disabled:pointer-events-none disabled:opacity-40"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => hideAllExtensions(allExts)}
            disabled={allHidden}
            className="cc-seg-btn h-6 px-2.5 text-[12px] disabled:pointer-events-none disabled:opacity-40"
          >
            None
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain py-1 scroll-thin">
        {extensionData.map(({ ext, count }) => {
          const isHidden = hiddenExtensions.has(ext)
          const label = ext === ".other" ? "no extension" : ext

          return (
            <button
              key={ext}
              type="button"
              onClick={() => toggleExtension(ext)}
              aria-pressed={!isHidden}
              title={isHidden ? `Show ${label} files` : `Hide ${label} files`}
              className={`group mx-1.5 flex h-7 w-[calc(100%-12px)] items-center gap-2 rounded-md px-2.5 text-left text-[13px] transition-colors ${
                isHidden ? "text-(--muted) hover:bg-(--bg-raised) hover:text-(--cream-dark)" : "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
              }`}
            >
              <FileIcon name={ext === ".other" ? "file" : `file${ext}`} className={isHidden ? "opacity-30 grayscale" : ""} />
              <span className={`flex-1 truncate ${isHidden ? "line-through opacity-60" : ""}`}>
                {label}
              </span>
              <span className={`shrink-0 text-[12px] tabular-nums ${isHidden ? "text-(--muted)" : "text-(--muted)"}`}>
                {count}
              </span>
              <AppIcon
                icon={isHidden ? EyeOffIcon : EyeIcon}
                className={`size-3.5 shrink-0 ${isHidden ? "text-(--dim)" : "text-(--muted) group-hover:text-(--cream)"}`}
              />
            </button>
          )
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2.5 border-t border-(--border-pixel) px-3.5 py-2">
        <span className="text-[12px] text-(--muted)">
          <span className="tabular-nums text-(--cream-dark)">{visibleCount}</span>/<span className="tabular-nums">{snapshot.files.length}</span> shown
        </span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-(--bg-raised)" aria-hidden="true">
          <span className="block h-full rounded-full bg-(--cream-dark) transition-[width] duration-300" style={{ width: `${pctShown}%` }} />
        </span>
      </div>
    </div>
  )
}

/** Utility to get file extension — exported for use in other components */
export { getExtension }
