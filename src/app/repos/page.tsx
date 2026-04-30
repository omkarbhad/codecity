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
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.05] bg-[#07070c]/90 px-4 backdrop-blur-sm">
          <div className="h-4 w-4 animate-pulse rounded bg-white/[0.05]" />
          <div className="h-3 w-24 animate-pulse rounded bg-white/[0.04]" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="mb-3 h-4 w-3/4 animate-pulse rounded-lg bg-white/[0.04]" />
                <div className="h-3 w-1/2 animate-pulse rounded-lg bg-white/[0.04]" />
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
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.05] bg-[#07070c]/90 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1 text-zinc-600 hover:text-zinc-300" />
          <Separator orientation="vertical" className="mx-1 h-4 bg-white/[0.06]" />
          <span className="text-[11px] font-mono text-zinc-600">github</span>
          <span className="text-zinc-700">/</span>
          <span className="text-[11px] font-mono text-zinc-400">repos</span>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-5 sm:p-6">
          <GitHubReposTab />
        </div>
      </SidebarInset>
    </>
  )
}
