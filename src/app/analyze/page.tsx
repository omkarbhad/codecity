"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, Check, Square } from "lucide-react"
import { cancelProject, getProject } from "@/lib/tauri"
import { normalizeProjectRecord, type Project } from "@/lib/projects"
import { PageLoader } from "@/components/ui/loader"
import { LogoMark } from "@/components/logo"

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
    const interval = setInterval(async () => {
      try {
        const record = await getProject(id)
        if (!record) {
          setError("Project not found. It may have been deleted.")
          clearInterval(interval)
          return
        }
        const next = normalizeProjectRecord(record as unknown as Record<string, unknown>)
        setProject(next)
        if (next.status === "COMPLETED") {
          clearInterval(interval)
          router.replace(`/project?id=${encodeURIComponent(id)}`)
        } else if (next.status === "FAILED" || next.status === "CANCELLED") {
          setError(next.error || (next.status === "CANCELLED" ? "Analysis was cancelled." : "Analysis failed."))
          clearInterval(interval)
        }
      } catch {
        // Backend busy — keep polling.
      }
    }, 1000)
    return () => clearInterval(interval)
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
        className="pixel-shadow w-full max-w-md border-2 border-(--border-light) bg-(--bg-card)"
      >
        <header className="flex items-center gap-3 border-b-2 border-(--border-pixel) px-5 py-4">
          <LogoMark className="size-9" />
          <div className="min-w-0">
            <h1 id="analyze-title" className="font-mono text-[13px] font-semibold uppercase tracking-[0.06em] text-(--cream)">
              {error ? "City not built" : "Building city"}
            </h1>
            <p className="mt-1 truncate font-mono text-[12px] text-(--cream-dark)">{repoLabel(project)}</p>
          </div>
        </header>

        {error ? (
          <div className="space-y-4 px-5 py-5">
            <p className="flex items-start gap-2 border-2 border-(--sev-high) bg-[color-mix(in_srgb,var(--sev-high)_8%,transparent)] px-3 py-2.5 font-mono text-[12px] leading-[1.5] text-(--sev-high)">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
            <Link
              href="/dashboard"
              className="pixel-shadow-accent btn-press flex h-9 items-center justify-center gap-2 border-2 border-(--bg) bg-primary font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-primary-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-5 px-5 py-5">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p role="status" aria-live="polite" className="truncate font-mono text-[12px] text-(--cream-dark)">
                  {message}
                </p>
                <span className="font-mono text-[20px] font-bold leading-none tabular-nums text-primary">{percent}%</span>
              </div>
              <div
                role="progressbar"
                aria-label="Analysis progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-2 w-full border border-(--border-pixel) bg-(--bg-deep)"
              >
                <div className="h-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
              </div>
              {discovered > 0 && (
                <p className="font-mono text-[11px] tabular-nums text-(--muted)">
                  {parsed.toLocaleString()} of {discovered.toLocaleString()} files parsed
                </p>
              )}
            </div>

            <ol className="space-y-1.5" aria-label="Pipeline stages">
              {STAGES.map((stage, i) => {
                const state = stageIndex < 0 ? "pending" : i < stageIndex ? "done" : i === stageIndex ? "current" : "pending"
                return (
                  <li key={stage.label} className="flex items-center gap-2.5 font-mono text-[12px]">
                    <span
                      aria-hidden="true"
                      className={`flex size-4 shrink-0 items-center justify-center border-2 ${
                        state === "done"
                          ? "border-primary bg-primary text-primary-foreground"
                          : state === "current"
                            ? "border-primary"
                            : "border-(--border-light)"
                      }`}
                    >
                      {state === "done" && <Check className="size-2.5" strokeWidth={3} />}
                      {state === "current" && <span className="size-1.5 bg-primary motion-safe:animate-pulse" />}
                    </span>
                    <span className={state === "pending" ? "text-(--muted)" : "text-(--cream)"}>{stage.label}</span>
                    <span className="sr-only">{state === "done" ? "(done)" : state === "current" ? "(in progress)" : ""}</span>
                  </li>
                )
              })}
            </ol>

            <div className="flex gap-2 border-t-2 border-dashed border-(--border-pixel) pt-4">
              <Link
                href="/dashboard"
                className="pixel-shadow-sm btn-press flex h-9 flex-1 items-center justify-center gap-2 border-2 border-(--border-pixel) bg-(--bg-raised) font-mono text-[11px] uppercase tracking-[0.05em] text-(--cream-dark) transition-colors hover:border-(--border-light) hover:text-(--cream)"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling || !project}
                className="pixel-shadow-sm btn-press flex h-9 flex-1 items-center justify-center gap-2 border-2 border-(--border-pixel) bg-(--bg-raised) font-mono text-[11px] uppercase tracking-[0.05em] text-(--cream-dark) transition-colors hover:border-(--sev-high) hover:text-(--sev-high) disabled:opacity-50"
              >
                <Square className="size-3" aria-hidden="true" />
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            </div>
            <p className="font-mono text-[11px] text-(--muted)">It keeps running if you leave this page.</p>
          </div>
        )}
      </section>
    </main>
  )
}
