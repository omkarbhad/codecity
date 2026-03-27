"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { ExploreTab } from "@/components/dashboard/explore-tab"
import { MyProjectsTab } from "@/components/dashboard/my-projects-tab"
import { NewAnalysisDialog } from "@/components/dashboard/new-analysis-dialog"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { Building2, Compass, FolderGit2, Activity, Zap, BarChart3, Plus } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@codecity/ui/components/tabs"
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

export default function DashboardPage() {
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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="h-4 w-32 rounded bg-white/[0.04] animate-pulse" />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <div className="h-3 w-20 rounded-lg bg-white/[0.04] animate-pulse mb-3" />
                <div className="h-6 w-14 rounded-lg bg-white/[0.04] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </SidebarInset>
    </>
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
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) return []
      return res.json()
    },
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

  const breadcrumbLabel = activeTab === "explore" ? "Explore" : "My Projects"

  return (
    <>
      <AppSidebar onNewCity={openNewCityDialog} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>{breadcrumbLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          {/* Stat cards */}
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

          {/* Tabs content */}
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
      </SidebarInset>

      <NewAnalysisDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </>
  )
}
