"use client"

import { useCityStore, type VisualizationMode } from "./use-city-store"

interface ModeOption {
  mode: VisualizationMode
  label: string
  dotColor: string
}

const MODES: ModeOption[] = [
  { mode: "dependencies", label: "Dependencies", dotColor: "#22d3ee" },
  { mode: "complexity", label: "Complexity", dotColor: "#ff4040" },
  { mode: "filesize", label: "File Size", dotColor: "#fbbf24" },
  { mode: "unused", label: "Unused", dotColor: "#fb923c" },
  { mode: "types", label: "Types", dotColor: "#a78bfa" },
]

export function ModeToolbar() {
  const { visualizationMode, setMode } = useCityStore()

  return (
    <div className="flex items-center gap-1 backdrop-blur-xl bg-card/60 border border-border/50 rounded-lg px-2 py-1">
      {MODES.map(({ mode, label, dotColor }) => {
        const active = visualizationMode === mode
        return (
          <button
            key={mode}
            onClick={() => setMode(mode)}
            className={`
              flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-mono
              transition-colors duration-150 cursor-pointer
              ${
                active
                  ? "bg-white/10 border border-white/20 text-white"
                  : "border border-transparent text-white/50 hover:text-white/80 hover:bg-white/5"
              }
            `}
          >
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
            />
            {label}
          </button>
        )
      })}
    </div>
  )
}
