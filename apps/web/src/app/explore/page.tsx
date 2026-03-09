"use client"

import { Compass } from "lucide-react"
import { ExploreTab } from "@/components/dashboard/explore-tab"

export default function ExplorePage() {
  return (
    <div className="min-h-screen bg-background pb-8 sm:pb-10">
      <div className="border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#fafafa]">Explore</h1>
              <p className="text-xs text-[#71717a]">
                Community Cities
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10 py-6">
        <ExploreTab />
      </div>
    </div>
  )
}
