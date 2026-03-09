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
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="pb-8 sm:pb-10">
      <div className="border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10 py-5 sm:py-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/[0.02] animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-28 rounded-lg bg-white/[0.04] animate-pulse" />
                <div className="h-3 w-36 rounded-lg bg-white/[0.02] animate-pulse" />
              </div>
            </div>
            <div className="h-9 w-28 rounded-lg bg-white/[0.04] animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="h-3 w-20 rounded-lg bg-white/[0.04] animate-pulse mb-3" />
                <div className="h-6 w-14 rounded-lg bg-white/[0.04] animate-pulse" />
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
      <div className="border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10 py-5 sm:py-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#fafafa]">Dashboard</h1>
                <p className="text-xs text-[#71717a]">Command Center</p>
              </div>
            </div>
            <Button
              onClick={openNewCityDialog}
              size="sm"
              className="gap-1.5 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors duration-200"
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
                className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 hover:border-primary/25 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-3.5 w-3.5 text-[#71717a]" />
                  <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-medium">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-[#fafafa] tabular-nums">
                  <NumberTicker value={stat.value} />
                </p>
                <p className="text-[10px] text-[#52525b] mt-1 truncate">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-10 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-white/[0.02] border border-white/[0.06] p-1 sm:w-fit">
            <TabsTrigger
              value="projects"
              className="gap-2 text-xs font-medium tracking-wide px-4 rounded-lg text-[#71717a] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-none transition-colors duration-200"
            >
              <FolderGit2 className="h-3.5 w-3.5" />
              My Projects
            </TabsTrigger>
            <TabsTrigger
              value="explore"
              className="gap-2 text-xs font-medium tracking-wide px-4 rounded-lg text-[#71717a] data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-none transition-colors duration-200"
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
        </Tabs>
      </div>

      <NewAnalysisDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  )
}
