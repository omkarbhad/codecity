"use client"

import { useState, Suspense } from "react"
import { useParams } from "next/navigation"
import { MyProjectsTab } from "@/components/dashboard/my-projects-tab"
import { NewAnalysisDialog } from "@/components/dashboard/new-analysis-dialog"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { FolderGit2, Activity, Zap, BarChart3, Plus } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@codecity/ui/components/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@codecity/ui/components/breadcrumb"
import { Separator } from "@codecity/ui/components/separator"
import {
  SidebarInset,
  SidebarTrigger,
} from "@codecity/ui/components/sidebar"
import { NumberTicker } from "@/components/ui/animated-text"

export default function UserDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/[0.06] px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="h-4 w-32 rounded bg-white/[0.04] animate-pulse" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="h-3 w-20 rounded bg-white/[0.04] animate-pulse mb-3" />
                <div className="h-7 w-16 rounded bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] h-40 animate-pulse" />
            ))}
          </div>
        </div>
      </SidebarInset>
    </>
  )
}

function DashboardContent() {
  const params = useParams()
  const username = params.username as string
  const [showNewDialog, setShowNewDialog] = useState(false)

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) return []
      return res.json()
    },
  })

  const completedCount = projects.filter((p: { status: string }) => p.status === "COMPLETED").length
  const totalFiles = projects.reduce((sum: number, p: { fileCount?: number }) => sum + (p.fileCount ?? 0), 0)
  const totalLines = projects.reduce((sum: number, p: { lineCount?: number }) => sum + (p.lineCount ?? 0), 0)

  const stats = [
    { icon: BarChart3, label: "Projects", value: projects.length, color: "text-blue-400" },
    { icon: FolderGit2, label: "Completed", value: completedCount, color: "text-emerald-400" },
    { icon: Activity, label: "Files", value: totalFiles, color: "text-amber-400" },
    { icon: Zap, label: "Lines", value: totalLines, color: "text-primary" },
  ]

  const displayName = username.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <>
      <AppSidebar onNewCity={() => setShowNewDialog(true)} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{displayName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewDialog(true)}
            className="h-8 gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            New City
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          {/* Welcome + Stats */}
          <div>
            <h1 className="text-lg font-semibold text-zinc-50 mb-1">
              Welcome back, {displayName}
            </h1>
            <p className="text-sm text-zinc-500 mb-5">
              {projects.length === 0
                ? "Create your first city to get started."
                : `You have ${projects.length} project${projects.length !== 1 ? "s" : ""} analyzed.`}
            </p>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="group rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-zinc-500 font-medium">{stat.label}</span>
                    <stat.icon className={`h-4 w-4 ${stat.color} opacity-60`} />
                  </div>
                  <p className="text-2xl font-bold text-zinc-50 tabular-nums tracking-tight">
                    <NumberTicker value={stat.value} />
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div>
            <MyProjectsTab onCreateCity={() => setShowNewDialog(true)} />
          </div>
        </div>
      </SidebarInset>

      <NewAnalysisDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </>
  )
}
