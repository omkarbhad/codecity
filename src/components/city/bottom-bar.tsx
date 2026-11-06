"use client"

import { useState, useRef, useEffect } from "react"
import type { CityStats } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

const LEGEND_ITEMS = [
  { icon: "\u25AE", label: "Height = Lines of code", color: "#38f0ff" },
  { icon: "\u25AC", label: "Width = Functions", color: "#4aeaab" },
  { icon: "\u25AD", label: "Wide base = 200+ lines", color: "#6ab0ff" },
  { icon: "\u2502", label: "Antenna + red light = High complexity", color: "#ff5050" },
  { icon: "\u2312", label: "Dome = React component", color: "#4d94ff" },
  { icon: "\u25CB", label: "Roof ring = Rich types", color: "#ffd34e" },
  { icon: "\u25A3", label: "City block = Directory", color: "#b99eff" },
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
    { label: "Files", value: stats.totalFiles, color: "text-(--cream)" },
    { label: "Functions", value: stats.totalFunctions, color: "text-(--cream)" },
    { label: "Imports", value: stats.totalImports, color: "text-(--cream)" },
    { label: "Unused", value: stats.unusedExports, color: stats.unusedExports > 0 ? "text-(--sev-high)" : "text-(--cream-dark)" },
    { label: "Lines", value: stats.totalLines, color: "text-(--cream)" },
    { label: "Types", value: stats.totalTypes, color: "text-(--cream)" },
  ]

  return (
    <div className="relative">
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-t-2 border-(--border-pixel) bg-(--bg-card) px-2 font-mono text-[10px]">
        {/* Left: mode indicators */}
        <span className="border-2 border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-(--cream-dark)">
          {layoutLabels[layoutMode]}
        </span>
        <span className="flex items-center gap-1 border-2 border-primary bg-[color-mix(in_srgb,var(--lime)_10%,transparent)] px-1.5 py-0.5">
          <span className="size-1 bg-primary motion-safe:animate-pulse" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.05em] text-primary">
            {modeLabels[visualizationMode]}
          </span>
        </span>

        <span className="mx-1 text-(--dim)">·</span>

        {/* Stats */}
        {items.map((item, i) => (
          <span key={i} className="flex items-baseline gap-1 px-1">
            <span className={`font-mono text-[11px] font-bold tabular-nums ${item.color}`}>
              {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-(--muted)">{item.label}</span>
          </span>
        ))}

        {(hiddenExtensions.size > 0 || hiddenPaths.size > 0) && (
          <>
            <span className="mx-0.5 text-(--dim)">·</span>
            {hiddenExtensions.size > 0 && (
              <span className="border-2 border-(--sev-med) bg-[color-mix(in_srgb,var(--sev-med)_8%,transparent)] px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.05em] text-(--sev-med)">
                {hiddenExtensions.size} EXT
              </span>
            )}
            {hiddenPaths.size > 0 && (
              <span className="ml-0.5 border-2 border-(--sev-med) bg-[color-mix(in_srgb,var(--sev-med)_8%,transparent)] px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.05em] text-(--sev-med)">
                {hiddenPaths.size} PATH
              </span>
            )}
          </>
        )}

        {warnings && warnings.length > 0 && (
          <>
            <span className="mx-0.5 text-(--dim)">·</span>
            <span className="cursor-help border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.05em] text-(--sev-high)" title={`${warnings.length} parse errors`}>
              {warnings.length} WARN
            </span>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right: help */}
        <button
          ref={helpBtnRef}
          onClick={() => setHelpOpen((v) => !v)}
          className={`flex h-6 w-6 items-center justify-center rounded-none border-2 font-mono text-[11px] font-bold transition-colors ${
            helpOpen
              ? "border-(--bg) bg-primary text-primary-foreground"
              : "border-(--border-pixel) bg-(--bg-raised) text-(--cream-dark) hover:border-(--border-light) hover:text-(--cream)"
          }`}
          aria-label="Help — keyboard shortcuts and visual guide"
          aria-expanded={helpOpen}
        >?</button>
      </div>

      {/* Help popup — cc-frame style */}
      {helpOpen && (
        <div
          ref={helpRef}
          className="pixel-shadow-lg absolute bottom-9 right-1 z-[70] max-h-[70vh] w-[min(340px,calc(100vw-2rem))] overflow-hidden border-2 border-(--border-light) bg-(--bg-deep)"
        >
          {/* Header */}
          <div className="shrink-0 border-b-2 border-(--border-pixel) bg-(--bg-card) px-3 py-2">
            <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-(--cream)">
              Help
            </span>
          </div>

          {/* Body */}
          <div className="max-h-[60vh] overflow-y-auto scroll-thin">
            <div className="px-3 pt-3 pb-2">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-(--cream)">Visual guide</p>
              <div className="space-y-1">
                {LEGEND_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="w-4 text-center text-sm shrink-0" style={{ color: item.color }}>{item.icon}</span>
                    <span className="font-mono text-[11px] text-(--cream-dark)">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-dashed border-(--border-pixel) px-3 pt-3 pb-3">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-(--cream)">Shortcuts</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {SHORTCUTS.map(([key, desc]) => (
                  <div key={key} className="flex items-center gap-2">
                    <kbd className="min-w-[42px] border-2 border-(--border-pixel) bg-(--bg-raised) px-1.5 py-0.5 text-center font-mono text-[10px] uppercase tracking-[0.05em] text-(--cream)">{key}</kbd>
                    <span className="font-mono text-[10px] text-(--cream-dark)">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
