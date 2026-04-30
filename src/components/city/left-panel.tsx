"use client"

import type { CitySnapshot } from "@/lib/types/city"
import { Minimap } from "./minimap"
import { DistrictLegend } from "./district-legend"
import { FileTree } from "./file-tree"
import { ExtensionFilter } from "./extension-filter"
import { useCityStore } from "./use-city-store"

interface LeftPanelProps {
  snapshot: CitySnapshot
  collapsed: boolean
}

export function LeftPanel({ snapshot, collapsed }: LeftPanelProps) {
  const toggleLeftPanel = useCityStore((s) => s.toggleLeftPanel)

  return (
    <>
      {/* Mobile backdrop — tap to close */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-[49] bg-black/50 sm:hidden"
          onClick={toggleLeftPanel}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed left-0 top-10 bottom-0 z-[50] m-1.5 mb-2 transition-all duration-200 ease-out
          w-[calc(100vw-3rem)] sm:w-[240px]
          ${collapsed ? "opacity-0 -translate-x-full pointer-events-none" : "opacity-100 translate-x-0"}`}
      >
        <div className="bg-black/40 backdrop-blur-2xl border border-white/[0.07] rounded-lg shadow-2xl shadow-black/50 h-full flex flex-col overflow-hidden">
          {/* File tree — fills all remaining space, owns the scroll */}
          <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent min-h-0">
            <FileTree snapshot={snapshot} />
          </div>
          {/* Bottom widgets — capped height so they never crush the tree */}
          <div className="shrink-0 border-t border-white/[0.04] p-2 space-y-2 max-h-[280px] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <ExtensionFilter snapshot={snapshot} />
            <DistrictLegend snapshot={snapshot} />
            <Minimap snapshot={snapshot} />
          </div>
        </div>
      </div>
    </>
  )
}
