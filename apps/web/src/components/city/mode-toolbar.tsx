"use client"

import { useCityStore, type VisualizationMode } from "./use-city-store"

interface ModeOption {
  mode: VisualizationMode
  label: string
  dotColor: string
  shortLabel: string
}

const MODES: ModeOption[] = [
  { mode: "dependencies", label: "Dependencies", shortLabel: "Deps", dotColor: "#22d3ee" },
  { mode: "complexity", label: "Complexity", shortLabel: "Cx", dotColor: "#ff4040" },
  { mode: "filesize", label: "File Size", shortLabel: "Size", dotColor: "#fbbf24" },
  { mode: "unused", label: "Unused", shortLabel: "Un", dotColor: "#fb923c" },
  { mode: "types", label: "Types", shortLabel: "Ty", dotColor: "#a78bfa" },
]

export function ModeToolbar() {
  const visualizationMode = useCityStore((s) => s.visualizationMode)
  const setMode = useCityStore((s) => s.setMode)

  return (
    <div className="flex items-center gap-1 backdrop-blur-xl bg-[#09090b]/92 border border-white/[0.08] rounded-lg px-2 py-1">
      {MODES.map(({ mode, label, dotColor }) => {
        const active = visualizationMode === mode
        return (
          <button
            key={mode}
            onClick={() => setMode(mode)}
            title={getModeDescription(mode)}
            className={`
              flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-sans
              transition-colors duration-150 cursor-pointer
              ${
                active
                  ? "bg-primary text-white border border-primary/30"
                  : "border border-transparent bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.06]"
              }
            `}
          >
            <span
              className={`inline-block w-2 h-2 rounded-full shrink-0 ${active ? "animate-pulse" : ""}`}
              style={{ backgroundColor: dotColor }}
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}

function getModeDescription(mode: VisualizationMode): string {
  switch (mode) {
    case "dependencies": return "Color by folder. Select a file to see import/export connections."
    case "complexity": return "Green → Red gradient by cyclomatic complexity (if/for/while nesting)."
    case "filesize": return "Blue → Red gradient by lines of code."
    case "unused": return "Red = has unused exports, Green = all exports consumed."
    case "types": return "Gold intensity by number of type definitions (interfaces, enums, aliases)."
  }
}
