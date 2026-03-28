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
  SidebarInset,
  SidebarTrigger,
} from "@codecity/ui/components/sidebar"
import { Separator } from "@codecity/ui/components/separator"

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
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.05] px-4">
          <div className="h-4 w-4 rounded bg-white/[0.05] animate-pulse" />
          <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
        </header>
        <div className="flex flex-1 flex-col gap-6 p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-[#0a0a0f] border border-white/[0.05] p-4 h-20 animate-pulse" />
            ))}
          </div>
        </div>
      </SidebarInset>
    </>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  color: string
  mono?: boolean
}) {
  const display = value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}k`
      : value.toString()

  return (
    <div className="group rounded-xl bg-[#0a0a0f] border border-white/[0.06] p-4 hover:border-white/[0.10] transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg bg-white/[0.03] ${color} opacity-60 group-hover:opacity-100 transition-opacity`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <p className={`text-2xl font-bold text-zinc-50 tracking-tight ${mono ? "font-mono" : ""}`}>
        {display}
      </p>
    </div>
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
  const processingCount = projects.filter((p: { status: string }) => p.status === "PROCESSING").length
  const totalFiles = projects.reduce((sum: number, p: { fileCount?: number }) => sum + (p.fileCount ?? 0), 0)
  const totalLines = projects.reduce((sum: number, p: { lineCount?: number }) => sum + (p.lineCount ?? 0), 0)

  const displayName = username.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  })()

  return (
    <>
      <AppSidebar onNewCity={() => setShowNewDialog(true)} />
      <SidebarInset>
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#07070c]/90 backdrop-blur-sm px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-zinc-600 hover:text-zinc-300" />
            <Separator orientation="vertical" className="h-4 bg-white/[0.06] mx-1" />
            <span className="text-[11px] font-mono text-zinc-600">dashboard</span>
            <span className="text-zinc-700">/</span>
            <span className="text-[11px] font-mono text-zinc-400">{username}</span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewDialog(true)}
            className="h-7 gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-medium px-3 rounded-lg"
          >
            <Plus className="h-3 w-3" />
            New City
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-8 p-5 sm:p-6">
          {/* Welcome */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-zinc-50 tracking-tight">
                {greeting}, {displayName.split(" ")[0]}
              </h1>
              <p className="text-sm text-zinc-600 mt-0.5">
                {projects.length === 0
                  ? "No cities yet. Analyze a repo to get started."
                  : processingCount > 0
                    ? `${processingCount} analysis running · ${completedCount} completed`
                    : `${completedCount} of ${projects.length} repos analyzed`}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={BarChart3} label="Total" value={projects.length} color="text-blue-400" />
            <StatCard icon={FolderGit2} label="Completed" value={completedCount} color="text-emerald-400" />
            <StatCard icon={Activity} label="Files" value={totalFiles} color="text-amber-400" mono />
            <StatCard icon={Zap} label="Lines" value={totalLines} color="text-primary" mono />
          </div>

          {/* Projects */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-medium text-zinc-600 uppercase tracking-widest">
                Cities
              </h2>
              <span className="text-[11px] font-mono text-zinc-700">
                {projects.length} total
              </span>
            </div>
            <MyProjectsTab onCreateCity={() => setShowNewDialog(true)} />
          </div>
        </div>
      </SidebarInset>

      <NewAnalysisDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </>
  )
}
