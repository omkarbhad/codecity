"use client"

import type { CitySnapshot } from "@/lib/types/city"
import { Minimap } from "./minimap"
import { DistrictLegend } from "./district-legend"
import { FileTree } from "./file-tree"
import { ExtensionFilter } from "./extension-filter"

interface LeftPanelProps {
  snapshot: CitySnapshot
  collapsed: boolean
}

export function LeftPanel({ snapshot, collapsed }: LeftPanelProps) {
  return (
    <div
      className={`fixed left-0 top-10 bottom-8 w-[240px] z-40 m-1.5 transition-all duration-200 ease-out ${
        collapsed ? "opacity-0 -translate-x-full pointer-events-none" : "opacity-100 translate-x-0"
      }`}
    >
      <div className="bg-black/40 backdrop-blur-2xl border border-white/[0.07] rounded-lg shadow-2xl shadow-black/50 h-full flex flex-col">
        {/* File tree gets all available space and scrolls independently */}
        <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin p-2 min-h-0">
          <FileTree snapshot={snapshot} />
        </div>
        {/* Fixed-height widgets pinned to bottom */}
        <div className="shrink-0 p-2 pt-0 space-y-2 border-t border-white/[0.04]">
          <ExtensionFilter snapshot={snapshot} />
          <DistrictLegend snapshot={snapshot} />
          <Minimap snapshot={snapshot} />
        </div>
      </div>
    </div>
  )
}
