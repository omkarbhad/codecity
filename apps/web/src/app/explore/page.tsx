"use client"

import { Suspense } from "react"
import { ExploreTab } from "@/components/dashboard/explore-tab"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@codecity/ui/components/breadcrumb"
import { Separator } from "@codecity/ui/components/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@codecity/ui/components/sidebar"

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExploreSkeleton />}>
      <ExploreContent />
    </Suspense>
  )
}

function ExploreSkeleton() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="h-4 w-32 rounded bg-white/[0.04] animate-pulse" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="h-4 w-3/4 rounded-lg bg-white/[0.04] animate-pulse mb-3" />
                <div className="h-3 w-1/2 rounded-lg bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </SidebarInset>
    </>
  )
}

function ExploreContent() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Explore</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          <ExploreTab />
        </div>
      </SidebarInset>
    </>
  )
}
