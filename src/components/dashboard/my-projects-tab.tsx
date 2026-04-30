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
    createdAt: String(record.created_at ?? record.createdAt ?? new Date().toISOString()),
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
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
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
        className="flex items-center gap-0.5 overflow-hidden rounded-md border border-white/[0.10] bg-white/[0.04]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="px-2 py-1 text-[10px] font-medium leading-none text-zinc-400">Remove?</span>
        <IconButton
          onClick={confirm}
          className="size-6 border-transparent bg-transparent text-zinc-500 hover:border-white/[0.10] hover:bg-white/[0.04] hover:text-zinc-200"
          aria-label="Confirm remove"
        >
          <Check />
        </IconButton>
        <IconButton
          onClick={cancel}
          className="size-6 border-transparent bg-transparent text-zinc-500"
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
      className="size-7 border-white/[0.07] bg-white/[0.02] text-zinc-600 hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-zinc-300"
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
        className={`grid min-h-12 grid-cols-[minmax(0,1.5fr)_92px_90px_90px_92px_132px] items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 transition-colors hover:bg-white/[0.025]
          ${isActive ? "bg-primary/[0.025]" : ""}
          ${isQueued ? "opacity-70" : ""}
        `}
      >
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] text-zinc-700">{owner}/</p>
          <h3 className="truncate text-[12px] font-medium leading-tight text-zinc-200">{repo}</h3>
        </div>
        <span className="font-mono text-[10px] text-zinc-600">
          {isCompleted ? "done" : isActive ? "analyzing" : isQueued ? "queued" : "failed"}
        </span>
        <span className="font-mono text-[10px] text-zinc-600">{isCompleted ? formatNumber(project.fileCount ?? 0) : "-"}</span>
        <span className="font-mono text-[10px] text-zinc-600">{isCompleted ? formatNumber(project.lineCount ?? 0) : "-"}</span>
        <span className="font-mono text-[10px] text-zinc-700">{timeAgo(project.createdAt)}</span>
        <div className="flex justify-end gap-1.5">
          {isProcessing && (
            <button
              onClick={(e) => { e.preventDefault(); onCancel(project.id) }}
              className="flex size-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-zinc-500 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-zinc-200"
              title="Stop parsing"
              aria-label="Stop parsing"
            >
              <HugeIcon icon={SquareIcon} className="size-3" />
            </button>
          )}
          {isCompleted && (
            <Link
              href={`/project?id=${encodeURIComponent(project.id)}`}
              className="flex h-7 items-center rounded-md border border-white/[0.10] bg-white/[0.05] px-2.5 text-[10px] font-medium text-zinc-200 transition-colors hover:border-white/[0.16] hover:bg-white/[0.08]"
            >
              Open
            </Link>
          )}
          {isFailed && (
            <button
              onClick={(e) => { e.preventDefault(); onRetry(project) }}
              className="flex h-7 items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 text-[10px] font-medium text-zinc-400 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-zinc-200"
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
      className={`relative flex ${view === "grid" ? "min-h-[232px] flex-col" : "min-h-[92px] flex-row"} overflow-hidden rounded-lg border bg-[#101012] transition-colors duration-150
        ${isCompleted ? "border-white/[0.08] hover:border-white/[0.12]" : ""}
        ${isActive ? "border-primary/35 bg-primary/[0.025]" : ""}
        ${isQueued ? "border-white/[0.06] opacity-70" : ""}
        ${isFailed ? "border-white/[0.09]" : ""}
      `}
    >
      {/* Active — scanning line */}
      {isActive && (
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <div className="h-full bg-primary animate-[scan_2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* 3D city preview pane */}
      {isCompleted && view === "grid" && (
        <div className="relative h-[124px] overflow-hidden border-b border-white/[0.06] bg-[#080809]">
          {snapshotLoading && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#080809]">
              <span className="relative z-10 flex items-center gap-2 text-[10px] font-mono text-zinc-700">
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
              <span className="text-[10px] font-mono text-zinc-700">preview unavailable</span>
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-1 flex-col gap-3 p-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <HugeIcon icon={GitBranchIcon} className="h-3 w-3 shrink-0 text-zinc-700" />
              <span className="truncate font-mono text-[11px] text-zinc-600">{owner}/</span>
            </div>
            <h3 className="truncate text-sm font-semibold leading-tight text-zinc-100">
              {repo}
            </h3>
          </div>

          {/* Status pill */}
          {isCompleted && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-zinc-500">
              <Check className="size-3" />
              done
            </span>
          )}
          {isActive && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/[0.08] px-2 py-1 text-[10px] font-medium text-primary">
              <Loader2 className="size-3 animate-spin" />
              analyzing
            </span>
          )}
          {isQueued && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-[10px] font-medium text-zinc-600">
              queued
            </span>
          )}
          {isFailed && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/[0.10] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-zinc-400">
              <AlertCircle className="h-2.5 w-2.5" />
              failed
            </span>
          )}
        </div>

        {/* Stats — completed only */}
        {isCompleted && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <HugeIcon icon={DocumentCodeIcon} className="h-3 w-3 text-zinc-700" />
              <span className="text-xs font-mono text-zinc-400">{formatNumber(project.fileCount ?? 0)}</span>
              <span className="text-[10px] text-zinc-700">files</span>
            </div>
            <div className="h-3 w-px bg-white/[0.06]" />
            <div className="flex items-center gap-1.5">
              <HugeIcon icon={CodeIcon} className="h-3 w-3 text-zinc-700" />
              <span className="text-xs font-mono text-zinc-400">{formatNumber(project.lineCount ?? 0)}</span>
              <span className="text-[10px] text-zinc-700">lines</span>
            </div>
          </div>
        )}

        {/* Progress — active */}
        {isActive && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-600 font-mono truncate">{currentMessage}</span>
              <span className="text-[10px] font-mono text-zinc-500 tabular-nums ml-2 shrink-0">{currentProgress}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-sm bg-white/[0.06]">
              <div
                className="h-full rounded-sm bg-primary transition-all duration-700 ease-out"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            {(project.filesDiscovered ?? 0) > 0 && (
              <div className="flex items-center gap-2 font-mono text-[9px] text-zinc-700">
                <span>{formatNumber(project.filesDiscovered ?? 0)} found</span>
                <span>{formatNumber(project.filesParsed ?? 0)} parsed</span>
              </div>
            )}
          </div>
        )}

        {/* Queued message */}
        {isQueued && (
          <p className="text-[10px] font-mono text-zinc-700">{currentMessage}</p>
        )}

        {/* Error */}
        {isFailed && project.error && (
          <p className="line-clamp-2 rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-2 font-mono text-[10px] text-zinc-500">
            {project.error}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[10px] font-mono text-zinc-700">{timeAgo(project.createdAt)}</span>
            {isExternal && project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex size-6 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-white/[0.04] hover:text-zinc-400"
                title="Open on GitHub"
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
                className="flex h-7 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 text-[10px] font-medium text-zinc-400 transition-colors hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-zinc-200"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Retry
              </button>
            )}

            {isProcessing && (
              <button
                onClick={(e) => { e.preventDefault(); onCancel(project.id) }}
                className="flex size-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.03] text-zinc-500 transition-colors hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-zinc-200"
                title="Stop parsing"
                aria-label="Stop parsing"
              >
                <HugeIcon icon={SquareIcon} className="size-3" />
              </button>
            )}

            {/* Open */}
            {isCompleted && (
              <Link
                href={`/project?id=${encodeURIComponent(project.id)}`}
                onClick={(e) => e.stopPropagation()}
                className="flex h-7 items-center gap-1.5 rounded-md border border-white/[0.10] bg-white/[0.05] px-2.5 text-[10px] font-medium text-zinc-200 transition-colors hover:border-white/[0.16] hover:bg-white/[0.08]"
              >
                Open
                <ExternalLink className="h-2.5 w-2.5" />
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
          <div key={i} className="h-36 rounded-lg border border-white/[0.07] bg-[#101012] p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2">
                <div className="h-2 w-14 rounded-full bg-white/[0.05] animate-pulse" />
                <div className="h-4 w-28 rounded-md bg-white/[0.06] animate-pulse" />
              </div>
              <div className="h-5 w-14 rounded-full bg-white/[0.05] animate-pulse" />
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.04] animate-pulse mt-6" />
          </div>
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-white/[0.10] bg-[#101012]">
        <div className="flex flex-col items-center text-center py-10">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
            <HugeIcon icon={Building03Icon} className="h-6 w-6 text-primary/70" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">No cities yet</p>
          <p className="text-xs text-zinc-600 mt-1.5 max-w-xs leading-relaxed">
            Analyze a GitHub repo to generate an interactive 3D city from its codebase.
          </p>
          <Button
            onClick={() => onCreateCity?.()}
            size="sm"
            className="mt-5 h-8 gap-1.5 rounded-md bg-primary px-4 text-xs text-white hover:bg-primary/90"
          >
            <HugeIcon icon={Add01Icon} className="h-3.5 w-3.5" />
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
          <span className="text-sm font-medium text-zinc-400">{label}</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[10px] font-mono text-zinc-700">{items.length}</span>
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
        <div className="grid grid-cols-[minmax(0,1.5fr)_92px_90px_90px_92px_132px] gap-3 border-b border-white/[0.07] px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-zinc-700">
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
          className="col-span-2 h-[45px] self-stretch gap-1.5 rounded-lg border border-primary/30 bg-primary px-4 text-xs font-semibold text-white hover:border-primary/45 hover:bg-primary/90 lg:col-span-1"
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
            className={`flex size-7 items-center justify-center rounded ${view === "grid" ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-300"}`}
            title="Grid view"
          >
            <HugeIcon icon={GridViewIcon} className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`flex size-7 items-center justify-center rounded ${view === "list" ? "bg-white/[0.08] text-zinc-100" : "text-zinc-600 hover:text-zinc-300"}`}
            title="List view"
          >
            <HugeIcon icon={LayoutTable01Icon} className="size-3.5" />
          </button>
        </div>
      </div>

      {processingProjects.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 px-0.5">
            <HugeIcon icon={WorkflowSquare01Icon} className="h-3 w-3 text-primary" />
            <span className="text-sm font-medium text-zinc-300">Running</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-zinc-700">{processingProjects.length}</span>
          </div>
          {renderProjectCollection(processingProjects)}
        </div>
      )}

      {renderGroup("Cities", <HugeIcon icon={Building03Icon} className="h-3 w-3 text-zinc-700" />, settledProjects)}
      {failedProjects.length > 0 && (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 font-mono text-[10px] text-zinc-500">
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
    <div className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-[#101012] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`flex size-6 items-center justify-center rounded-md border ${tones[tone]}`}>
          {icon}
        </span>
        <span className="text-xs font-medium text-zinc-500">{label}</span>
      </div>
      <span className="font-mono text-[13px] text-zinc-200">{value}</span>
    </div>
  )
}
