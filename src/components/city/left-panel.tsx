"use client"

import { useMemo } from "react"
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

function extractRepoName(repoUrl: string): string {
  if (!repoUrl) return "src"
  const cleaned = repoUrl.replace(/\.git$/, "").replace(/\/$/, "").replace(/\\/g, "/")
  const parts = cleaned.split("/").filter(Boolean)
  return parts[parts.length - 1] || "src"
}

export function LeftPanel({ snapshot, collapsed }: LeftPanelProps) {
  const toggleLeftPanel = useCityStore((s) => s.toggleLeftPanel)
  const repoUrl = useCityStore((s) => s.repoUrl)
  const repoName = useMemo(() => extractRepoName(repoUrl), [repoUrl])
  const fileCount = snapshot.files.length
  const districtCount = snapshot.districts.length

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
        <div className="pixel-shadow flex h-full flex-col overflow-hidden border-2 border-(--border-light) bg-(--bg-deep)">
          {/* Terminal header */}
          <div className="shrink-0 border-b-2 border-(--border-pixel) bg-(--bg-card) px-3 py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex shrink-0 items-center gap-1.5">
                <span className="size-2.5 bg-(--sev-high)" />
                <span className="size-2.5 bg-(--sev-med)" />
                <span className="size-2.5 bg-(--lime)" />
              </div>
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-(--cream-dark)">
                tree <span className="text-(--dim)">~</span> <span className="text-primary">{repoName}/</span>
              </span>
            </div>
          </div>

          {/* File tree — fills all remaining space, owns the scroll */}
          <div className="flex-1 overflow-y-auto overscroll-contain scroll-thin min-h-0">
            <FileTree snapshot={snapshot} />
          </div>

          {/* Bottom widgets — capped height */}
          <div className="shrink-0 border-t-2 border-dashed border-(--border-pixel) p-2 space-y-2 max-h-[280px] overflow-y-auto overscroll-contain scroll-thin">
            <ExtensionFilter snapshot={snapshot} />
            <DistrictLegend snapshot={snapshot} />
            <Minimap snapshot={snapshot} />
          </div>

          {/* Terminal footer */}
          <div className="shrink-0 border-t-2 border-(--border-pixel) bg-(--bg-card) px-3 py-1.5">
            <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">
              <span>
                <span className="text-(--dim)">{">"}</span>{" "}
                <span className="text-(--cream-dark) tabular-nums">{fileCount}</span> files
              </span>
              <span className="text-(--dim)">
                <span className="text-(--cream-dark) tabular-nums">{districtCount}</span> districts
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
