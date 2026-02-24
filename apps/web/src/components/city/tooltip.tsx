"use client"

import { useEffect, useState } from "react"
import type { CitySnapshot } from "@/lib/types/city"
import { useCityStore } from "./use-city-store"

interface Props {
  snapshot: CitySnapshot
}

export function CityTooltip({ snapshot }: Props) {
  const { hoveredFile } = useCityStore()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener("mousemove", handler)
    return () => window.removeEventListener("mousemove", handler)
  }, [])

  if (!hoveredFile) return null

  const file = snapshot.files.find((f) => f.path === hoveredFile)
  if (!file) return null

  const district = snapshot.districts.find((d) => d.name === file.district)

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: mousePos.x + 12, top: mousePos.y + 12 }}
    >
      <div className="rounded-lg border border-border/50 bg-card/90 backdrop-blur-xl px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: district?.color ?? "#888" }}
          />
          <span className="font-mono text-xs text-foreground truncate max-w-[200px]">
            {file.path.split("/").pop()}
          </span>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span className="font-mono text-[10px] text-muted-foreground">
            {file.lines} lines
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {file.functions.length} funcs
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            C:{file.complexity}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {file.types.length} types
          </span>
        </div>
      </div>
    </div>
  )
}
