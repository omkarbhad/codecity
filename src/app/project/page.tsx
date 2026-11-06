"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ProjectVisualization } from "@/components/city/project-visualization"
import { RotateCcw, ArrowLeft, AlertTriangle } from "lucide-react"
import { ArrowReloadHorizontalIcon } from "@hugeicons/core-free-icons"
import { PageLoader } from "@/components/ui/loader"
import type { CitySnapshot } from "@/lib/types/city"
import { getProject, getProjectSnapshot, refreshAnalysis, type ProjectRecord } from "@/lib/tauri"
import { HugeIcon } from "@/components/ui/huge-icon"

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
        <div className="w-full max-w-sm">
          <div className="pixel-shadow border-2 border-(--border-light) bg-(--bg-card) p-6 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)]">
              <AlertTriangle className="size-5 text-(--sev-high)" />
            </div>
            <h2 className="mb-2 font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-(--cream)">Something went wrong</h2>
            <p className="mb-6 text-[12px] leading-[1.5] text-(--cream-dark)">{error}</p>
            <div className="flex flex-col gap-2">
              {repoUrl && (
                <button
                  onClick={handleReanalyze}
                  disabled={refreshState.status === "running"}
                  className="flex h-9 w-full items-center justify-center gap-2 pixel-shadow-accent btn-press border-2 border-(--bg) bg-primary px-4 font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.05em] text-primary-foreground disabled:opacity-50"
                >
                  <HugeIcon icon={ArrowReloadHorizontalIcon} className={`size-3.5 ${refreshState.status === "running" ? "animate-spin" : ""}`} />
                  {refreshState.status === "running" ? "Starting..." : "Re-analyze"}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => router.back()}
                  className="flex h-9 flex-1 items-center justify-center gap-2 pixel-shadow-sm btn-press border-2 border-(--border-pixel) bg-(--bg-raised) px-3 font-mono text-[11px] uppercase leading-none tracking-[0.05em] text-(--cream-dark) transition-colors hover:border-(--border-light) hover:text-(--cream)"
                >
                  <ArrowLeft className="size-3.5" />
                  Back
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex h-9 flex-1 items-center justify-center gap-2 pixel-shadow-sm btn-press border-2 border-(--border-pixel) bg-(--bg-raised) px-3 font-mono text-[11px] uppercase leading-none tracking-[0.05em] text-(--cream-dark) transition-colors hover:border-(--border-light) hover:text-(--cream)"
                >
                  <RotateCcw className="size-3.5" />
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
      <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <p className="mb-3 text-[12px] leading-[1.5] text-(--cream-dark)">No visualization data available.</p>
          <button
            onClick={handleReanalyze}
            disabled={refreshState.status === "running"}
            className="mx-auto flex h-9 items-center gap-2 pixel-shadow-accent btn-press border-2 border-(--bg) bg-primary px-4 font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.05em] text-primary-foreground disabled:opacity-50"
          >
            <HugeIcon icon={ArrowReloadHorizontalIcon} className={`size-3.5 ${refreshState.status === "running" ? "animate-spin" : ""}`} />
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
        projectId={id}
        projectRoot={repoUrl}
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
        <div className="hidden h-7 min-w-[160px] max-w-[224px] items-center gap-2 border-2 border-(--border-pixel) bg-(--bg-raised) px-2 sm:flex">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[10px] font-medium leading-none text-(--cream-dark)">{state.message || "Refreshing city"}</span>
            <span className="mt-1 block h-1 overflow-hidden bg-(--bg-deep)">
              <span
                className="block h-full bg-primary transition-[width] duration-300"
                style={{ width: `${Math.max(4, Math.min(100, state.progress))}%` }}
              />
            </span>
          </span>
          <span className="font-mono text-[10px] leading-none text-(--cream-dark) tabular-nums">{Math.round(state.progress)}%</span>
        </div>
      )}
      {isFailed && (
        <span className="hidden h-7 max-w-[240px] items-center truncate border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] px-2 text-[11px] font-medium leading-none text-(--sev-high) sm:inline-flex">
          {state.message || "Refresh failed"}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={disabled || isRunning}
        title={isFailed ? state.message || "Refresh failed" : "Refresh analysis"}
        aria-label={isFailed ? state.message || "Refresh failed" : "Refresh analysis"}
        className={`flex size-7 shrink-0 items-center justify-center border-2 transition-colors disabled:pointer-events-none disabled:opacity-50 ${
          isFailed
            ? "border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] text-(--sev-high) hover:bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)]"
            : "border-(--border-pixel) bg-(--bg-raised) text-(--cream-dark) hover:border-(--border-light) hover:bg-(--bg-card) hover:text-(--cream)"
        }`}
      >
        <HugeIcon icon={ArrowReloadHorizontalIcon} className={`size-3.5 ${isRunning ? "animate-spin" : ""}`} />
      </button>
    </div>
  )
}
