"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { CitySnapshot } from "@/lib/types/city"
import { Minimap } from "./minimap"
import { DistrictLegend } from "./district-legend"
import { FileTree } from "./file-tree"
import { ExtensionFilter } from "./extension-filter"

interface LeftPanelProps {
  snapshot: CitySnapshot
  collapsed: boolean
}

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left py-1 hover:text-white/50 transition-colors"
      >
        {open ? <ChevronDown className="w-2.5 h-2.5 text-white/30" /> : <ChevronRight className="w-2.5 h-2.5 text-white/30" />}
        <span className="text-[8px] font-mono text-white/30 uppercase tracking-wider">{title}</span>
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  )
}

export function LeftPanel({ snapshot, collapsed }: LeftPanelProps) {
  return (
    <div className={`fixed left-0 top-12 bottom-12 w-[210px] z-40 overflow-y-auto glass-panel m-2 rounded-xl scroll-thin transition-all duration-200 ease-out ${
      collapsed ? "opacity-0 -translate-x-full pointer-events-none" : "opacity-100 translate-x-0"
    }`}>
      <div className="p-2.5 space-y-1.5">
        <CollapsibleSection title="Minimap">
          <Minimap snapshot={snapshot} />
        </CollapsibleSection>

        <CollapsibleSection title="Filter by extension">
          <ExtensionFilter snapshot={snapshot} />
        </CollapsibleSection>

        <CollapsibleSection title="Districts" defaultOpen={false}>
          <DistrictLegend snapshot={snapshot} />
        </CollapsibleSection>

        <CollapsibleSection title="File tree">
          <FileTree snapshot={snapshot} />
        </CollapsibleSection>

        <div className="border-t border-white/[0.06] pt-2">
          <p className="text-[8px] font-mono text-white/20 uppercase tracking-wider mb-1.5">Controls</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] font-mono text-white/35">
            <span className="text-white/15">Click</span><span>Select</span>
            <span className="text-white/15">L-Drag</span><span>Pan</span>
            <span className="text-white/15">R-Drag</span><span>Orbit</span>
            <span className="text-white/15">Scroll</span><span>Zoom</span>
            <span className="text-white/15">WASD</span><span>Pan</span>
            <span className="text-white/15">R</span><span>Reset cam</span>
            <span className="text-white/15">1-5</span><span>Viz mode</span>
            <span className="text-white/15">B</span><span>Labels</span>
            <span className="text-white/15">Tab</span><span>Next file</span>
            <span className="text-white/15">/</span><span>Search</span>
            <span className="text-white/15">L</span><span>Panel</span>
            <span className="text-white/15">?</span><span>All shortcuts</span>
          </div>
        </div>
      </div>
    </div>
  )
}
