"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProjectVisualization } from "@/components/city/project-visualization"
import { RotateCcw, ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react"
import { PageLoader } from "@/components/ui/loader"
import type { CitySnapshot } from "@/lib/types/city"
import { getProject, getProjectSnapshot, refreshAnalysis, type ProjectRecord } from "@/lib/tauri"

type RefreshState = {
  status: "idle" | "running" | "failed"
  progress: number
  message: string
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<PageLoader text="Loading city..." />}>
      <ProjectContent />
    </Suspense>
  )
}

function ProjectContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id") ?? ""

  const [snapshot, setSnapshot] = useState<CitySnapshot | null>(null)
  const [projectName, setProjectName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshState, setRefreshState] = useState<RefreshState>({
    status: "idle",
    progress: 0,
    message: "",
  })
  const refreshPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (refreshPollRef.current) clearInterval(refreshPollRef.current)
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        if (!id) {
          setError("Project id missing.")
          return
        }
        const projectData = await getProject(id)
        if (!projectData) {
          setError("Project not found. It may have been deleted — try analyzing again.")
          return
        }
        setProjectName(projectData.name)
        setRepoUrl(projectData.repo_url)

        if (projectData.status === "PROCESSING") {
          router.replace(`/analyze?id=${encodeURIComponent(id)}`)
          return
        }

        if (projectData.status === "FAILED") {
          setError(`Analysis failed: ${projectData.error ?? "Unknown error"}`)
          return
        }

        const data = await getProjectSnapshot(id)
        if (!data) {
          setError("Snapshot not found. Try re-analyzing the repository.")
          return
        }
        setSnapshot(data as unknown as CitySnapshot)
      } catch {
        setError("Failed to load project. Try again later.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  async function loadCompletedProject(project: ProjectRecord) {
    const data = await getProjectSnapshot(project.id)
    if (!data) {
      throw new Error("Refresh finished but no snapshot was saved.")
    }

    setProjectName(project.name)
    setRepoUrl(project.repo_url)
    setSnapshot(data as unknown as CitySnapshot)
    setRefreshState({ status: "idle", progress: 100, message: "" })
    router.replace(`/project?id=${encodeURIComponent(project.id)}`)
  }

  function startRefreshPolling(projectId: string) {
    if (refreshPollRef.current) clearInterval(refreshPollRef.current)

    refreshPollRef.current = setInterval(async () => {
      try {
        const project = await getProject(projectId)
        if (!project) {
          throw new Error("Refresh project disappeared.")
        }

        setRefreshState({
          status: "running",
          progress: Math.round(project.progress ?? 0),
          message: project.progress_message || "Refreshing city",
        })

        if (project.status === "COMPLETED") {
          if (refreshPollRef.current) clearInterval(refreshPollRef.current)
          refreshPollRef.current = null
          await loadCompletedProject(project)
          return
        }

        if (project.status === "FAILED") {
          if (refreshPollRef.current) clearInterval(refreshPollRef.current)
          refreshPollRef.current = null
          setRefreshState({
            status: "failed",
            progress: Math.round(project.progress ?? 0),
            message: project.error || "Refresh failed.",
          })
        }
      } catch (err) {
        if (refreshPollRef.current) clearInterval(refreshPollRef.current)
        refreshPollRef.current = null
        setRefreshState({
          status: "failed",
          progress: 0,
          message: err instanceof Error ? err.message : "Refresh failed.",
        })
      }
    }, 1200)
  }

  async function handleReanalyze() {
    if (!id) return
    setRefreshState({ status: "running", progress: 1, message: "Queued refresh" })
    try {
      const result = await refreshAnalysis(id)
      startRefreshPolling(result.projectId)
    } catch (err) {
      setRefreshState({
        status: "failed",
        progress: 0,
        message: err instanceof Error ? err.message : "Analysis error. Try again.",
      })
    }
  }

  if (loading) {
    return <PageLoader text="Loading city..." />
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full">
          <div className="rounded-lg border border-white/[0.08] bg-[#101012] p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-50 mb-2">Something went wrong</h2>
            <p className="text-sm text-zinc-500 mb-6 leading-relaxed">{error}</p>
            <div className="flex flex-col gap-2">
              {repoUrl && (
                <button
                  onClick={handleReanalyze}
                  disabled={refreshState.status === "running"}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshState.status === "running" ? "animate-spin" : ""}`} />
                  {refreshState.status === "running" ? "Starting..." : "Re-analyze"}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => router.back()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-white/[0.12] hover:text-zinc-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-zinc-400 transition-colors hover:border-white/[0.12] hover:text-zinc-200"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-zinc-500 mb-3">No visualization data available.</p>
          <button
            onClick={handleReanalyze}
            disabled={refreshState.status === "running"}
            className="mx-auto flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshState.status === "running" ? "animate-spin" : ""}`} />
            {refreshState.status === "running" ? "Starting..." : "Re-analyze"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <ProjectVisualization
        snapshot={snapshot}
        projectName={projectName}
        repoUrl={repoUrl}
        navbarActions={
          <ProjectRefreshControl
            state={refreshState}
            disabled={!repoUrl}
            onRefresh={handleReanalyze}
          />
        }
      />
    </div>
  )
}

function ProjectRefreshControl({
  state,
  disabled,
  onRefresh,
}: {
  state: RefreshState
  disabled: boolean
  onRefresh: () => void
}) {
  const isRunning = state.status === "running"
  const isFailed = state.status === "failed"

  return (
    <div className="flex min-w-0 items-center gap-2">
      {isRunning && (
        <div className="hidden min-w-[150px] max-w-[220px] items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1 sm:flex">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-medium text-white/55">{state.message || "Refreshing city"}</span>
            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <span
                className="block h-full rounded-full bg-primary/80 transition-[width] duration-300"
                style={{ width: `${Math.max(4, Math.min(100, state.progress))}%` }}
              />
            </span>
          </span>
          <span className="font-mono text-[10px] tabular-nums text-white/45">{Math.round(state.progress)}%</span>
        </div>
      )}
      {isFailed && (
        <span className="hidden max-w-[240px] truncate rounded-md border border-primary/25 bg-primary/[0.07] px-2 py-1 text-[10px] font-medium text-primary/90 sm:block">
          {state.message || "Refresh failed"}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={disabled || isRunning}
        title={isFailed ? state.message || "Refresh failed" : "Refresh analysis"}
        aria-label={isFailed ? state.message || "Refresh failed" : "Refresh analysis"}
        className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors disabled:pointer-events-none disabled:opacity-55 ${
          isFailed
            ? "border-primary/35 bg-primary/[0.08] text-primary/90 hover:bg-primary/[0.12]"
            : "border-white/[0.08] bg-white/[0.03] text-white/55 hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-white/85"
        }`}
      >
        <RefreshCw className={`size-3.5 ${isRunning ? "animate-spin" : ""}`} />
      </button>
    </div>
  )
}
