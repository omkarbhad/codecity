"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { CitySnapshot } from "@/lib/types/city"
import { CityStoreProvider } from "./use-city-store"
import { ModeToolbar } from "./mode-toolbar"
import { SearchBar } from "./search-bar"
import { FileTree } from "./file-tree"
import { FileDetails } from "./file-details"
import { Minimap } from "./minimap"
import { StatsBar } from "./stats-bar"
import { DistrictLegend } from "./district-legend"

const CitySceneCanvas = dynamic(
  () => import("./city-scene").then((mod) => ({ default: mod.CitySceneCanvas })),
  { ssr: false }
)

interface Props {
  snapshot: CitySnapshot
  projectName: string
}

export function ProjectVisualization({ snapshot, projectName }: Props) {
  return (
    <CityStoreProvider>
      <div className="flex h-screen flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-border/30 bg-card/60 backdrop-blur-xl px-4 py-2">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="font-mono text-sm text-foreground">
              {projectName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ModeToolbar />
            <SearchBar />
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel */}
          <div className="w-64 shrink-0 overflow-y-auto border-r border-border/30 bg-card/20 backdrop-blur-xl">
            <Minimap snapshot={snapshot} />
            <DistrictLegend snapshot={snapshot} />
            <FileTree snapshot={snapshot} />
          </div>

          {/* 3D Scene */}
          <div className="flex-1 relative">
            <CitySceneCanvas snapshot={snapshot} />
          </div>

          {/* Right panel (details) */}
          <FileDetails snapshot={snapshot} />
        </div>

        {/* Bottom stats */}
        <StatsBar stats={snapshot.stats} />
      </div>
    </CityStoreProvider>
  )
}
