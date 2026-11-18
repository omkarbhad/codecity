"use client"

import { Suspense } from "react"
import { GitHubReposTab } from "@/components/dashboard/github-repos-tab"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { GithubIcon } from "@/components/ui/icons"
import { AppIcon } from "@/components/ui/app-icon"
import {
  SidebarInset,
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
        <ReposHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-(--border-pixel) bg-(--bg-raised) p-4 rounded-md">
                <div className="mb-3 h-4 w-3/4 animate-pulse bg-(--border-light)" />
                <div className="h-3 w-1/2 animate-pulse bg-(--border-light)" />
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
        <ReposHeader />

        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
          <GitHubReposTab />
        </div>
      </SidebarInset>
    </>
  )
}

/** Same header as the dashboard (src/app/dashboard/page.tsx) so both sidebar pages match. */
function ReposHeader() {
  return (
    <header data-tauri-drag-region className="flex shrink-0 items-center px-5 pt-5">
      <h1 className="text-[20px] font-medium tracking-[-0.015em] text-(--cream)">GitHub repos</h1>
    </header>
  )
}
