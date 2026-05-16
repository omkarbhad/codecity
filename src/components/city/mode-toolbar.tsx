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
    <div className="flex items-center border-2 border-(--border-pixel) bg-(--bg-card)">
      {MODES.map(({ mode, label, dotColor }) => {
        const active = visualizationMode === mode
        return (
          <button
            key={mode}
            onClick={() => setMode(mode)}
            title={getModeDescription(mode)}
            className={`
              flex h-8 cursor-pointer items-center gap-1.5 px-2.5 font-mono text-[10px] font-medium uppercase tracking-[0.05em]
              transition-colors duration-150
              ${
                active
                  ? "bg-primary text-[#0d0d0f]"
                  : "text-(--cream-dark) hover:bg-(--bg-raised) hover:text-(--cream)"
              }
            `}
          >
            <span
              className={`inline-block size-2 shrink-0 ${active ? "motion-safe:animate-pulse" : ""}`}
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
