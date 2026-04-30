"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  Plus,
  Globe,
  Lock,
  Trash2,
  Building2,
  FileCode,
  Code2,
  ExternalLink,
  RefreshCw,
  GitBranch,
  AlertCircle,
  X,
  Check,
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@codecity/ui/components/button"
import { MiniCityPreview } from "@/components/city/mini-city-preview"
import type { CitySnapshot } from "@/lib/types/city"
import { getProjects, getProjectSnapshot, deleteProject as deleteProjectTauri, analyze, getProject } from "@/lib/tauri"

interface Project {
  id: string
  name: string
  repoUrl: string
  visibility: "PUBLIC" | "PRIVATE"
  status: string
  fileCount?: number
  lineCount?: number
  error?: string | null
  createdAt: string
}

function normalizeProjectRecord(record: Record<string, unknown>): Project {
  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? "Untitled"),
    repoUrl: String(record.repo_url ?? record.repoUrl ?? ""),
    visibility: record.visibility === "PUBLIC" ? "PUBLIC" : "PRIVATE",
    status: String(record.status ?? "FAILED"),
    fileCount: Number(record.file_count ?? record.fileCount ?? 0),
    lineCount: Number(record.line_count ?? record.lineCount ?? 0),
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
            setProgress({ stage: "processing", progress: 50, message: "Analyzing..." })
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
        className="flex items-center gap-0.5 overflow-hidden rounded-md border border-red-500/30 bg-red-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-medium text-red-400 px-2 py-1 leading-none">Delete?</span>
        <button
          onClick={confirm}
        className="flex items-center justify-center px-1.5 py-1 text-red-400 transition-colors hover:bg-red-500/20"
          aria-label="Confirm delete"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={cancel}
        className="flex items-center justify-center px-1.5 py-1 text-zinc-500 transition-colors hover:bg-white/[0.06]"
          aria-label="Cancel delete"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={openConfirm}
      className="rounded-md p-1.5 text-zinc-700 opacity-0 transition-colors hover:bg-red-500/[0.08] hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
      aria-label="Delete project"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  )
}

