"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { PlusIcon, CircleAlertIcon, TriangleAlertIcon, XIcon, Building2Icon, Trash2Icon, GithubIcon, LayoutGridIcon, ListIcon, LoaderCircleIcon, RefreshCwIcon, CircleStopIcon, SquareIcon, CheckIcon } from "@/components/ui/icons"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@codecity/ui/components/button"
import { MiniCityPreview } from "@/components/city/mini-city-preview"
import type { CitySnapshot } from "@/lib/types/city"
import { getProjectSnapshot, deleteProject as deleteProjectTauri, refreshAnalysis, getProject, cancelProject } from "@/lib/tauri"
import { AppIcon } from "@/components/ui/app-icon"
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

/** A small square button on a card: over the preview in the grid, at the row's end in the list. */
const cardAction =
  "flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-(--border-pixel) bg-(--bg) text-(--muted) transition-[color,background-color,transform] duration-150 hover:bg-(--bg-raised) hover:text-(--cream) active:translate-y-px disabled:pointer-events-none disabled:opacity-60"

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
        className="flex h-7 items-center gap-0.5 overflow-hidden rounded-[8px] border border-(--sev-high) bg-(--bg-card) pl-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="pr-1 text-[11px] font-medium leading-none text-(--cream)">Remove?</span>
        <button type="button" onClick={confirm} aria-label="Confirm remove" className="flex size-6 items-center justify-center rounded-[6px] text-(--sev-high) transition-colors hover:bg-[color-mix(in_srgb,var(--sev-high)_15%,transparent)]">
          <AppIcon icon={CheckIcon} className="size-3.5" />
        </button>
        <button type="button" onClick={cancel} aria-label="Cancel remove" className="flex size-6 items-center justify-center rounded-[6px] text-(--muted) transition-colors hover:text-(--cream)">
          <AppIcon icon={XIcon} className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={openConfirm} aria-label="Remove city" title="Remove city" className={`${cardAction} hover:text-(--sev-high)`}>
      <AppIcon icon={Trash2Icon} className="size-3.5" />
    </button>
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
  retrying,
  queryClient,
  view,
}: {
  project: Project
  isQueued: boolean
  onDelete: (id: string) => void
  onCancel: (id: string) => void
  onRetry: (project: Project) => void
  retrying: boolean
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
  // CANCELLED or any status the UI doesn't know yet — shown as a neutral "stopped" card.
  const isStopped = !isProcessing && !isCompleted && !isFailed
  const canRetry = isFailed || isStopped
  const isActive = isProcessing && !isQueued

  const { owner, repo, isExternal } = getProjectLabel(project)

  const retryButton = canRetry && (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); onRetry(project) }}
      disabled={retrying}
      className={`${cardAction} w-auto gap-1.5 px-2 text-[12px] font-medium text-(--cream-dark)`}
    >
      <AppIcon icon={retrying ? LoaderCircleIcon : RefreshCwIcon} className={`size-3.5 ${retrying ? "animate-spin" : ""}`} />
      {retrying ? "Queueing" : "Retry"}
    </button>
  )
  const stopButton = isProcessing && (
    <button type="button" onClick={(e) => { e.preventDefault(); onCancel(project.id) }} title="Stop analysis" aria-label="Stop analysis" className={cardAction}>
      <AppIcon icon={SquareIcon} className="size-3.5" />
    </button>
  )
  const githubLink = isExternal && project.repoUrl && (
    <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="Open on GitHub" aria-label="Open repository on GitHub" className={cardAction}>
      <AppIcon icon={GithubIcon} className="size-3.5" />
    </a>
  )
  const href = `/project?id=${encodeURIComponent(project.id)}`
  const statusWord = isActive ? "Building" : isQueued ? "Queued" : isFailed ? "Failed" : isStopped ? "Stopped" : null

  const progress = useProjectProgress(project.id, isActive)

  useEffect(() => {
    if (progress?.stage === "complete" || progress?.stage === "error") {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
    }
  }, [progress?.stage, queryClient])

  const currentProgress = isActive && progress ? Math.round(progress.progress) : 0
  const currentMessage = isActive && progress
    ? progress.message
    : isQueued
      ? "Queued — waiting for active job to finish"
      : null

  if (view === "list") {
    return (
      <div className={`group/row relative grid min-h-12 grid-cols-[minmax(0,1.6fr)_88px_72px_72px_88px_auto] items-center gap-3 border-b border-(--border-pixel) px-3.5 py-2 transition-colors last:border-b-0 hover:bg-(--bg-card) ${isQueued ? "opacity-70" : ""}`}>
        {isCompleted && <Link href={href} aria-label={`Open ${repo}`} className="absolute inset-0 rounded-[inherit]" />}
        <div className="min-w-0 truncate text-[13.5px]">
          <span className="text-(--muted)">{owner}/</span>
          <span className="font-medium text-(--cream)">{repo}</span>
        </div>
        <span className={`text-[12px] ${isFailed ? "text-(--sev-high)" : isActive ? "text-primary" : "text-(--muted)"}`}>
          {isActive ? `${currentProgress}%` : statusWord ?? "Ready"}
        </span>
        <span className="text-[12px] tabular-nums text-(--cream-dark)">{isCompleted ? formatNumber(project.fileCount ?? 0) : "—"}</span>
        <span className="text-[12px] tabular-nums text-(--cream-dark)">{isCompleted ? formatNumber(project.lineCount ?? 0) : "—"}</span>
        <span className="text-[12px] text-(--muted)">{timeAgo(project.createdAt)}</span>
        <div className="relative z-10 flex min-w-[76px] justify-end gap-1.5">
          {retryButton}
          {stopButton}
          {githubLink}
          <DeleteButton projectId={project.id} onDelete={onDelete} />
        </div>
      </div>
    )
  }

  // Grid card: the picture of the city, its name, one line of facts. A finished
  // city opens when the card is clicked; the other actions show on hover.
  return (
    <div className={`group/card relative flex flex-col gap-2.5 ${isQueued ? "opacity-70" : ""}`}>
      {isCompleted && <Link href={href} aria-label={`Open ${repo}`} className="absolute inset-0 z-10 rounded-[16px]" />}

      <div
        className={`relative aspect-[16/10] w-full overflow-hidden rounded-[16px] border bg-(--bg-deep) transition-[border-color,box-shadow] duration-200 ${
          isFailed
            ? "border-[color-mix(in_srgb,var(--sev-high)_40%,transparent)]"
            : isActive
              ? "border-[color-mix(in_srgb,var(--lime)_45%,transparent)]"
              : "border-(--border-pixel) group-hover/card:border-(--border-light) group-hover/card:shadow-(--shadow-lg)"
        }`}
      >
        {isCompleted && snapshot && (
          <div className="pointer-events-none absolute inset-0">
            <MiniCityPreview snapshot={snapshot} speed={0.4} className="h-full w-full transition-transform duration-500 ease-out group-hover/card:scale-[1.03]" />
          </div>
        )}
        {isCompleted && !snapshot && (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-(--muted)">
            {snapshotLoading ? <AppIcon icon={LoaderCircleIcon} className="size-4 animate-spin" /> : "No preview"}
          </div>
        )}

        {isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
            <span className="text-[30px] font-semibold leading-none tabular-nums text-(--cream)">{currentProgress}%</span>
            <div role="progressbar" aria-label="Analysis progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentProgress} className="h-1 w-full max-w-[180px] overflow-hidden rounded-full bg-(--bg-raised)">
              <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${currentProgress}%` }} />
            </div>
          </div>
        )}
        {isQueued && <div className="absolute inset-0 flex items-center justify-center text-[12px] text-(--muted)">Waiting for the city being built</div>}
        {isFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <AppIcon icon={CircleAlertIcon} className="size-5 text-(--sev-high)" />
            <p className="line-clamp-3 text-[12px] leading-snug text-(--cream-dark)">{project.error || "The analysis failed."}</p>
          </div>
        )}
        {isStopped && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[12px] text-(--muted)">
            <AppIcon icon={CircleStopIcon} className="size-5" />
            Analysis stopped
          </div>
        )}

        {/* Actions: always there for a city that needs one, on hover for a finished city */}
        <div className={`absolute right-2 top-2 z-20 flex items-center gap-1.5 transition-opacity duration-150 ${isCompleted ? "opacity-0 focus-within:opacity-100 group-hover/card:opacity-100" : ""}`}>
          {retryButton}
          {stopButton}
          {githubLink}
          <DeleteButton projectId={project.id} onDelete={onDelete} />
        </div>
      </div>

      <div className="min-w-0 px-1">
        <h3 className="truncate text-[14px] leading-tight tracking-[-0.01em]">
          <span className="text-(--muted)">{owner}/</span>
          <span className="font-medium text-(--cream)">{repo}</span>
        </h3>
        <p className="mt-1 truncate text-[12px] tabular-nums text-(--muted)">
          {isCompleted && <>{formatNumber(project.fileCount ?? 0)} files · {formatNumber(project.lineCount ?? 0)} lines · </>}
          {isActive && <>{currentMessage ?? "Building"}{(project.filesDiscovered ?? 0) > 0 && ` · ${formatNumber(project.filesParsed ?? 0)} of ${formatNumber(project.filesDiscovered ?? 0)} files`} · </>}
          {!isCompleted && !isActive && statusWord && <span className={isFailed ? "text-(--sev-high)" : undefined}>{statusWord} · </span>}
          {timeAgo(project.createdAt)}
        </p>
      </div>
    </div>
  )
}

export function MyProjectsTab({ onCreateCity }: { onCreateCity?: () => void }) {
  const queryClient = useQueryClient()
  const [view, setView] = useState<"grid" | "list">("grid")

  const { data: projects = [], isLoading, isError, refetch } = useQuery<Project[]>({
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

  const [actionError, setActionError] = useState<string | null>(null)
  const [retryingIds, setRetryingIds] = useState<Set<string>>(() => new Set())

  function errorText(err: unknown, fallback: string) {
    return err instanceof Error && err.message ? err.message : fallback
  }

  async function handleDelete(id: string) {
    setActionError(null)
    try {
      await deleteProjectTauri(id)
      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old ? old.filter((p) => p.id !== id) : []
      )
      queryClient.removeQueries({ queryKey: ["project-snapshot", id] })
    } catch (err) {
      setActionError(`Could not remove city: ${errorText(err, "unknown error")}`)
    }
  }

  async function handleCancel(id: string) {
    setActionError(null)
    try {
      await cancelProject(id)
      // The backend keeps the project as CANCELLED — refetch so the card shows "stopped".
      await queryClient.invalidateQueries({ queryKey: ["projects"] })
    } catch (err) {
      setActionError(`Could not stop analysis: ${errorText(err, "unknown error")}`)
    }
  }

  async function handleRetry(project: Project) {
    setActionError(null)
    setRetryingIds((prev) => new Set(prev).add(project.id))
    try {
      await refreshAnalysis(project.id)
      queryClient.removeQueries({ queryKey: ["project-snapshot", project.id] })
      await queryClient.invalidateQueries({ queryKey: ["projects"] })
    } catch (err) {
      setActionError(`Could not retry ${project.name}: ${errorText(err, "unknown error")}`)
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev)
        next.delete(project.id)
        return next
      })
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-x-5 gap-y-7">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <div className="aspect-[16/10] animate-pulse rounded-[16px] bg-(--bg-card)" />
            <div className="h-3.5 w-36 animate-pulse rounded-full bg-(--bg-card)" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-(--bg-card)" />
          </div>
        ))}
      </div>
    )
  }

  // A failed load must not look like an empty library
  if (isError && projects.length === 0) {
    return (
      <EmptyState
        tone="danger"
        icon={<AppIcon icon={TriangleAlertIcon} />}
        title="Couldn't load your cities"
        description="The project list didn't load. Your cities are still saved; try again."
        action={
          <Button onClick={() => refetch()} size="sm" variant="outline" className="h-9 gap-2 px-4 text-[12px] font-medium rounded-full">
            <AppIcon icon={RefreshCwIcon} className="size-3.5" />
            Try again
          </Button>
        }
      />
    )
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<AppIcon icon={Building2Icon} />}
        title="No cities yet"
        description="Analyze a GitHub repo to generate an interactive 3D city from its codebase."
        action={
          <Button
            onClick={() => onCreateCity?.()}
            size="sm"
            className="h-9 gap-2 bg-primary px-4 text-[12px] font-medium leading-none text-primary-foreground active:translate-y-px rounded-full hover:brightness-105"
          >
            <AppIcon icon={PlusIcon} className="size-3.5" />
            New city
          </Button>
        }
      />
    )
  }

  const settledProjects = projects.filter((p) => p.status !== "PROCESSING" && p.status !== "PENDING")
  const completedProjects = projects.filter((p) => p.status === "COMPLETED")
  const totalLines = completedProjects.reduce((sum, p) => sum + (p.lineCount ?? 0), 0)
  // Cities being built come first, then the rest, in one grid
  const ordered = [...processingProjects, ...settledProjects]

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
        retrying={retryingIds.has(project.id)}
        queryClient={queryClient}
        view={view}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* How many, how much code, then the view switch and the way to add one */}
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[13px] text-(--muted)">
          {projects.length === 1 ? "1 city" : `${projects.length} cities`}
          {totalLines > 0 && ` · ${formatNumber(totalLines)} lines of code`}
          {processingProjects.length > 0 && <span className="text-primary"> · {processingProjects.length} building</span>}
        </p>
        <div className="cc-seg" role="group" aria-label="Layout">
          <button type="button" onClick={() => setView("grid")} className="cc-seg-btn h-7 px-2.5" title="Grid view" aria-label="Grid view" aria-pressed={view === "grid"}>
            <AppIcon icon={LayoutGridIcon} active={view === "grid"} />
          </button>
          <button type="button" onClick={() => setView("list")} className="cc-seg-btn h-7 px-2.5" title="List view" aria-label="List view" aria-pressed={view === "list"}>
            <AppIcon icon={ListIcon} active={view === "list"} />
          </button>
        </div>
        <Button onClick={() => onCreateCity?.()} size="sm" className="h-8 gap-1.5 px-3.5 text-[13px]">
          <AppIcon icon={PlusIcon} className="size-3.5" />
          New city
        </Button>
      </div>

      {actionError && (
        <div role="alert" className="flex items-start gap-2 rounded-[12px] bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] px-3 py-2.5 text-[12.5px] leading-[1.4] text-(--sev-high)">
          <AppIcon icon={CircleAlertIcon} className="mt-px size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{actionError}</span>
          <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss error" title="Dismiss" className="flex size-5 shrink-0 items-center justify-center rounded-[5px] transition-colors hover:bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)]">
            <AppIcon icon={XIcon} className="size-3.5" />
          </button>
        </div>
      )}

      {view === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-x-5 gap-y-7">
          {ordered.map(renderProject)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-(--border-pixel) scroll-thin">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[minmax(0,1.6fr)_88px_72px_72px_88px_auto] gap-3 border-b border-(--border-pixel) px-3.5 py-2.5 text-[11.5px] font-medium leading-none text-(--muted)">
              <span>City</span>
              <span>Status</span>
              <span>Files</span>
              <span>Lines</span>
              <span>Added</span>
              <span className="min-w-[76px]" />
            </div>
            {ordered.map(renderProject)}
          </div>
        </div>
      )}
    </div>
  )
}
