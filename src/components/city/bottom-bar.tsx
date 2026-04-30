"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import type { CityStats } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

const LEGEND_ITEMS = [
  { icon: "\u25AE", label: "Height = Lines of code", color: "#38f0ff" },
  { icon: "\u25AC", label: "Width = Functions", color: "#4aeaab" },
  { icon: "\u25AD", label: "Platform = 200+ lines", color: "#6ab0ff" },
  { icon: "\u2502", label: "Antenna = High complexity", color: "#ff5050" },
  { icon: "\u2312", label: "Dome = React component", color: "#4d94ff" },
  { icon: "\u25CB", label: "Ring = Rich types", color: "#ffd34e" },
  { icon: "\u25A3", label: "Ground = Directory", color: "#b99eff" },
]

const SHORTCUTS = [
  ["Click", "Select building"],
  ["L-Drag", "Pan camera"],
  ["R-Drag", "Orbit"],
  ["Scroll", "Zoom"],
  ["WASD", "Pan"],
  ["R", "Reset camera"],
  ["1-5", "Viz mode"],
  ["B", "Toggle labels"],
  ["/", "Search"],
  ["L", "Toggle panel"],
  ["Tab", "Next file"],
  ["Esc", "Deselect"],
]

interface BottomBarProps {
  stats: CityStats
  warnings?: string[]
}

export function BottomBar({ stats, warnings }: BottomBarProps) {
  const hiddenExtensions = useCityStore((s) => s.hiddenExtensions)
  const hiddenPaths = useCityStore((s) => s.hiddenPaths)
  const visualizationMode = useCityStore((s) => s.visualizationMode)
  const layoutMode = useCityStore((s) => s.layoutMode)
  const [helpOpen, setHelpOpen] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)
  const helpBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!helpOpen) return
    function handleClick(e: MouseEvent) {
      if (helpBtnRef.current && helpBtnRef.current.contains(e.target as Node)) return
      if (helpRef.current && helpRef.current.contains(e.target as Node)) return
      setHelpOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [helpOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === "INPUT") return
      if (e.key === "?") { e.preventDefault(); setHelpOpen((v) => !v) }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const modeLabels: Record<string, string> = {
    dependencies: "Dependencies", complexity: "Complexity", unused: "Unused", filesize: "Size", types: "Types",
  }
  const layoutLabels: Record<string, string> = {
    folder: "Folder", extension: "Extension", semantic: "Semantic",
  }

  const items = [
    { label: "Files", value: stats.totalFiles, color: "text-primary" },
    { label: "Fns", value: stats.totalFunctions, color: "text-emerald-400" },
    { label: "Imports", value: stats.totalImports, color: "text-blue-400" },
    { label: "Unused", value: stats.unusedExports, color: stats.unusedExports > 0 ? "text-red-400" : "text-white/75" },
    { label: "LOC", value: stats.totalLines, color: "text-amber-400" },
    { label: "Types", value: stats.totalTypes, color: "text-purple-400" },
  ]

  return (
    <div className="relative">
      <div className="flex h-8 shrink-0 items-center gap-1 border-t border-white/[0.08] bg-[#0b0b0c]/95 px-2 text-[10px] shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
        {/* Left: mode indicators */}
        <span className="rounded-md border border-white/[0.08] bg-white/[0.045] px-2 py-0.5 text-[10px] font-medium text-white/68">
          {layoutLabels[layoutMode]}
        </span>
        <span className="ml-1 flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-0.5">
          <span className="w-1 h-1 rounded-full bg-primary motion-safe:animate-pulse" />
          <span className="text-[10px] font-medium text-white/60">
            {modeLabels[visualizationMode]}
          </span>
        </span>

        <div className="mx-1.5 h-3 w-px bg-white/[0.08]" />

        {/* Stats */}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1 rounded px-1.5 py-0.5">
            <span className={`text-[10px] font-bold tabular-nums ${item.color}`}>
              {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
            </span>
            <span className="text-[9px] font-medium text-white/45">{item.label}</span>
          </div>
        ))}

        {(hiddenExtensions.size > 0 || hiddenPaths.size > 0) && (
          <>
            <div className="mx-1 h-3 w-px bg-white/[0.08]" />
            {hiddenExtensions.size > 0 && (
              <span className="rounded-md border border-amber-400/[0.10] bg-amber-400/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-amber-400/80">{hiddenExtensions.size} ext</span>
            )}
            {hiddenPaths.size > 0 && (
              <span className="ml-0.5 rounded-md border border-orange-400/[0.10] bg-orange-400/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-orange-400/80">{hiddenPaths.size} path</span>
            )}
          </>
        )}

        {warnings && warnings.length > 0 && (
          <>
            <div className="mx-1 h-3 w-px bg-white/[0.08]" />
            <span className="cursor-help rounded-md border border-amber-400/[0.10] bg-amber-400/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-amber-400/80" title={`${warnings.length} parse errors`}>
              {warnings.length} warn
            </span>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: help */}
        <button
          ref={helpBtnRef}
          onClick={() => setHelpOpen((v) => !v)}
          className={`flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold transition-colors ${
            helpOpen ? "border-white/[0.10] bg-white/[0.09] text-white" : "border-transparent text-white/50 hover:border-white/[0.06] hover:bg-white/[0.05] hover:text-white/75"
          }`}
          aria-label="Help — keyboard shortcuts and visual guide"
          aria-expanded={helpOpen}
        >?</button>
      </div>

      {/* Help popup — anchored to bottom-right */}
      {helpOpen && (
        <div
          ref={helpRef}
          className="absolute bottom-9 right-1 z-[70] max-h-[70vh] w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-white/[0.10] bg-[#101012] p-3 shadow-2xl shadow-black/45"
        >
          <p className="mb-2 text-xs font-medium text-white/70">Visual guide</p>
          <div className="space-y-1 mb-3 pb-3 border-b border-white/[0.04]">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="w-4 text-center text-sm shrink-0" style={{ color: item.color }}>{item.icon}</span>
                <span className="text-[11px] text-white/75">{item.label}</span>
              </div>
            ))}
          </div>

          <p className="mb-2 text-xs font-medium text-white/70">Shortcuts</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {SHORTCUTS.map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] font-sans text-[9px] text-white/65 min-w-[40px] text-center">{key}</kbd>
                <span className="text-[10px] text-white/75">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
