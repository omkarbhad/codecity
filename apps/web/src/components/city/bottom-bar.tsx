"use client"

import type { CityStats } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface BottomBarProps {
  stats: CityStats
  warnings?: string[]
}

export function BottomBar({ stats, warnings }: BottomBarProps) {
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const visualizationMode = useCityStore((s) => s.visualizationMode)
  const layoutMode = useCityStore((s) => s.layoutMode)
  const toggleShortcutsOverlay = useCityStore((s) => s.toggleShortcutsOverlay)

  const modeLabels: Record<string, string> = {
    dependencies: "Dependencies",
    complexity: "Complexity",
    unused: "Unused Exports",
    filesize: "File Size",
    types: "Types",
  }

  const layoutLabels: Record<string, string> = {
    folder: "Folder",
    extension: "Extension",
    semantic: "Semantic",
  }

  const items = [
    { label: "Files", value: stats.totalFiles, color: "text-cyan-400" },
    { label: "Fn", value: stats.totalFunctions, color: "text-emerald-400" },
    { label: "Imp", value: stats.totalImports, color: "text-blue-400" },
    { label: "Unused", value: stats.unusedExports, color: stats.unusedExports > 0 ? "text-red-400" : "text-white/40" },
    { label: "LOC", value: stats.totalLines, color: "text-amber-400" },
    { label: "Types", value: stats.totalTypes, color: "text-purple-400" },
  ]

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 mb-3">
      <div className="glass-panel px-4 py-1.5 flex items-center gap-1">
        <div className="flex items-center gap-2 pr-3 border-r border-white/[0.06]">
          <span className="font-mono text-[8px] text-primary/70 uppercase tracking-wider bg-primary/[0.06] px-1.5 py-0.5 rounded border border-primary/10">
            {layoutLabels[layoutMode] ?? layoutMode}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-[8px] text-white/40 uppercase tracking-wider">
              {modeLabels[visualizationMode] ?? visualizationMode}
            </span>
          </span>
        </div>

        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1 px-2.5">
            <span className={`font-mono text-[11px] font-semibold tabular-nums ${item.color}`}>
              {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
            </span>
            <span className="font-mono text-[8px] text-white/25 uppercase tracking-wider">
              {item.label}
            </span>
            {i < items.length - 1 && (
              <span className="ml-1 w-px h-2.5 bg-white/[0.05]" />
            )}
          </div>
        ))}

        {(hiddenExtensions.size > 0 || hiddenPaths.size > 0) && (
          <div className="flex items-center gap-1.5 pl-2.5 border-l border-white/[0.06]">
            {hiddenExtensions.size > 0 && (
              <span className="font-mono text-[8px] text-amber-400/80 bg-amber-400/[0.06] px-1.5 py-0.5 rounded">
                {hiddenExtensions.size} ext
              </span>
            )}
            {hiddenPaths.size > 0 && (
              <span className="font-mono text-[8px] text-orange-400/80 bg-orange-400/[0.06] px-1.5 py-0.5 rounded">
                {hiddenPaths.size} path
              </span>
            )}
          </div>
        )}

        {warnings && warnings.length > 0 && (
          <div className="pl-2.5 border-l border-white/[0.06]">
            <span
              className="font-mono text-[8px] text-amber-400/80 bg-amber-400/[0.06] px-1.5 py-0.5 rounded cursor-help"
              title={`${warnings.length} file(s) had parse errors`}
            >
              {warnings.length} warn
            </span>
          </div>
        )}

        <div className="pl-2.5 border-l border-white/[0.06]">
          <button
            onClick={toggleShortcutsOverlay}
            className="font-mono text-[9px] text-white/40 hover:text-white/70 transition-colors px-1 py-0.5 rounded hover:bg-white/[0.05]"
            title="Keyboard shortcuts (?)"
          >?</button>
        </div>
      </div>
    </div>
  )
}
