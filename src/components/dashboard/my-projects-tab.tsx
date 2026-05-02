"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  X,
  Check,
  Loader2,
} from "lucide-react"
import {
  Activity01Icon,
  Add01Icon,
  Building03Icon,
  CodeIcon,
  DocumentCodeIcon,
  GitBranchIcon,
  GridViewIcon,
  LayoutTable01Icon,
  SquareIcon,
  WorkflowSquare01Icon,
} from "@hugeicons/core-free-icons"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@codecity/ui/components/button"
import { IconButton } from "@codecity/ui/components/icon-button"
import { MiniCityPreview } from "@/components/city/mini-city-preview"
import type { CitySnapshot } from "@/lib/types/city"
import { getProjects, getProjectSnapshot, deleteProject as deleteProjectTauri, analyze, getProject, cancelProject } from "@/lib/tauri"
import { HugeIcon } from "@/components/ui/huge-icon"

interface Project {
  id: string
  name: string
  repoUrl: string
  status: string
  fileCount?: number
  lineCount?: number
  progress?: number
  progressStage?: string
  progressMessage?: string
  filesDiscovered?: number
  filesParsed?: number
  error?: string | null
  createdAt: string
}

function normalizeProjectRecord(record: Record<string, unknown>): Project {
  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? "Untitled"),
    repoUrl: String(record.repo_url ?? record.repoUrl ?? ""),
    status: String(record.status ?? "FAILED"),
    fileCount: Number(record.file_count ?? record.fileCount ?? 0),
    lineCount: Number(record.line_count ?? record.lineCount ?? 0),
    progress: Number(record.progress ?? 0),
    progressStage: String(record.progress_stage ?? record.progressStage ?? "queued"),
    progressMessage: String(record.progress_message ?? record.progressMessage ?? "Queued"),
    filesDiscovered: Number(record.files_discovered ?? record.filesDiscovered ?? 0),
    filesParsed: Number(record.files_parsed ?? record.filesParsed ?? 0),
    error: typeof record.error === "string" ? record.error : null,
    createdAt: (() => {
      const raw = record.created_at ?? record.createdAt
      if (typeof raw === "string" && raw.trim()) return raw
      if (typeof raw === "number" && Number.isFinite(raw)) return new Date(raw).toISOString()
      return new Date().toISOString()
    })(),
  }
}

function getProjectLabel(project: Project) {
  const source = project.repoUrl || project.name

  if (source.includes("github.com/")) {
    const repoPath = source.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "")
    const [owner, repo] = repoPath.split("/")
    return {
      owner: owner || "github",
      repo: repo || project.name,
      isExternal: true,
    }
  }

  if (source.includes("/") || source.includes("\\")) {
    const normalized = source.replace(/\\/g, "/").replace(/\/$/, "")
    const parts = normalized.split("/").filter(Boolean)
    return {
      owner: parts.slice(-2, -1)[0] ?? "local",
      repo: parts.at(-1) ?? project.name,
      isExternal: false,
    }
  }

  return {
    owner: "local",
    repo: project.name || source || "Untitled",
    isExternal: false,
  }
}

interface ProgressData {
  stage: string
  progress: number
  message: string
}

