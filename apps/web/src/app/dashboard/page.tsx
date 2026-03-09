"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ExploreTab } from "@/components/dashboard/explore-tab"
import { MyProjectsTab } from "@/components/dashboard/my-projects-tab"
import { NewAnalysisDialog } from "@/components/dashboard/new-analysis-dialog"
import { Building2, Compass, FolderGit2, Activity, Zap, BarChart3, Plus } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getProjectList } from "@/lib/client-cache"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@codecity/ui/components/tabs"
import { Button } from "@codecity/ui/components/button"
import { NumberTicker } from "@/components/ui/animated-text"

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="pb-8 sm:pb-10">
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-zinc-800 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
                <div className="h-3 w-32 rounded bg-zinc-800/50 animate-pulse" />
              </div>
            </div>
            <div className="h-8 w-24 rounded-md bg-zinc-800 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <div className="h-3 w-20 rounded bg-zinc-800/50 animate-pulse mb-2" />
                <div className="h-5 w-12 rounded bg-zinc-800 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabFromUrl = searchParams.get("tab") === "explore" ? "explore" : "projects"
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [showNewDialog, setShowNewDialog] = useState(false)

  useEffect(() => {
    setActiveTab(tabFromUrl)
  }, [tabFromUrl])

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    const url = tab === "explore" ? "/dashboard?tab=explore" : "/dashboard"
    router.replace(url, { scroll: false })
  }

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => {
      // Load from localStorage (no server needed)
      return getProjectList()
    },
  })

  const completedCount = projects.filter((p: { status: string }) => p.status === "COMPLETED").length
  const totalFiles = projects.reduce((sum: number, p: { fileCount?: number }) => sum + (p.fileCount ?? 0), 0)

  function openNewCityDialog() {
    setActiveTab("projects")
    setShowNewDialog(true)
  }

  return (
    <div className="pb-8 sm:pb-10">
      {/* Page header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Dashboard</h1>
                <p className="text-xs text-zinc-500 font-mono tracking-wide">COMMAND CENTER</p>
                <p className="text-[10px] text-zinc-600 font-mono tracking-[0.3em] mt-0.5">Analyze · Explore · Visualize</p>
              </div>
            </div>
            {/* New City button with pulse dot */}
            <div className="relative">
              <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-cyan-500 animate-pulse z-10" />
              <Button
                onClick={openNewCityDialog}
                size="sm"
                className="gap-1.5 bg-cyan-500 text-white hover:bg-cyan-400 font-mono text-xs shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <Plus className="h-3.5 w-3.5" />
                New City
              </Button>
            </div>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: Zap,       color: "text-cyan-500",     label: "Build Fast",   isText: true,  textValue: "Repo → City",  desc: "any repo in seconds",       numValue: 0 },
              { icon: BarChart3, color: "text-blue-400",     label: "Projects",     isText: false, textValue: "",             desc: "repositories analyzed",     numValue: projects.length },
              { icon: FolderGit2, color: "text-amber-400",   label: "Completed",    isText: false, textValue: "",             desc: "builds completed",          numValue: completedCount },
              { icon: Activity,  color: "text-emerald-400",  label: "Total Files",  isText: false, textValue: "",             desc: "files indexed",             numValue: totalFiles },
            ].map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80 group">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-3.5 w-3.5 ${stat.color} transition-transform group-hover:scale-110`} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">{stat.label}</span>
                </div>
                {stat.isText ? (
                  <p className="font-semibold text-sm text-white leading-snug">{stat.textValue}</p>
                ) : (
                  <p className="font-mono text-lg font-bold text-white tabular-nums">
                    <NumberTicker value={stat.numValue} />
                  </p>
                )}
                <p className="font-mono text-[9px] text-zinc-600 mt-1 truncate">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="p-3 sm:p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 sm:w-fit">
              <TabsTrigger
                value="projects"
                className="gap-2 font-mono text-xs tracking-wide uppercase px-4 rounded-md text-zinc-400 data-[state=active]:bg-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                <FolderGit2 className="h-3.5 w-3.5" />
                My Projects
              </TabsTrigger>
              <TabsTrigger
                value="explore"
                className="gap-2 font-mono text-xs tracking-wide uppercase px-4 rounded-md text-zinc-400 data-[state=active]:bg-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                <Compass className="h-3.5 w-3.5" />
                Explore
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="mt-5">
              <MyProjectsTab onCreateCity={openNewCityDialog} />
            </TabsContent>
            <TabsContent value="explore" className="mt-5">
              <ExploreTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <NewAnalysisDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  )
}
