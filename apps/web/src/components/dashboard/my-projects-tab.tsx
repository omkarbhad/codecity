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
        const res = await fetch(`/api/analyze/${projectId}/progress-poll`)
        if (res.ok) {
          const data = await res.json()
          setProgress(data)
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
        className="flex items-center gap-0.5 rounded-md overflow-hidden border border-red-500/30 bg-red-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-medium text-red-400 px-2 py-1 leading-none">Delete?</span>
        <button
          onClick={confirm}
          className="flex items-center justify-center px-1.5 py-1 text-red-400 hover:bg-red-500/20 transition-colors"
          title="Confirm delete"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={cancel}
          className="flex items-center justify-center px-1.5 py-1 text-zinc-500 hover:bg-white/[0.06] transition-colors"
          title="Cancel"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={openConfirm}
      className="p-1.5 rounded-md text-zinc-700 hover:text-red-400 hover:bg-red-500/[0.08] transition-all opacity-0 group-hover:opacity-100"
      title="Delete"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  )
}

/** Fetch snapshot on first hover and cache it in component state */
function useSnapshotOnHover(projectId: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<CitySnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (!enabled || fetched.current) return
    fetched.current = true
    setLoading(true)
    fetch(`/api/projects/${projectId}/snapshot`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setSnapshot(data as CitySnapshot) })
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
  const { snapshot, loading: snapshotLoading } = useSnapshotOnHover(
    project.id,
    project.status === "COMPLETED" && hovered
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

  const repoPath = project.repoUrl.replace("https://github.com/", "")
  const [owner, repo] = repoPath.split("/")

  const currentProgress = isActive && progress ? progress.progress : 0
  const currentMessage = isActive && progress
    ? progress.message
    : isQueued
      ? "Queued — waiting for active job to finish"
      : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex flex-col rounded-2xl border bg-[#09090e] transition-all duration-200 overflow-hidden
        ${isCompleted ? "border-white/[0.07] hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]" : ""}
        ${isActive ? "border-primary/25 shadow-[0_0_0_1px_rgba(255,61,61,0.06),0_0_24px_rgba(255,61,61,0.06)]" : ""}
        ${isQueued ? "border-white/[0.04] opacity-60" : ""}
        ${isFailed ? "border-red-500/15" : ""}
      `}
    >
      {/* Active — scanning line */}
      {isActive && (
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_ease-in-out_infinite]" />
        </div>
      )}

      {/* Progress fill background */}
      {isActive && currentProgress > 0 && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-1000 ease-out"
          style={{
            background: `linear-gradient(90deg, rgba(255,61,61,0.05) 0%, transparent ${currentProgress}%)`,
          }}
        />
      )}

      {/* Hover shimmer for completed cards */}
      {isCompleted && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
          style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.025), transparent 70%)" }}
        />
      )}

      {/* 3D city preview pane — lazy-loaded on hover */}
      {isCompleted && (
        <div className="relative h-0 overflow-hidden transition-all duration-500 ease-out group-hover:h-[120px]">
          {/* shimmer while loading */}
          {snapshotLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#06060b] overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-[shimmer-slide_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
              <span className="text-[10px] font-mono text-zinc-700 relative z-10">loading city…</span>
            </div>
          )}
          {snapshot && (
            <div className="absolute inset-0 pointer-events-none">
              <MiniCityPreview snapshot={snapshot} speed={0.4} className="w-full h-full" />
              {/* bottom fade to card body */}
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#09090e] to-transparent pointer-events-none" />
            </div>
          )}
          {/* top border separator */}
          <div className="absolute inset-x-0 top-0 h-px bg-white/[0.05]" />
        </div>
      )}

      <div className="relative p-4 flex flex-col gap-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              {project.visibility === "PRIVATE" ? (
                <Lock className="h-3 w-3 text-zinc-700 shrink-0" />
              ) : (
                <Globe className="h-3 w-3 text-zinc-700 shrink-0" />
              )}
              <span className="text-[11px] text-zinc-600 font-mono truncate">{owner}/</span>
            </div>
            <h3 className="text-[15px] font-semibold text-zinc-100 truncate leading-tight">
              {repo}
            </h3>
          </div>

          {/* Status pill */}
          {isCompleted && (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/[0.08] text-emerald-400 border border-emerald-500/20">
              <span className="h-1 w-1 rounded-full bg-emerald-400" />
              done
            </span>
          )}
          {isActive && (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-primary/[0.08] text-primary border border-primary/20">
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              analyzing
            </span>
          )}
          {isQueued && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-zinc-800/60 text-zinc-600 border border-zinc-700/60">
              queued
            </span>
          )}
          {isFailed && (
            <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-red-500/[0.08] text-red-400 border border-red-500/20">
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
            <div className="h-[2px] w-full rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-700 ease-out"
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
          <p className="text-[10px] text-red-400/70 font-mono line-clamp-2 bg-red-500/[0.04] border border-red-500/10 rounded-lg px-2.5 py-2">
            {project.error}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-700">{timeAgo(project.createdAt)}</span>
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
          </div>

          <div className="flex items-center gap-1">
            {/* Retry */}
            {isFailed && (
              <button
                onClick={(e) => { e.preventDefault(); onRetry(project) }}
                className="flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-md text-amber-400 bg-amber-500/[0.08] hover:bg-amber-500/15 transition-colors border border-amber-500/15"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                Retry
              </button>
            )}

            {/* Open */}
            {isCompleted && (
              <Link
                href={`/project/${project.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1 rounded-md text-white bg-primary hover:bg-primary/85 transition-colors shadow-[0_0_12px_rgba(255,61,61,0.2)]"
              >
                Open
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            )}

            {/* Visibility toggle */}
            <button
              onClick={(e) => onToggleVisibility(e, project)}
              className="p-1.5 rounded-md text-zinc-700 hover:text-zinc-400 hover:bg-white/[0.04] transition-all opacity-0 group-hover:opacity-100"
              title={project.visibility === "PUBLIC" ? "Make private" : "Make public"}
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
      const res = await fetch("/api/projects")
      if (!res.ok) return []
      return res.json()
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
      await fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {})
      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old ? old.filter((p) => p.id !== id) : []
      )
    } catch {
      // ignore
    }
  }

  async function handleToggleVisibility(e: React.MouseEvent, project: Project) {
    e.preventDefault()
    e.stopPropagation()
    const newVisibility = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: newVisibility }),
      })
      if (!res.ok) return
      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old ? old.map((p) => p.id === project.id ? { ...p, visibility: newVisibility } : p) : []
      )
    } catch {
      // ignore
    }
  }

  async function handleRetry(project: Project) {
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: project.repoUrl, visibility: project.visibility, forceRetry: true }),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["projects"] })
      }
    } catch {
      // ignore
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-[#09090e] border border-white/[0.05] p-4 h-36">
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
      <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] border-dashed bg-white/[0.01] min-h-[280px]">
        <div className="flex flex-col items-center text-center py-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/[0.08] border border-primary/15 mb-5">
            <Building2 className="h-6 w-6 text-primary/70" />
          </div>
          <p className="text-sm font-semibold text-zinc-300">No cities yet</p>
          <p className="text-xs text-zinc-600 mt-1.5 max-w-xs leading-relaxed">
            Analyze a GitHub repo to generate an interactive 3D city from its codebase.
          </p>
          <Button
            onClick={() => onCreateCity?.()}
            size="sm"
            className="mt-5 gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs h-8 px-4 rounded-lg shadow-[0_0_20px_rgba(255,61,61,0.25)]"
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
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-medium text-zinc-700 uppercase tracking-widest">{label}</span>
          <div className="h-px flex-1 bg-white/[0.04]" />
          <span className="text-[10px] font-mono text-zinc-700">{items.length}</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="space-y-8">
      {renderGroup("Private", <Lock className="h-3 w-3 text-zinc-700" />, privateProjects)}
      {renderGroup("Public", <Globe className="h-3 w-3 text-zinc-700" />, publicProjects)}
    </div>
  )
}
