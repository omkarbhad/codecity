"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { TriangleAlertIcon, ChevronLeftIcon, SquareIcon, CheckIcon } from "@/components/ui/icons"
import { cancelProject, getProject } from "@/lib/tauri"
import { normalizeProjectRecord, type Project } from "@/lib/projects"
import { PageLoader } from "@/components/ui/loader"
import { LogoMark } from "@/components/logo"
import { AppIcon } from "@/components/ui/app-icon"

const POLL_MS = 1000
/** Consecutive backend errors tolerated before the page stops polling and shows an error. */
const MAX_POLL_FAILURES = 5

// Stages the Rust pipeline reports in progress_stage (src-tauri/src/analysis/pipeline), in order.
// "downloaded" means the download finished, so it counts as the start of the scan step.
const STAGES = [
  { keys: ["download"], label: "Download repository" },
  { keys: ["downloaded", "scan"], label: "Find source files" },
  { keys: ["parse"], label: "Parse files" },
  { keys: ["resolve"], label: "Resolve imports" },
  { keys: ["persist"], label: "Store results" },
  { keys: ["layout"], label: "Lay out city" },
  { keys: ["save"], label: "Save snapshot" },
]

export default function AnalyzePage() {
  return (
    <Suspense fallback={<PageLoader text="Preparing city..." />}>
      <AnalyzeContent />
    </Suspense>
  )
}

function repoLabel(project: Project | null) {
  const source = project?.repoUrl || project?.name || ""
  return source.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "") || "repository"
}

function AnalyzeContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id") ?? ""
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!id) {
      setError("No project id was given.")
      return
    }
    // setTimeout chain (not setInterval) so a slow backend call never overlaps the next poll.
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let failures = 0

    async function poll() {
      if (stopped) return
      try {
        const record = await getProject(id)
        if (stopped) return
        failures = 0
        if (!record) {
          setError("Project not found. It may have been deleted.")
          return
        }
        const next = normalizeProjectRecord(record as unknown as Record<string, unknown>)
        setProject(next)
        if (next.status === "COMPLETED") {
          router.replace(`/project?id=${encodeURIComponent(id)}`)
          return
        }
        if (next.status === "FAILED" || next.status === "CANCELLED") {
          setError(next.error || (next.status === "CANCELLED" ? "Analysis was cancelled." : "Analysis failed."))
          return
        }
      } catch (err) {
        if (stopped) return
        failures += 1
        if (failures >= MAX_POLL_FAILURES) {
          const detail = err instanceof Error && err.message ? ` (${err.message})` : ""
          setError(`Lost contact with the analysis backend${detail}. It may still be running. Check the dashboard.`)
          return
        }
      }
      timer = setTimeout(poll, POLL_MS)
    }

    poll()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [id, router])

  async function handleCancel() {
    setCancelling(true)
    try {
      await cancelProject(id)
    } finally {
      router.replace("/dashboard")
    }
  }

  const percent = Math.round(project?.progress ?? 0)
  const message = project?.progressMessage?.trim() || "Preparing city..."
  const stageIndex = STAGES.findIndex((s) => s.keys.includes(project?.progressStage ?? ""))
  const discovered = project?.filesDiscovered ?? 0
  const parsed = project?.filesParsed ?? 0

  return (
    <main className="flex min-h-screen items-center justify-center bg-(--bg) px-4">
      <section
        aria-labelledby="analyze-title"
        className="w-full max-w-md border border-(--border-light) bg-(--bg-card) rounded-md"
      >
        <header className="flex items-center gap-3 border-b border-(--border-pixel) px-5 py-4">
          <LogoMark className="size-9" />
          <div className="min-w-0">
            <h1 id="analyze-title" className="text-[13px] font-semibold text-(--cream)">
              {error ? "City not built" : "Building city"}
            </h1>
            <p className="mt-1 truncate text-[12px] text-(--cream-dark)">{repoLabel(project)}</p>
          </div>
        </header>

        {error ? (
          <div className="space-y-4 px-5 py-5">
            <p className="flex items-start gap-2 bg-[color-mix(in_srgb,var(--sev-high)_14%,transparent)] px-3 py-2.5 text-[12px] leading-[1.5] text-(--sev-high) rounded-full">
              <AppIcon icon={TriangleAlertIcon} className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </p>
            <Link
              href="/dashboard"
              className="flex h-9 items-center justify-center gap-2 bg-primary text-[12px] font-semibold text-primary-foreground active:translate-y-px rounded-full hover:brightness-105"
            >
              <AppIcon icon={ChevronLeftIcon} className="size-3.5" />
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p role="status" aria-live="polite" className="truncate text-[12px] text-(--cream-dark)">
                  {message}
                </p>
                <span className="text-[20px] font-semibold leading-none tabular-nums text-primary">{percent}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Analysis progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-2 w-full rounded-full bg-(--bg-raised)"
              >
                <div className="h-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
              </div>
              {discovered > 0 && (
                <p className="text-[12px] tabular-nums text-(--muted)">
                  {parsed.toLocaleString()} of {discovered.toLocaleString()} files parsed
                </p>
              )}
            </div>

            <ol className="space-y-1.5" aria-label="Pipeline stages">
              {STAGES.map((stage, i) => {
                const state = stageIndex < 0 ? "pending" : i < stageIndex ? "done" : i === stageIndex ? "current" : "pending"
                return (
                  <li key={stage.label} className="flex items-center gap-2.5 text-[12px]">
                    <span
                      aria-hidden="true"
                      className={`flex size-4 shrink-0 items-center justify-center border ${
                        state === "done"
                          ? "border-primary bg-primary text-primary-foreground"
                          : state === "current"
                            ? "border-primary"
                            : "border-(--border-light)"
                      }`}
                    >
                      {state === "done" && <AppIcon icon={CheckIcon} className="size-2.5" />}
                      {state === "current" && <span className="size-1.5 bg-primary motion-safe:animate-pulse" />}
                    </span>
                    <span className={state === "pending" ? "text-(--muted)" : "text-(--cream)"}>{stage.label}</span>
                    <span className="sr-only">{state === "done" ? "(done)" : state === "current" ? "(in progress)" : ""}</span>
                  </li>
                )
              })}
            </ol>

            <div className="flex gap-2 border-t border-(--border-pixel) pt-4">
              <Link
                href="/dashboard"
                className="flex h-9 flex-1 items-center justify-center gap-2 text-[12px] text-(--cream-dark) transition-colors hover:text-(--cream) active:translate-y-px bg-(--bg-card) hover:bg-(--bg-raised) rounded-full"
              >
                <AppIcon icon={ChevronLeftIcon} className="size-3.5" />
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling || !project}
                className="flex h-9 flex-1 items-center justify-center gap-2 text-[12px] text-(--cream-dark) transition-colors hover:text-(--sev-high) disabled:opacity-50 active:translate-y-px bg-(--bg-card) hover:bg-(--bg-raised) rounded-full"
              >
                <AppIcon icon={SquareIcon} className="size-3.5" />
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            </div>
            <p className="text-[12px] text-(--muted)">It keeps running if you leave this page.</p>
          </div>
        )}
      </section>
    </main>
  )
}
