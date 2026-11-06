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
import { getProjectSnapshot, deleteProject as deleteProjectTauri, analyze, getProject, cancelProject } from "@/lib/tauri"
import { HugeIcon } from "@/components/ui/huge-icon"
import { fetchProjects, type Project } from "@/lib/projects"
import { EmptyState } from "@/components/ui/empty-state"

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
        className="pixel-shadow-sm flex h-8 items-center gap-0.5 overflow-hidden rounded-none border-2 border-[var(--sev-high)] bg-[var(--bg-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="px-2 text-[10px] font-medium uppercase tracking-[0.08em] leading-none text-[var(--cream)]">Remove?</span>
        <IconButton
          onClick={confirm}
          className="size-7 rounded-none border-transparent bg-transparent text-[var(--sev-high)] hover:bg-[color-mix(in_srgb,var(--sev-high)_15%,transparent)]"
          aria-label="Confirm remove"
        >
          <Check />
        </IconButton>
        <IconButton
          onClick={cancel}
          className="size-7 rounded-none border-transparent bg-transparent text-[var(--muted)] hover:text-[var(--cream)]"
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
      className="pixel-shadow-sm btn-press size-8 rounded-none border-2 border-[var(--border-pixel)] bg-[var(--bg-raised)] text-[var(--muted)] hover:border-[var(--sev-high)] hover:text-[var(--sev-high)]"
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
        className={`grid min-h-11 grid-cols-[minmax(0,1.5fr)_96px_88px_88px_96px_140px] items-center gap-3 border-b-2 border-(--border-pixel) px-3 py-2 transition-colors hover:bg-(--bg-raised)
          ${isActive ? "bg-[color-mix(in_srgb,var(--lime)_4%,transparent)]" : ""}
          ${isQueued ? "opacity-70" : ""}
        `}
      >
        <div className="min-w-0">
          <p className="truncate font-mono text-[10px] leading-[1.4] text-(--muted)">{owner}/</p>
          <h3 className="truncate text-[13px] font-medium leading-[1.25] text-(--cream)">{repo}</h3>
        </div>
        <span className="font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-(--cream-dark)">
          {isCompleted ? "done" : isActive ? "analyzing" : isQueued ? "queued" : "failed"}
        </span>
        <span className="font-mono text-[11px] leading-none text-(--cream) tabular-nums">{isCompleted ? formatNumber(project.fileCount ?? 0) : "—"}</span>
        <span className="font-mono text-[11px] leading-none text-(--cream) tabular-nums">{isCompleted ? formatNumber(project.lineCount ?? 0) : "—"}</span>
        <span className="font-mono text-[10px] uppercase leading-none tracking-[0.08em] text-(--muted)">{timeAgo(project.createdAt)}</span>
        <div className="flex justify-end gap-1.5">
          {isProcessing && (
            <button
              onClick={(e) => { e.preventDefault(); onCancel(project.id) }}
              className="pixel-shadow-sm btn-press flex size-8 items-center justify-center rounded-none border-2 border-(--border-pixel) bg-(--bg-raised) text-(--muted) transition-colors hover:border-(--border-light) hover:text-(--cream)"
              title="Stop parsing"
              aria-label="Stop parsing"
            >
              <HugeIcon icon={SquareIcon} className="size-3.5" />
            </button>
          )}
          {isCompleted && (
            <Link
              href={`/project?id=${encodeURIComponent(project.id)}`}
              className="pixel-shadow-accent btn-press flex h-8 items-center rounded-none border-2 border-(--bg) bg-primary px-3 text-[10px] font-semibold uppercase tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary"
            >
              Open
            </Link>
          )}
          {isFailed && (
            <button
              onClick={(e) => { e.preventDefault(); onRetry(project) }}
              className="pixel-shadow-sm btn-press flex h-8 items-center rounded-none border-2 border-(--border-pixel) bg-(--bg-raised) px-3 text-[10px] font-medium uppercase tracking-[0.05em] text-(--cream-dark) transition-colors hover:border-(--border-light) hover:text-(--cream)"
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
      className={`group/card pixel-shadow relative flex ${view === "grid" ? "min-h-[240px] flex-col" : "min-h-[92px] flex-row"} overflow-hidden border-2 p-1.5 bg-card transition-[border-color,background-color,transform] duration-150 ease-out motion-reduce:transition-none
        ${isCompleted ? "border-[var(--border-light)] hover:border-primary hover:-translate-y-px" : ""}
        ${isActive ? "border-primary bg-[color-mix(in_srgb,var(--lime)_4%,var(--bg-card))]" : ""}
        ${isQueued ? "border-[var(--border-pixel)] opacity-70" : ""}
        ${isFailed ? "border-[var(--sev-high)]" : ""}
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
        <div className="relative h-32 overflow-hidden border-2 border-[var(--border-pixel)] bg-[var(--bg-deep)]">
          {snapshotLoading && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[var(--bg-deep)]">
              <span className="relative z-10 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--muted)]">
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
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-deep)]">
              <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[var(--muted)]">preview unavailable</span>
            </div>
          )}
        </div>
      )}

      {/* Status pane — same footprint as the city preview so cards line up */}
      {!isCompleted && view === "grid" && (
        <div className="relative flex h-32 flex-col items-center justify-center gap-1.5 border-2 border-(--border-pixel) bg-(--bg-deep)">
          {isActive && (
            <>
              <span className="font-mono text-[28px] font-bold leading-none tabular-nums text-primary">{currentProgress}%</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">building city</span>
            </>
          )}
          {isQueued && (
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--muted)">in queue</span>
          )}
          {isFailed && (
            <>
              <AlertCircle className="size-6 text-(--sev-high)" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-(--sev-high)">analysis failed</span>
            </>
          )}
        </div>
      )}

      <div className="relative flex flex-1 flex-col gap-3 p-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              <HugeIcon icon={GitBranchIcon} className="size-3 shrink-0 text-(--muted)" />
              <span className="truncate font-mono text-[11px] leading-none text-(--cream-dark)">{owner}/</span>
            </div>
            <h3 className="truncate text-[14px] font-semibold leading-[1.25] tracking-tight text-(--cream)">
              {repo}
            </h3>
          </div>

          {/* Status pill */}
          {isCompleted && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-none border-2 border-[var(--lime)] bg-[color-mix(in_srgb,var(--lime)_10%,transparent)] px-2 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-[var(--lime)]">
              <Check className="size-3" />
              done
            </span>
          )}
          {isActive && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-none border-2 border-primary bg-[color-mix(in_srgb,var(--lime)_12%,transparent)] px-2 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-primary">
              <Loader2 className="size-3 animate-spin" />
              analyzing
            </span>
          )}
          {isQueued && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-none border-2 border-[var(--sev-med)] bg-[color-mix(in_srgb,var(--sev-med)_8%,transparent)] px-2 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-[var(--sev-med)]">
              queued
            </span>
          )}
          {isFailed && (
            <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-none border-2 border-[var(--sev-high)] bg-[color-mix(in_srgb,var(--sev-high)_10%,transparent)] px-2 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-[var(--sev-high)]">
              <AlertCircle className="size-3" />
              failed
            </span>
          )}
        </div>

        {/* Stats — completed only */}
        {isCompleted && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <HugeIcon icon={DocumentCodeIcon} className="size-3.5 text-(--muted)" />
              <span className="font-mono text-[12px] leading-none text-(--cream) tabular-nums">{formatNumber(project.fileCount ?? 0)}</span>
              <span className="text-[10px] leading-none text-(--muted)">files</span>
            </div>
            <div className="h-3 w-px bg-(--bg-card)" />
            <div className="flex items-center gap-1.5">
              <HugeIcon icon={CodeIcon} className="size-3.5 text-(--muted)" />
              <span className="font-mono text-[12px] leading-none text-(--cream) tabular-nums">{formatNumber(project.lineCount ?? 0)}</span>
              <span className="text-[10px] leading-none text-(--muted)">lines</span>
            </div>
          </div>
        )}

        {/* Progress — active */}
        {isActive && (
          <div className="space-y-2">
            <span className="block truncate font-mono text-[11px] leading-none text-(--cream-dark)">{currentMessage}</span>
            <div
              role="progressbar"
              aria-label="Analysis progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={currentProgress}
              className="h-1.5 w-full overflow-hidden border border-(--border-pixel) bg-(--bg-deep)"
            >
              <div
                className="h-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            {(project.filesDiscovered ?? 0) > 0 && (
              <div className="flex items-center gap-3 font-mono text-[10px] leading-none text-(--muted) tabular-nums">
                <span>{formatNumber(project.filesDiscovered ?? 0)} found</span>
                <span>{formatNumber(project.filesParsed ?? 0)} parsed</span>
              </div>
            )}
          </div>
        )}

        {/* Queued message */}
        {isQueued && (
          <p className="font-mono text-[11px] leading-[1.4] text-(--muted)">{currentMessage}</p>
        )}

        {/* Error */}
        {isFailed && project.error && (
          <p className="line-clamp-2 rounded-none border-2 border-[var(--sev-high)] bg-[color-mix(in_srgb,var(--sev-high)_6%,transparent)] px-3 py-2 font-mono text-[11px] leading-[1.4] text-[var(--sev-high)]">
            {project.error}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t-2 border-dashed border-[var(--border-pixel)] pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-mono text-[11px] leading-none text-[var(--muted)]">{timeAgo(project.createdAt)}</span>
            {isExternal && project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex size-7 items-center justify-center rounded-none text-[var(--muted)] transition-colors hover:bg-[var(--bg-raised)] hover:text-[var(--cream)]"
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
                className="pixel-shadow-sm btn-press flex h-8 items-center gap-1.5 rounded-none border-2 border-[var(--border-pixel)] bg-[var(--bg-raised)] px-3 text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--cream-dark)] transition-colors hover:border-[var(--border-light)] hover:text-[var(--cream)]"
              >
                <RefreshCw className="size-3" />
                Retry
              </button>
            )}

            {isProcessing && (
              <button
                onClick={(e) => { e.preventDefault(); onCancel(project.id) }}
                className="pixel-shadow-sm btn-press flex size-8 items-center justify-center rounded-none border-2 border-[var(--border-pixel)] bg-[var(--bg-raised)] text-[var(--muted)] transition-colors hover:border-[var(--border-light)] hover:text-[var(--cream)]"
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
                className="pixel-shadow-accent btn-press flex h-8 items-center gap-1.5 rounded-none border-2 border-(--bg) bg-primary px-3 text-[10px] font-semibold uppercase leading-none tracking-[0.05em] text-primary-foreground transition-colors hover:bg-primary"
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
    queryFn: fetchProjects,
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
          <div key={i} className="pixel-shadow-sm h-60 border-2 border-[var(--border-light)] bg-card p-1.5">
            <div className="h-32 bg-[var(--bg-raised)] animate-pulse" />
            <div className="space-y-3 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2">
                  <div className="h-2 w-16 bg-[var(--border-light)] animate-pulse" />
                  <div className="h-3.5 w-32 bg-[var(--border-light)] animate-pulse" />
                </div>
                <div className="h-6 w-14 bg-[var(--border-light)] animate-pulse" />
              </div>
              <div className="h-3 w-40 bg-[var(--border-light)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<HugeIcon icon={Building03Icon} />}
        title="No cities yet"
        description="Analyze a GitHub repo to generate an interactive 3D city from its codebase."
        action={
          <Button
            onClick={() => onCreateCity?.()}
            size="sm"
            className="pixel-shadow-accent btn-press h-9 gap-2 rounded-none border-2 border-(--bg) bg-primary px-4 text-[12px] font-medium uppercase leading-none tracking-[0.05em] text-primary-foreground hover:bg-primary"
          >
            <HugeIcon icon={Add01Icon} className="size-3.5" />
            New City
          </Button>
        }
      />
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
          <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-(--cream)">{label}</span>
          <div className="h-px flex-1 border-t border-dashed border-(--border-pixel)" />
          <span className="font-mono text-[10px] leading-none text-(--muted) tabular-nums">{items.length}</span>
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
      <div className="pixel-shadow overflow-hidden rounded-none border-2 border-(--border-light) bg-card">
        <div className="grid grid-cols-[minmax(0,1.5fr)_96px_88px_88px_96px_140px] gap-3 border-b-2 border-(--border-pixel) bg-(--bg-raised) px-3 py-2.5 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-(--muted)">
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
        <DashboardStat icon={<HugeIcon icon={Building03Icon} className="size-3.5" />} label="cities" value={projects.length} />
        <DashboardStat highlight={processingProjects.length > 0} icon={<HugeIcon icon={Activity01Icon} className="size-3.5" />} label="active" value={processingProjects.length} />
        <DashboardStat icon={<HugeIcon icon={DocumentCodeIcon} className="size-3.5" />} label="files" value={formatNumber(totalFiles)} />
        <DashboardStat icon={<HugeIcon icon={CodeIcon} className="size-3.5" />} label="lines" value={formatNumber(totalLines)} />
        <Button
          onClick={() => onCreateCity?.()}
          className="pixel-shadow-accent btn-press col-span-2 h-11 self-stretch gap-2 rounded-none border-2 border-(--bg) bg-primary px-4 text-[12px] font-semibold uppercase leading-none tracking-[0.05em] text-primary-foreground hover:bg-primary lg:col-span-1"
        >
          <HugeIcon icon={Add01Icon} className="size-3.5" />
          New City
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="cc-seg" role="group" aria-label="Layout">
          <button
            type="button"
            onClick={() => setView("grid")}
            className="cc-seg-btn h-8"
            title="Grid view"
            aria-label="Grid view"
            aria-pressed={view === "grid"}
          >
            <HugeIcon icon={GridViewIcon} className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className="cc-seg-btn h-8"
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
            <span className="text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-primary">Running</span>
            <div className="h-px flex-1 border-t border-dashed border-primary opacity-40" />
            <span className="font-mono text-[10px] leading-none text-(--muted) tabular-nums">{processingProjects.length}</span>
          </div>
          {renderProjectCollection(processingProjects)}
        </div>
      )}

      {renderGroup("Cities", <HugeIcon icon={Building03Icon} className="size-3 text-(--muted)" />, settledProjects)}
      {failedProjects.length > 0 && (
        <div className="rounded-none border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_6%,transparent)] px-3 py-2.5 font-mono text-[11px] uppercase leading-[1.4] tracking-[0.05em] text-(--sev-high)">
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
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div className="pixel-shadow-sm flex h-11 items-center justify-between border-2 border-(--border-light) bg-card px-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`flex size-7 items-center justify-center border-2 ${
            highlight ? "border-primary bg-primary text-primary-foreground" : "border-(--border-pixel) bg-(--bg-raised) text-(--cream-dark)"
          }`}
        >
          {icon}
        </span>
        <span className="font-mono text-[11px] font-medium uppercase leading-none tracking-[0.08em] text-(--muted)">{label}</span>
      </div>
      <span className="font-mono text-[13px] leading-none text-(--cream) tabular-nums">{value}</span>
    </div>
  )
}
