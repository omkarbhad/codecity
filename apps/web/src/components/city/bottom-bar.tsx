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
  const [helpPos, setHelpPos] = useState({ bottom: 0, right: 0 })

  const openHelp = useCallback(() => {
    if (helpBtnRef.current) {
      const r = helpBtnRef.current.getBoundingClientRect()
      setHelpPos({ bottom: window.innerHeight - r.top + 8, right: window.innerWidth - r.right })
    }
    setHelpOpen((v) => !v)
  }, [])

  useEffect(() => {
    if (!helpOpen) return
    function handleClick(e: MouseEvent) {
      if (helpBtnRef.current && helpBtnRef.current.contains(e.target as Node)) return
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
    <div className="fixed bottom-3 left-1/2 z-40" style={{ transform: "translateX(-50%)" }}>
      <div
        className="bg-black/40 backdrop-blur-2xl rounded-lg border border-white/[0.07] shadow-2xl shadow-black/50 px-3 py-1.5 flex items-center gap-1"
      >
        <div className="flex items-center gap-2 pr-2.5 border-r border-white/[0.06]">
          <span className="text-[9px] text-primary/80 font-medium bg-primary/[0.08] px-1.5 py-0.5 rounded border border-primary/[0.1]">
            {layoutLabels[layoutMode]}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] text-white/65 font-medium">
              {modeLabels[visualizationMode]}
            </span>
          </span>
        </div>

        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1 px-2">
            <span className={`text-[11px] font-bold tabular-nums ${item.color}`}>
              {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
            </span>
            <span className="text-[8px] text-white/65 font-medium">{item.label}</span>
          </div>
        ))}

        {(hiddenExtensions.size > 0 || hiddenPaths.size > 0) && (
          <div className="flex items-center gap-1 pl-2 border-l border-white/[0.06]">
            {hiddenExtensions.size > 0 && (
              <span className="text-[8px] text-amber-400/80 bg-amber-400/[0.06] px-1.5 py-0.5 rounded font-medium">{hiddenExtensions.size} ext</span>
            )}
            {hiddenPaths.size > 0 && (
              <span className="text-[8px] text-orange-400/80 bg-orange-400/[0.06] px-1.5 py-0.5 rounded font-medium">{hiddenPaths.size} path</span>
            )}
          </div>
        )}

        {warnings && warnings.length > 0 && (
          <div className="pl-2 border-l border-white/[0.06]">
            <span className="text-[8px] text-amber-400/80 bg-amber-400/[0.06] px-1.5 py-0.5 rounded font-medium cursor-help" title={`${warnings.length} parse errors`}>
              {warnings.length} warn
            </span>
          </div>
        )}

        {/* Help button — opens combined legend + shortcuts */}
        <div ref={helpRef} className="pl-2 border-l border-white/[0.06]">
          <button
            ref={helpBtnRef}
            onClick={openHelp}
            className={`w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded transition-all ${
              helpOpen ? "bg-primary/15 text-primary border border-primary/20" : "text-white/75 hover:text-white/85 hover:bg-white/[0.05] border border-transparent"
            }`}
            aria-label="Help — keyboard shortcuts and visual guide"
            aria-expanded={helpOpen}
          >?</button>
        </div>

        {helpOpen && (
          <div
            className="fixed w-[320px] bg-black/50 backdrop-blur-2xl border border-white/[0.07] rounded-lg shadow-2xl shadow-black/60 p-3 z-[100]"
            style={{ bottom: helpPos.bottom, right: helpPos.right }}
          >
            {/* Legend */}
            <p className="text-[10px] text-white/75 uppercase tracking-widest font-medium mb-2">Visual Guide</p>
            <div className="space-y-1 mb-3 pb-3 border-b border-white/[0.04]">
              {LEGEND_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-4 text-center text-sm shrink-0" style={{ color: item.color }}>{item.icon}</span>
                  <span className="text-[11px] text-white/75">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Shortcuts */}
            <p className="text-[10px] text-white/75 uppercase tracking-widest font-medium mb-2">Shortcuts</p>
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
    </div>
  )
}
