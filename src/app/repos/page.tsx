"use client"

import { Suspense } from "react"
import { GitHubReposTab } from "@/components/dashboard/github-repos-tab"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Separator } from "@codecity/ui/components/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@codecity/ui/components/sidebar"

export default function ReposPage() {
  return (
    <Suspense fallback={<ReposSkeleton />}>
      <ReposContent />
    </Suspense>
  )
}

function ReposSkeleton() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-(--border-pixel) bg-(--bg-deep)/90 px-4 backdrop-blur-sm">
          <div className="h-4 w-4 animate-pulse rounded-none bg-(--bg-card)" />
          <div className="h-3 w-24 animate-pulse rounded-none bg-(--bg-raised)" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-(--border-pixel) bg-(--bg-raised) p-4">
                <div className="mb-3 h-4 w-3/4 animate-pulse rounded-lg bg-(--bg-raised)" />
                <div className="h-3 w-1/2 animate-pulse rounded-lg bg-(--bg-raised)" />
              </div>
            ))}
          </div>
        </div>
      </SidebarInset>
    </>
  )
}

function ReposContent() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-(--border-pixel) bg-(--bg-deep)/90 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1 text-(--muted) hover:text-(--cream-dark)" />
          <Separator orientation="vertical" className="mx-1 h-4 bg-(--bg-card)" />
          <span className="text-[11px] font-mono text-(--muted)">github</span>
          <span className="text-(--muted)">/</span>
          <span className="text-[11px] font-mono text-(--cream-dark)">repos</span>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-5 sm:p-6">
          <GitHubReposTab />
        </div>
      </SidebarInset>
    </>
  )
}
