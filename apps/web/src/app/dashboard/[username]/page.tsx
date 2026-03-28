"use client"

import { useState, useMemo, Suspense, type ComponentType } from "react"
import { useParams } from "next/navigation"
import { MyProjectsTab } from "@/components/dashboard/my-projects-tab"
import { NewAnalysisDialog } from "@/components/dashboard/new-analysis-dialog"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { FolderGit2, Activity, Zap, BarChart3, Plus, ArrowUpRight } from "lucide-react"
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
          <SidebarTrigger className="-ml-1 text-zinc-600" />
          <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse" />
        </header>
        <div className="flex flex-1 flex-col gap-6 p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </SidebarInset>
    </>
  )
}

const ACCENT_GLOW: Record<string, string> = {
  blue: "rgba(59,130,246,0.06)",
  emerald: "rgba(16,185,129,0.06)",
  amber: "rgba(245,158,11,0.06)",
  primary: "rgba(255,61,61,0.06)",
}

interface StatCardProps {
  icon: ComponentType<{ className?: string }>
  label: string
  value: number
  accent: "blue" | "emerald" | "amber" | "primary"
  mono?: boolean
  trend?: string
}

function StatCard({ icon: Icon, label, value, accent, mono = false, trend }: StatCardProps) {
  const display = value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}k`
      : value.toString()

  const glowColor = ACCENT_GLOW[accent] ?? ACCENT_GLOW.primary
  const accentClass = {
    blue: "text-blue-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    primary: "text-primary",
  }[accent]

  return (
    <div className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 hover:border-white/[0.14] hover:bg-white/[0.045] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Subtle top glow on hover */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${glowColor}, transparent 80%)` }}
      />
      <div className="flex items-start justify-between mb-3">
        <div className={`flex items-center justify-center size-8 rounded-xl transition-all duration-200 bg-white/[0.05] group-hover:bg-white/[0.08] ${accentClass}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        {trend && (
          <span className="text-[10px] font-mono text-zinc-600">{trend}</span>
        )}
      </div>
      <p className={`text-[22px] font-bold text-zinc-100 tracking-tight leading-none mb-1 ${mono ? "font-mono" : ""}`}>
        {display}
      </p>
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
  )
}

interface SessionUser {
  id: string
  name: string | null
  email: string
  role: "USER" | "ADMIN"
  githubUsername: string | null
}

interface Project {
  id: string
  name: string
  status: "COMPLETED" | "PROCESSING" | "FAILED"
  visibility: "PUBLIC" | "PRIVATE"
  fileCount?: number
  lineCount?: number
}

function DashboardContent() {
  const params = useParams()
  const username = params.username as string
  const [showNewDialog, setShowNewDialog] = useState(false)

  const { data: me } = useQuery<SessionUser>({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me")
      if (!res.ok) throw new Error("Unauthorized")
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects")
      if (!res.ok) return []
      return res.json()
    },
  })

  const completedCount = projects.filter((p) => p.status === "COMPLETED").length
  const processingCount = projects.filter((p) => p.status === "PROCESSING").length
  const totalFiles = projects.reduce((sum, p) => sum + (p.fileCount ?? 0), 0)
  const totalLines = projects.reduce((sum, p) => sum + (p.lineCount ?? 0), 0)

  // Greeting uses display name → GitHub username → URL slug (last resort)
  // Breadcrumb always shows githubUsername for URL record purposes
  const greetingName = me?.name
    ?? me?.githubUsername
    ?? username.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  const firstName = greetingName.split(" ")[0]

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 17) return "Good afternoon"
    return "Good evening"
  }, [])

  const statusLine = projects.length === 0
    ? "No cities yet — analyze a repo to get started."
    : processingCount > 0
      ? `${processingCount} analysis running · ${completedCount} completed`
      : `${completedCount} of ${projects.length} repos analyzed`

  return (
    <>
      <AppSidebar
        onNewCity={() => setShowNewDialog(true)}
        user={me ? { name: me.name ?? me.githubUsername, image: null, email: me.email } : null}
      />
      <SidebarInset>
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#07070c]/90 backdrop-blur-md px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 text-zinc-600 hover:text-zinc-300 transition-colors" />
            <Separator orientation="vertical" className="h-4 bg-white/[0.06] mx-1" />
            <nav className="flex items-center gap-1 text-[11px] font-mono">
              <span className="text-zinc-700">dashboard</span>
              <span className="text-zinc-800">/</span>
              <span className="text-zinc-500">{me?.githubUsername ?? username}</span>
            </nav>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewDialog(true)}
            className="h-7 gap-1.5 bg-primary hover:bg-primary/85 text-white text-[11px] font-semibold px-3 rounded-lg shadow-[0_0_16px_rgba(255,61,61,0.2)] transition-all"
          >
            <Plus className="h-3 w-3" />
            New City
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-7 p-5 sm:p-6">
          {/* Welcome */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[19px] font-semibold text-zinc-50 tracking-tight leading-snug">
                {greeting}, {firstName}
              </h1>
              <p className="text-[12px] text-zinc-600 mt-0.5">{statusLine}</p>
            </div>
            {projects.length > 0 && (
              <button
                onClick={() => setShowNewDialog(true)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 mt-0.5"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                New
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={BarChart3} label="Total" value={projects.length} accent="blue" />
            <StatCard icon={FolderGit2} label="Completed" value={completedCount} accent="emerald" />
            <StatCard icon={Activity} label="Files" value={totalFiles} accent="amber" mono />
            <StatCard icon={Zap} label="Lines" value={totalLines} accent="primary" mono />
          </div>

          {/* Projects section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest">
                Cities
              </h2>
              <span className="text-[10px] font-mono text-zinc-700">{projects.length} total</span>
            </div>
            <MyProjectsTab onCreateCity={() => setShowNewDialog(true)} />
          </div>
        </div>
      </SidebarInset>

      <NewAnalysisDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </>
  )
}