function useProjectProgress(projectId: string, enabled: boolean) {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) {
      setProgress(null)
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    async function fetchProgress() {
      try {
        const project = await getProject(projectId)
        if (project) {
          if (project.status === "COMPLETED") {
            setProgress({ stage: "complete", progress: 100, message: "Done" })
          } else if (project.status === "FAILED") {
            setProgress({ stage: "error", progress: 0, message: project.error ?? "Failed" })
          } else {
            setProgress({
              stage: project.progress_stage ?? "processing",
              progress: Math.max(0, Math.min(100, project.progress ?? 0)),
              message: project.progress_message ?? "Analyzing...",
            })
          }
        }
      } catch {
        // ignore
      }
    }

    fetchProgress()
    intervalRef.current = setInterval(fetchProgress, 5000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [projectId, enabled])

  return progress
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

function timeAgo(dateStr: string): string {
  const t = new Date(dateStr).getTime()
  if (!Number.isFinite(t)) return "—"
  const diff = Date.now() - t
  if (diff < 0) return "just now"
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(t).toLocaleDateString()
}

function DeleteButton({
  projectId,
  onDelete,
}: {
  projectId: string
  onDelete: (id: string) => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function openConfirm(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmOpen(true)
    timeoutRef.current = setTimeout(() => setConfirmOpen(false), 4000)
  }

  function cancel(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmOpen(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  function confirm(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setConfirmOpen(false)
    onDelete(projectId)
  }

  // Cleanup timeout on unmount
  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

  if (confirmOpen) {
    return (
      <div
        className="flex h-8 items-center gap-0.5 overflow-hidden rounded-md border border-white/[0.10] bg-white/[0.04]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="px-2 text-[11px] font-medium leading-none text-neutral-300">Remove?</span>
        <IconButton
          onClick={confirm}
          className="size-7 border-transparent bg-transparent text-rose-300 hover:border-rose-400/20 hover:bg-rose-400/[0.08] hover:text-rose-200"
          aria-label="Confirm remove"
        >
          <Check />
        </IconButton>
        <IconButton
          onClick={cancel}
          className="size-7 border-transparent bg-transparent text-neutral-400 hover:text-neutral-200"
          aria-label="Cancel delete"
        >
          <X />
        </IconButton>
      </div>
    )
  }

  return (
    <IconButton
      onClick={openConfirm}
      className="size-8 border-white/[0.07] bg-white/[0.02] text-neutral-500 hover:border-rose-400/25 hover:bg-rose-400/[0.06] hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label="Remove project"
    >
      <Trash2 />
    </IconButton>
  )
}

function useSnapshot(projectId: string, enabled: boolean) {
  const { data: snapshot = null, isLoading: loading } = useQuery<CitySnapshot | null>({
    queryKey: ["project-snapshot", projectId],
    enabled,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const data = await getProjectSnapshot(projectId)
      return data ? (data as unknown as CitySnapshot) : null
    },
  })

  return { snapshot, loading }
}

function ProjectCard({
  project,
  isQueued,
  onDelete,
  onCancel,
  onRetry,
  queryClient,
  view,
}: {
  project: Project
  isQueued: boolean
  onDelete: (id: string) => void
  onCancel: (id: string) => void
  onRetry: (project: Project) => void
  queryClient: ReturnType<typeof useQueryClient>
  view: "grid" | "list"
}) {
  const { snapshot, loading: snapshotLoading } = useSnapshot(
    project.id,
    project.status === "COMPLETED"
  )
  const isProcessing = project.status === "PROCESSING" || project.status === "PENDING"
  const isCompleted = project.status === "COMPLETED"
  const isFailed = project.status === "FAILED"
  const isActive = isProcessing && !isQueued

  const progress = useProjectProgress(project.id, isActive)

  useEffect(() => {
    if (progress?.stage === "complete" || progress?.stage === "error") {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    }
  }, [progress?.stage, queryClient])

  const { owner, repo, isExternal } = getProjectLabel(project)

  const currentProgress = isActive && progress ? Math.round(progress.progress) : 0
  const currentMessage = isActive && progress
    ? progress.message
    : isQueued
      ? "Queued — waiting for active job to finish"
      : null

  if (view === "list") {
    return (
      <div
        className={`grid min-h-11 grid-cols-[minmax(0,1.5fr)_96px_88px_88px_96px_140px] items-center gap-3 border-b border-white/[0.05] px-3 py-2 transition-colors hover:bg-white/[0.025]
          ${isActive ? "bg-primary/[0.025]" : ""}
          ${isQueued ? "opacity-70" : ""}
        `}
      >
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] leading-[1.4] text-neutral-500">{owner}/</p>
          <h3 className="truncate text-[13px] font-medium leading-[1.25] text-neutral-100">{repo}</h3>
        </div>
        <span className="font-mono text-[11px] leading-none text-neutral-400">
          {isCompleted ? "done" : isActive ? "analyzing" : isQueued ? "queued" : "failed"}
        </span>
        <span className="font-mono text-[11px] leading-none text-neutral-300 tabular-nums">{isCompleted ? formatNumber(project.fileCount ?? 0) : "—"}</span>
        <span className="font-mono text-[11px] leading-none text-neutral-300 tabular-nums">{isCompleted ? formatNumber(project.lineCount ?? 0) : "—"}</span>
        <span className="font-mono text-[11px] leading-none text-neutral-500">{timeAgo(project.createdAt)}</span>
        <div className="flex justify-end gap-1.5">
          {isProcessing && (
            <button
              onClick={(e) => { e.preventDefault(); onCancel(project.id) }}
              className="flex size-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-neutral-500 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              title="Stop parsing"
              aria-label="Stop parsing"
            >
              <HugeIcon icon={SquareIcon} className="size-3.5" />
            </button>
          )}
          {isCompleted && (
            <Link
              href={`/project?id=${encodeURIComponent(project.id)}`}
              className="flex h-8 items-center rounded-md border border-primary/25 bg-primary/[0.08] px-3 text-[11px] font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Open
            </Link>
          )}
          {isFailed && (
            <button
              onClick={(e) => { e.preventDefault(); onRetry(project) }}
              className="flex h-8 items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-[11px] font-medium text-neutral-300 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              Retry
            </button>
          )}
          <DeleteButton projectId={project.id} onDelete={onDelete} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group/card relative flex ${view === "grid" ? "min-h-[240px] flex-col" : "min-h-[92px] flex-row"} overflow-hidden rounded-xl border p-1.5 shadow-lg shadow-black/40 backdrop-blur-xl bg-gradient-to-b from-neutral-900/95 to-neutral-950/95 transition-[border-color,background-color,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none
        ${isCompleted ? "border-white/[0.10] hover:border-primary/30 hover:from-neutral-900 hover:to-neutral-950 hover:-translate-y-px" : ""}
        ${isActive ? "border-primary/40 from-primary/[0.07] to-primary/[0.02]" : ""}
        ${isQueued ? "border-white/[0.08] opacity-70" : ""}
        ${isFailed ? "border-rose-400/20" : ""}
      `}
    >
      {/* Active — scanning line */}
      {isActive && (
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden rounded-t-xl">
          <div className="h-full bg-primary animate-[scan_2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* 3D city preview pane */}
      {isCompleted && view === "grid" && (
        <div className="relative h-32 overflow-hidden rounded-lg border border-white/[0.08] bg-[#080809]">
          {snapshotLoading && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#080809]">
              <span className="relative z-10 flex items-center gap-2 text-[10px] font-mono text-neutral-500">
                <Loader2 className="size-3 animate-spin" />
                loading city…
              </span>
            </div>
          )}
          {snapshot && (
            <div className="absolute inset-0 pointer-events-none">
              <MiniCityPreview snapshot={snapshot} speed={0.4} className="w-full h-full" />
            </div>
          )}
          {!snapshotLoading && !snapshot && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#080809]">
              <span className="text-[10px] font-mono text-neutral-500">preview unavailable</span>
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-1 flex-col gap-3 p-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <HugeIcon icon={GitBranchIcon} className="size-3 shrink-0 text-neutral-500" />
              <span className="truncate font-mono text-[11px] leading-none text-neutral-400">{owner}/</span>
            </div>
            <h3 className="truncate text-[14px] font-semibold leading-[1.25] tracking-tight text-neutral-100">
              {repo}
            </h3>
          </div>

          {/* Status pill */}
          {isCompleted && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/[0.08] px-2 text-[10px] font-medium leading-none text-emerald-300">
              <Check className="size-3" />
              done
            </span>
          )}
          {isActive && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-primary/25 bg-primary/[0.10] px-2 text-[10px] font-medium leading-none text-primary">
              <Loader2 className="size-3 animate-spin" />
              analyzing
            </span>
          )}
          {isQueued && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-amber-300/20 bg-amber-300/[0.06] px-2 text-[10px] font-medium leading-none text-amber-200">
              queued
            </span>
          )}
          {isFailed && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-rose-400/25 bg-rose-400/[0.08] px-2 text-[10px] font-medium leading-none text-rose-300">
              <AlertCircle className="size-3" />
              failed
            </span>
          )}
        </div>

        {/* Stats — completed only */}
        {isCompleted && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <HugeIcon icon={DocumentCodeIcon} className="size-3.5 text-neutral-500" />
              <span className="font-mono text-[12px] leading-none text-neutral-200 tabular-nums">{formatNumber(project.fileCount ?? 0)}</span>
              <span className="text-[10px] leading-none text-neutral-500">files</span>
            </div>
            <div className="h-3 w-px bg-white/[0.10]" />
            <div className="flex items-center gap-1.5">
              <HugeIcon icon={CodeIcon} className="size-3.5 text-neutral-500" />
              <span className="font-mono text-[12px] leading-none text-neutral-200 tabular-nums">{formatNumber(project.lineCount ?? 0)}</span>
              <span className="text-[10px] leading-none text-neutral-500">lines</span>
            </div>
          </div>
        )}

        {/* Progress — active */}
        {isActive && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="truncate font-mono text-[11px] leading-none text-neutral-400">{currentMessage}</span>
              <span className="ml-2 shrink-0 font-mono text-[11px] leading-none text-neutral-200 tabular-nums">{currentProgress}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            {(project.filesDiscovered ?? 0) > 0 && (
              <div className="flex items-center gap-3 font-mono text-[10px] leading-none text-neutral-500 tabular-nums">
                <span>{formatNumber(project.filesDiscovered ?? 0)} found</span>
                <span>{formatNumber(project.filesParsed ?? 0)} parsed</span>
              </div>
            )}
          </div>
        )}

        {/* Queued message */}
        {isQueued && (
          <p className="font-mono text-[11px] leading-[1.4] text-neutral-500">{currentMessage}</p>
        )}

        {/* Error */}
        {isFailed && project.error && (
          <p className="line-clamp-2 rounded-md border border-rose-400/15 bg-rose-400/[0.04] px-3 py-2 font-mono text-[11px] leading-[1.4] text-rose-200/80">
            {project.error}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-mono text-[11px] leading-none text-neutral-500">{timeAgo(project.createdAt)}</span>
            {isExternal && project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex size-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-white/[0.05] hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                title="Open on GitHub"
                aria-label="Open repository on GitHub"
              >
                <HugeIcon icon={GitBranchIcon} className="size-3.5" />
              </a>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Retry */}
            {isFailed && (
              <button
                onClick={(e) => { e.preventDefault(); onRetry(project) }}
                className="flex h-8 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-[11px] font-medium text-neutral-300 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <RefreshCw className="size-3" />
                Retry
              </button>
            )}

            {isProcessing && (
              <button
                onClick={(e) => { e.preventDefault(); onCancel(project.id) }}
                className="flex size-8 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-neutral-500 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                title="Stop parsing"
                aria-label="Stop parsing"
              >
                <HugeIcon icon={SquareIcon} className="size-3.5" />
              </button>
            )}

            {/* Open */}
            {isCompleted && (
              <Link
                href={`/project?id=${encodeURIComponent(project.id)}`}
                onClick={(e) => e.stopPropagation()}
                className="flex h-8 items-center gap-1.5 rounded-md border border-primary/25 bg-primary/[0.08] px-3 text-[11px] font-medium leading-none text-primary transition-colors hover:border-primary/40 hover:bg-primary/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Open
                <ExternalLink className="size-3" />
              </Link>
            )}

            {/* Delete — inline confirm */}
            <DeleteButton projectId={project.id} onDelete={onDelete} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function MyProjectsTab({ onCreateCity }: { onCreateCity?: () => void }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<"grid" | "list">("grid")

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const records = await getProjects()
      return records.map((record) => normalizeProjectRecord(record as unknown as Record<string, unknown>))
    },
    refetchInterval: (query) => {
      const data = query.state.data as Project[] | undefined
      const hasActive = data?.some((p) => p.status === "PROCESSING" || p.status === "PENDING")
      return hasActive ? 5000 : false
    },
  })

  const processingProjects = projects.filter((p) => p.status === "PROCESSING" || p.status === "PENDING")
  const activeProjectId = processingProjects[0]?.id ?? null

  async function handleDelete(id: string) {
    try {
      await deleteProjectTauri(id).catch(() => {})
      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old ? old.filter((p) => p.id !== id) : []
      )
      queryClient.removeQueries({ queryKey: ["project-snapshot", id] })
    } catch {
      // ignore
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelProject(id)
      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old ? old.filter((p) => p.id !== id) : []
      )
      queryClient.removeQueries({ queryKey: ["project-snapshot", id] })
    } catch {
      // ignore
    }
  }

  async function handleRetry(project: Project) {
    if (!project.repoUrl) return

    try {
      const result = await analyze(project.repoUrl)
      if (!result.projectId) {
        throw new Error("Failed to retry")
      }
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-60 rounded-xl border border-white/[0.08] bg-neutral-900/60 p-1.5">
            <div className="h-32 rounded-lg bg-white/[0.03] animate-pulse" />
            <div className="space-y-3 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <div className="h-2 w-16 rounded-full bg-white/[0.05] animate-pulse" />
                  <div className="h-3.5 w-32 rounded-md bg-white/[0.06] animate-pulse" />
                </div>
                <div className="h-6 w-14 rounded-md bg-white/[0.05] animate-pulse" />
              </div>
              <div className="h-3 w-40 rounded-md bg-white/[0.04] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-white/[0.10] bg-[#101012]">
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
            <HugeIcon icon={Building03Icon} className="size-6 text-primary/70" />
          </div>
          <p className="text-[14px] font-semibold leading-[1.25] text-neutral-200">No cities yet</p>
          <p className="mt-2 max-w-xs text-[12px] leading-[1.5] text-neutral-500">
            Analyze a GitHub repo to generate an interactive 3D city from its codebase.
          </p>
          <Button
            onClick={() => onCreateCity?.()}
            size="sm"
            className="mt-5 h-8 gap-1.5 rounded-md bg-primary px-4 text-[12px] font-medium leading-none text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <HugeIcon icon={Add01Icon} className="size-3.5" />
            New City
          </Button>
        </div>
      </div>
    )
  }

  const settledProjects = projects.filter((p) => p.status !== "PROCESSING" && p.status !== "PENDING")
  const completedProjects = projects.filter((p) => p.status === "COMPLETED")
  const failedProjects = projects.filter((p) => p.status === "FAILED")
  const totalFiles = completedProjects.reduce((sum, p) => sum + (p.fileCount ?? 0), 0)
  const totalLines = completedProjects.reduce((sum, p) => sum + (p.lineCount ?? 0), 0)

  function renderGroup(label: string, icon: React.ReactNode, items: Project[]) {
    if (items.length === 0) return null
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-0.5">
          {icon}
          <span className="text-[12px] font-semibold uppercase leading-none tracking-[0.08em] text-neutral-400">{label}</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="font-mono text-[10px] leading-none text-neutral-500 tabular-nums">{items.length}</span>
        </div>
        {renderProjectCollection(items)}
      </div>
    )
  }

  function renderProjectCollection(items: Project[]) {
    if (view === "grid") {
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((project) => renderProject(project))}
        </div>
      )
    }

    return (
      <div className="overflow-hidden rounded-lg border border-white/[0.07] bg-[#101012]">
        <div className="grid grid-cols-[minmax(0,1.5fr)_96px_88px_88px_96px_140px] gap-3 border-b border-white/[0.07] px-3 py-2.5 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-neutral-500">
          <span>City</span>
          <span>Status</span>
          <span>Files</span>
          <span>Lines</span>
          <span>Updated</span>
          <span />
        </div>
        {items.map((project) => renderProject(project))}
      </div>
    )
  }

  function renderProject(project: Project) {
    return (
      <ProjectCard
        key={project.id}
        project={project}
        isQueued={
          (project.status === "PROCESSING" || project.status === "PENDING") &&
          project.id !== activeProjectId
        }
        onDelete={handleDelete}
        onCancel={handleCancel}
        onRetry={handleRetry}
        queryClient={queryClient}
        view={view}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <DashboardStat tone="blue" icon={<HugeIcon icon={Building03Icon} className="size-3.5" />} label="cities" value={projects.length} />
        <DashboardStat tone="amber" icon={<HugeIcon icon={Activity01Icon} className="size-3.5" />} label="active" value={processingProjects.length} />
        <DashboardStat tone="emerald" icon={<HugeIcon icon={DocumentCodeIcon} className="size-3.5" />} label="files" value={formatNumber(totalFiles)} />
        <DashboardStat tone="violet" icon={<HugeIcon icon={CodeIcon} className="size-3.5" />} label="lines" value={formatNumber(totalLines)} />
        <Button
          onClick={() => onCreateCity?.()}
          className="col-span-2 h-11 self-stretch gap-1.5 rounded-lg border border-primary/30 bg-primary px-4 text-[12px] font-semibold leading-none text-white hover:border-primary/45 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:col-span-1"
        >
          <HugeIcon icon={Add01Icon} className="size-3.5" />
          New City
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-0.5 rounded-md border border-white/[0.07] bg-white/[0.02] p-0.5">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`flex size-8 items-center justify-center rounded transition-colors ${view === "grid" ? "bg-white/[0.08] text-neutral-100" : "text-neutral-500 hover:text-neutral-200"}`}
            title="Grid view"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
          >
            <HugeIcon icon={GridViewIcon} className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`flex size-8 items-center justify-center rounded transition-colors ${view === "list" ? "bg-white/[0.08] text-neutral-100" : "text-neutral-500 hover:text-neutral-200"}`}
            title="List view"
            aria-label="List view"
            aria-pressed={view === "list"}
          >
            <HugeIcon icon={LayoutTable01Icon} className="size-3.5" />
          </button>
        </div>
      </div>

      {processingProjects.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-0.5">
            <HugeIcon icon={WorkflowSquare01Icon} className="size-3 text-primary" />
            <span className="text-[12px] font-semibold uppercase leading-none tracking-[0.08em] text-primary">Running</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="font-mono text-[10px] leading-none text-neutral-500 tabular-nums">{processingProjects.length}</span>
          </div>
          {renderProjectCollection(processingProjects)}
        </div>
      )}

      {renderGroup("Cities", <HugeIcon icon={Building03Icon} className="size-3 text-neutral-500" />, settledProjects)}
      {failedProjects.length > 0 && (
        <div className="rounded-lg border border-rose-400/15 bg-rose-400/[0.04] px-3 py-2.5 font-mono text-[11px] leading-[1.4] text-rose-200/80">
          {failedProjects.length} failed analysis {failedProjects.length === 1 ? "needs" : "need"} attention.
        </div>
      )}
    </div>
  )
}

function DashboardStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  tone: "blue" | "amber" | "emerald" | "violet"
}) {
  const tones = {
    blue: "border-sky-400/18 bg-sky-400/[0.055] text-sky-300",
    amber: "border-amber-300/18 bg-amber-300/[0.055] text-amber-200",
    emerald: "border-emerald-300/18 bg-emerald-300/[0.055] text-emerald-200",
    violet: "border-violet-300/18 bg-violet-300/[0.055] text-violet-200",
  }

  return (
    <div className="flex h-11 items-center justify-between rounded-lg border border-white/[0.07] bg-[#101012] px-3">
      <div className="flex items-center gap-2">
        <span className={`flex size-7 items-center justify-center rounded-md border ${tones[tone]}`}>
          {icon}
        </span>
        <span className="text-[12px] font-medium leading-none text-neutral-400">{label}</span>
      </div>
      <span className="font-mono text-[13px] leading-none text-neutral-100 tabular-nums">{value}</span>
    </div>
  )
}
