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
              <div className="h-10 w-10 rounded-2xl bg-zinc-800 animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-28 rounded-lg bg-zinc-800 animate-pulse" />
                <div className="h-3 w-36 rounded-lg bg-zinc-800/50 animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-28 rounded-lg bg-zinc-800 animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4">
                <div className="h-3 w-20 rounded-lg bg-zinc-800/50 animate-pulse mb-3" />
                <div className="h-6 w-14 rounded-lg bg-zinc-800 animate-pulse" />
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
    queryFn: () => getProjectList(),
  })

  const completedCount = projects.filter((p: { status: string }) => p.status === "COMPLETED").length
  const totalFiles = projects.reduce((sum: number, p: { fileCount?: number }) => sum + (p.fileCount ?? 0), 0)
  const totalLines = projects.reduce((sum: number, p: { lineCount?: number }) => sum + (p.lineCount ?? 0), 0)

  function openNewCityDialog() {
    setActiveTab("projects")
    setShowNewDialog(true)
  }

  const stats = [
    { icon: BarChart3, label: "Projects", value: projects.length, desc: "repositories analyzed" },
    { icon: FolderGit2, label: "Completed", value: completedCount, desc: "builds completed" },
    { icon: Activity, label: "Total Files", value: totalFiles, desc: "files indexed" },
    { icon: Zap, label: "Total Lines", value: totalLines, desc: "lines of code" },
  ]

  return (
    <div className="pb-8 sm:pb-10">
      {/* Page header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_0_20px_rgba(255,61,61,0.25)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground font-[family-name:var(--font-sora)]">Dashboard</h1>
                <p className="text-xs text-muted-foreground font-mono tracking-wide uppercase">Command Center</p>
              </div>
            </div>
            <Button
              onClick={openNewCityDialog}
              size="sm"
              className="gap-1.5 bg-primary text-white hover:bg-primary/90 font-mono text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New City
            </Button>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm p-4 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80 group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-3.5 w-3.5 text-primary transition-transform group-hover:scale-110" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  <NumberTicker value={stat.value} />
                </p>
                <p className="font-mono text-[10px] text-muted-foreground/60 mt-1 truncate">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50 backdrop-blur-sm p-3 sm:p-4">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1 sm:w-fit">
              <TabsTrigger
                value="projects"
                className="gap-2 font-mono text-xs tracking-wide uppercase px-4 rounded-lg text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                <FolderGit2 className="h-3.5 w-3.5" />
                My Projects
              </TabsTrigger>
              <TabsTrigger
                value="explore"
                className="gap-2 font-mono text-xs tracking-wide uppercase px-4 rounded-lg text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-none"
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