/** Fetch snapshot on mount for completed projects */
function useSnapshot(projectId: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<CitySnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (!enabled || fetched.current) return
    fetched.current = true
    setLoading(true)
    getProjectSnapshot(projectId)
      .then((data) => { if (data) setSnapshot(data as unknown as CitySnapshot) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [enabled, projectId])

  return { snapshot, loading }
}

function ProjectCard({
  project,
  isQueued,
  onDelete,
  onToggleVisibility,
  onRetry,
  queryClient,
}: {
  project: Project
  isQueued: boolean
  onDelete: (id: string) => void
  onToggleVisibility: (e: React.MouseEvent, project: Project) => void
  onRetry: (project: Project) => void
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const [hovered, setHovered] = useState(false)
  const [previewRequested, setPreviewRequested] = useState(false)
  const { snapshot, loading: snapshotLoading } = useSnapshot(
    project.id,
    project.status === "COMPLETED" && previewRequested
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

  const currentProgress = isActive && progress ? progress.progress : 0
  const currentMessage = isActive && progress
    ? progress.message
    : isQueued
      ? "Queued — waiting for active job to finish"
      : null

  function requestPreview() {
    if (isCompleted) setPreviewRequested(true)
  }

  return (
    <div
      onMouseEnter={() => {
        setHovered(true)
        requestPreview()
      }}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={requestPreview}
      className={`group relative flex min-h-[176px] flex-col overflow-hidden rounded-lg border bg-[#101012] transition-colors duration-150
        ${isCompleted ? "border-white/[0.08] hover:border-white/[0.16]" : ""}
        ${isActive ? "border-primary/35" : ""}
        ${isQueued ? "border-white/[0.04] opacity-60" : ""}
        ${isFailed ? "border-red-500/25" : ""}
      `}
    >
      {/* Active — scanning line */}
      {isActive && (
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <div className="h-full bg-primary animate-[scan_2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* 3D city preview pane */}
      {isCompleted && (
        <div className="relative h-[112px] overflow-hidden border-b border-white/[0.06] bg-[#080809]">
          {!previewRequested && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#080809]">
              <span className="text-[10px] font-mono text-zinc-700">hover to preview</span>
            </div>
          )}
          {previewRequested && snapshotLoading && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#080809]">
              <span className="text-[10px] font-mono text-zinc-700 relative z-10">loading city…</span>
            </div>
          )}
          {hovered && snapshot && (
            <div className="absolute inset-0 pointer-events-none">
              <MiniCityPreview snapshot={snapshot} speed={0.4} className="w-full h-full" />
            </div>
          )}
          {previewRequested && snapshot && !hovered && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#080809]">
              <span className="text-[10px] font-mono text-zinc-700">hover to animate</span>
            </div>
          )}
        </div>
      )}

      <div className="relative flex flex-1 flex-col gap-3 p-3.5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-1.5">
              {project.visibility === "PRIVATE" ? (
                <Lock className="h-3 w-3 text-zinc-700 shrink-0" />
              ) : (
                <Globe className="h-3 w-3 text-zinc-700 shrink-0" />
              )}
              <span className="truncate font-mono text-[11px] text-zinc-600">{owner}/</span>
            </div>
            <h3 className="truncate text-sm font-semibold leading-tight text-zinc-100">
              {repo}
            </h3>
          </div>

          {/* Status pill */}
          {isCompleted && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/[0.08] px-2 py-1 text-[10px] font-medium text-emerald-400">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              done
            </span>
          )}
          {isActive && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/20 bg-primary/[0.08] px-2 py-1 text-[10px] font-medium text-primary">
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              analyzing
            </span>
          )}
          {isQueued && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-700/60 bg-zinc-800/60 px-2 py-1 text-[10px] font-medium text-zinc-600">
              queued
            </span>
          )}
          {isFailed && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/[0.08] px-2 py-1 text-[10px] font-medium text-red-400">
              <AlertCircle className="h-2.5 w-2.5" />
              failed
            </span>
          )}
        </div>

        {/* Stats — completed only */}
        {isCompleted && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <FileCode className="h-3 w-3 text-zinc-700" />
              <span className="text-xs font-mono text-zinc-400">{formatNumber(project.fileCount ?? 0)}</span>
              <span className="text-[10px] text-zinc-700">files</span>
            </div>
            <div className="h-3 w-px bg-white/[0.06]" />
            <div className="flex items-center gap-1.5">
              <Code2 className="h-3 w-3 text-zinc-700" />
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
          </div>
        )}

        {/* Queued message */}
        {isQueued && (
          <p className="text-[10px] font-mono text-zinc-700">{currentMessage}</p>
        )}

        {/* Error */}
        {isFailed && project.error && (
          <p className="line-clamp-2 rounded-md border border-red-500/10 bg-red-500/[0.04] px-2.5 py-2 font-mono text-[10px] text-red-400/70">
            {project.error}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-700">{timeAgo(project.createdAt)}</span>
            {isExternal && project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-zinc-700 hover:text-zinc-400 transition-colors"
                title="Open on GitHub"
              >
                <GitBranch className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Retry */}
            {isFailed && (
              <button
                onClick={(e) => { e.preventDefault(); onRetry(project) }}
                className="flex items-center gap-1.5 rounded-md border border-amber-500/15 bg-amber-500/[0.08] px-2.5 py-1 text-[10px] font-medium text-amber-400 transition-colors hover:bg-amber-500/15"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Retry
              </button>
            )}

            {/* Open */}
            {isCompleted && (
              <Link
                href={`/project?id=${encodeURIComponent(project.id)}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Open
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            )}

            {/* Visibility toggle */}
            <button
              onClick={(e) => onToggleVisibility(e, project)}
              className="p-1.5 rounded-md text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.04] transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label={project.visibility === "PUBLIC" ? "Make private" : "Make public"}
            >
              {project.visibility === "PUBLIC" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            </button>

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
    } catch {
      // ignore
    }
  }

  async function handleRetry(project: Project) {
    if (!project.repoUrl) return

    try {
      const result = await analyze(project.repoUrl, { visibility: project.visibility })
      if (!result.projectId) {
        throw new Error("Failed to retry")
      }
    } catch {
      // ignore
    }
  }

  function handleToggleVisibility(e: React.MouseEvent, project: Project) {
    e.stopPropagation()
    const newVisibility = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"
    queryClient.setQueryData<Project[]>(["projects"], (old) =>
      old ? old.map((p) => p.id === project.id ? { ...p, visibility: newVisibility } : p) : []
    )
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
            <Building2 className="h-6 w-6 text-primary/70" />
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
            <Plus className="h-3.5 w-3.5" />
            New City
          </Button>
        </div>
      </div>
    )
  }

  const privateProjects = projects.filter((p) => p.visibility === "PRIVATE")
  const publicProjects = projects.filter((p) => p.visibility === "PUBLIC")

  function renderGroup(label: string, icon: React.ReactNode, items: Project[]) {
    if (items.length === 0) return null
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 px-0.5">
          {icon}
          <span className="text-xs font-medium text-zinc-500">{label}</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[10px] font-mono text-zinc-700">{items.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isQueued={
                (project.status === "PROCESSING" || project.status === "PENDING") &&
                project.id !== activeProjectId
              }
              onDelete={handleDelete}
              onToggleVisibility={handleToggleVisibility}
              onRetry={handleRetry}
              queryClient={queryClient}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {renderGroup("Private", <Lock className="h-3 w-3 text-zinc-700" />, privateProjects)}
      {renderGroup("Public", <Globe className="h-3 w-3 text-zinc-700" />, publicProjects)}
    </div>
  )
}
