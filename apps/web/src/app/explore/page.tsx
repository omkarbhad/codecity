"use client"

import { Compass } from "lucide-react"
import { ExploreTab } from "@/components/dashboard/explore-tab"

export default function ExplorePage() {
  return (
    <div className="pb-8 sm:pb-10">
      <div className="border-b border-border/30 bg-card/45">
        <div className="content-container py-5 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Explore</h1>
              <p className="text-xs text-muted-foreground font-mono tracking-wide">COMMUNITY CITIES</p>
            </div>
          </div>
        </div>
      </div>
      <div className="content-container py-6">
        <ExploreTab />
      </div>
    </div>
  )
}
